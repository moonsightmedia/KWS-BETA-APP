"""Add the volume flag and patch only the verified live transcoder, retaining rollback.

Run on the KWS production host after publishing the exact source revision.
Never rewrites existing media; production data mounts and all other server files stay intact.
"""
from pathlib import Path
import argparse, hashlib, json, os, re, shutil, socket, subprocess, time, urllib.request

ROOT = Path('/opt/kws/video-production')
OLD_TRANSCODER = 'f48330dce15ed61d69389965d71f731c3ee4d2c5b6d108a2e3ea2694f4317183'

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def output(args):
    return subprocess.check_output(args).decode().strip()

def sql(statement):
    return output(['docker', 'exec', 'supabase-db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-Atc', statement])

def health():
    with urllib.request.urlopen('http://127.0.0.1:9085/health', timeout=10) as response:
        return json.load(response)

def assert_idle():
    value = health()
    assert value['ok'] and value['queue'] == 0 and value['uploads']['multipart_active'] == 0, 'Active uploads; do not interrupt'

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--transcoder-sha256', required=True)
    parser.add_argument('--expected-web-revision', required=True)
    args = parser.parse_args()
    assert re.fullmatch('[0-9a-f]{40}', args.revision)
    assert re.fullmatch('[0-9a-f]{64}', args.transcoder_sha256)
    assert json.loads(Path('/opt/kws/web-production/SOURCE.json').read_text())['revision'] == args.expected_web_revision, 'Concurrent web release changed'
    assert ROOT.is_dir() and not ROOT.is_symlink()
    assert_idle()
    container = json.loads(output(['docker', 'inspect', 'kws-video-production']))[0]
    image = container['Image']
    assert re.fullmatch('sha256:[0-9a-f]{64}', image)
    assert container['Config']['Labels']['com.docker.compose.project.working_dir'] == str(ROOT)
    assert any(m['Source'] == str(ROOT / 'data') and m['Destination'] == '/data' for m in container['Mounts'])
    witness = output(['docker', 'exec', 'kws-video-production', 'sha256sum', '/app/src/transcode.js']).split()[0]
    assert witness == OLD_TRANSCODER, 'Live transcoder changed; review before patching'
    stage = ROOT / 'releases' / args.revision
    stage.mkdir(mode=0o700, parents=True, exist_ok=False)
    assert stage.resolve().is_relative_to(ROOT.resolve()) and not stage.is_symlink()
    for name in ('.env', 'docker-compose.yml'):
        assert (ROOT / name).is_file() and not (ROOT / name).is_symlink()
        shutil.copyfile(ROOT / name, stage / ('previous' + name))
    base = 'https://raw.githubusercontent.com/moonsightmedia/KWS-BETA-APP/' + args.revision + '/hostinger-video-server/'
    def fetch(relative):
        with urllib.request.urlopen(base + relative, timeout=60) as response: return response.read()
    transcoder = fetch('src/transcode.js')
    assert hashlib.sha256(transcoder).hexdigest() == args.transcoder_sha256
    (stage / 'transcode.js').write_bytes(transcoder)
    tests = stage / 'test'; tests.mkdir(mode=0o700)
    # The reviewed test uses only disposable OS temp paths, not /data.
    (tests / 'transcode.test.js').write_bytes(fetch('test/transcode.test.js'))
    (stage / 'Dockerfile').write_text('FROM ' + image + '\nCOPY transcode.js /app/src/transcode.js\n')
    tag = 'kws-video-production:silent-' + args.revision[:12]
    with (stage / 'build.log').open('wb') as log:
        run(['docker', 'build', '--pull=false', '-t', tag, str(stage)], stdout=log, stderr=log)
        run(['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'node', '-v', str(tests) + ':/app/test:ro', tag, '--test', '/app/test/transcode.test.js'], stdout=log, stderr=log)
    assert output(['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'sha256sum', tag, '/app/src/transcode.js']).split()[0] == args.transcoder_sha256
    before = sql("select count(*) || '|' || (select relrowsecurity::text from pg_class where oid='public.boulders'::regclass) from public.boulders")
    backup = stage / 'database-before-volume.dump'
    with backup.open('xb') as file:
        run(['docker', 'exec', 'supabase-db', 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc'], stdout=file)
        file.flush(); os.fsync(file.fileno())
    assert backup.stat().st_size > 1000, 'Empty database backup'
    sql("BEGIN; SET LOCAL lock_timeout='8s'; ALTER TABLE public.boulders ADD COLUMN IF NOT EXISTS volume_only boolean NOT NULL DEFAULT false; COMMENT ON COLUMN public.boulders.volume_only IS 'Boulder consists only of volumes; independent of hold colors.'; NOTIFY pgrst, 'reload schema'; COMMIT;")
    assert sql("select count(*) || '|' || (select relrowsecurity::text from pg_class where oid='public.boulders'::regclass) from public.boulders") == before, 'Unexpected row count or RLS change'
    assert sql("select data_type || '|' || is_nullable || '|' || column_default from information_schema.columns where table_schema='public' and table_name='boulders' and column_name='volume_only'") == 'boolean|NO|false'
    assert_idle()
    assert json.loads(Path('/opt/kws/web-production/SOURCE.json').read_text())['revision'] == args.expected_web_revision
    env_file = ROOT / '.env'
    previous_env = env_file.read_text()
    assert len(re.findall(r'^KWS_VIDEO_IMAGE=.*$', previous_env, flags=re.M)) == 1
    next_env = re.sub(r'^KWS_VIDEO_IMAGE=.*$', 'KWS_VIDEO_IMAGE=' + tag, previous_env, flags=re.M)
    compose = ['docker', 'compose', '-f', str(ROOT / 'docker-compose.yml'), '--env-file', str(env_file)]
    def start():
        with (stage / 'start.log').open('ab') as log:
            run(compose + ['up', '-d', '--no-deps', '--force-recreate', 'video'], stdout=log, stderr=log)
    def wait_healthy():
        for attempt in range(20):
            try:
                if health().get('ok'): return
            except (OSError, ValueError): pass
            time.sleep(1)
        raise RuntimeError('Video health failed')
    env_file.write_text(next_env)
    try:
        start(); wait_healthy()
        assert output(['docker', 'exec', 'kws-video-production', 'sha256sum', '/app/src/transcode.js']).split()[0] == args.transcoder_sha256
    except Exception:
        env_file.write_text(previous_env); start(); wait_healthy(); raise
    result = {'revision': args.revision, 'volume_column': True, 'previous_image': image, 'silent_transcoder_sha256': args.transcoder_sha256, 'existing_media_unchanged': True, 'database_backup_bytes': backup.stat().st_size, 'healthy': True}
    (stage / 'VERIFIED.json').write_text(json.dumps(result) + '\n')
    print(json.dumps(result))

if __name__ == '__main__': main()
