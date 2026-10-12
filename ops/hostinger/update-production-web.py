"""Deploy an exact, verified public Git commit; preserve the previous web release.

No database, mail, media or account mutation. Build before replacing the web
directory, retain old hashed assets for open clients, and roll back failed starts.
"""
from pathlib import Path
import argparse, datetime, hashlib, io, json, os, re, shutil, socket, subprocess, tarfile, time, urllib.request

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--archive-sha256', required=True)
    args = parser.parse_args()
    assert re.fullmatch('[0-9a-f]{40}', args.revision)
    assert re.fullmatch('[0-9a-f]{64}', args.archive_sha256)
    root = Path('/opt/kws/web-production')
    old = root / 'source'
    assert old.is_dir() and not old.is_symlink() and (old / 'dist/index.html').is_file()
    assert (root / 'docker-compose.yml').is_file()
    stage = root / 'releases' / args.revision
    stage.mkdir(mode=0o700, parents=True, exist_ok=False)
    source = stage / 'source'; source.mkdir(mode=0o700)
    url = 'https://github.com/moonsightmedia/KWS-BETA-APP/archive/' + args.revision + '.tar.gz'
    with urllib.request.urlopen(url, timeout=120) as response: archive = response.read()
    assert hashlib.sha256(archive).hexdigest() == args.archive_sha256, 'Source archive differs'
    prefix = 'KWS-BETA-APP-' + args.revision
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        for member in tar:
            parts = Path(member.name).parts
            assert parts and parts[0] == prefix and '..' not in parts and not Path(member.name).is_absolute()
            assert member.isdir() or member.isfile(), 'Links or special files in source'
            if len(parts) == 1: continue
            destination = source.joinpath(*parts[1:])
            assert destination.resolve().is_relative_to(source.resolve())
            if member.isdir(): destination.mkdir(mode=0o700, parents=True, exist_ok=True)
            else:
                destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                with tar.extractfile(member) as content, destination.open('xb') as output: shutil.copyfileobj(content, output)
                destination.chmod(0o700 if member.mode & 0o111 else 0o600)
    del archive
    runtime = dict(line.split('=', 1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    values = {'VITE_SUPABASE_URL':'https://beta-api.kletterwelt-sauerland.de','VITE_SUPABASE_PUBLISHABLE_KEY':runtime['ANON_KEY'],
        'VITE_VIDEO_API_URL':'https://video.kletterwelt-sauerland.de','VITE_NATIVE_VIDEO_API_URL':'https://video.kletterwelt-sauerland.de',
        'VITE_ALLINKL_API_URL':'https://video.kletterwelt-sauerland.de','VITE_USE_ALLINKL_STORAGE':'false',
        'VITE_AUTH_SITE_URL':'https://beta.kletterwelt-sauerland.de','VITE_TELEMETRY_ENABLED':'false','VITE_SENTRY_DSN':''}
    (source / '.env.hostinger.local').write_text('\n'.join(key+'='+value for key,value in values.items())+'\n')
    log_path = stage / 'build.log'
    with log_path.open('ab') as log:
        subprocess.run(['docker','run','--rm','--memory=2g','--cpus=2','-v',str(source)+':/app','-w','/app','node:22-alpine','sh','-c',
            'npm ci --legacy-peer-deps --no-audit --no-fund && ./node_modules/.bin/vite build --mode hostinger'], stdout=log, stderr=log, check=True)
    dist = source / 'dist'; html = (dist / 'index.html').read_text()
    assert '/assets/' in html
    texts = []
    for path in dist.rglob('*'):
        if not path.is_file(): continue
        content = path.read_bytes()
        for name in ('SERVICE_ROLE_KEY','POSTGRES_PASSWORD'): assert runtime[name].encode() not in content
        assert b'-----BEGIN PRIVATE KEY-----' not in content
        if path.suffix in ('.js','.html'): texts.append(content.decode())
    bundle = '\n'.join(texts)
    for marker in ('https://beta-api.kletterwelt-sauerland.de','Eigene Konten sind derzeit ab','Löschung beantragen','Kontolöschungen','kws_request_account_deletion','kws_report_content','kws_open_content_reports','Datenschutz der App','Community-Regeln'):
        assert marker in bundle, 'Required account feature absent'
    # Open tabs may still request lazy chunks from the previous entry file.
    for path in (old / 'dist/assets').rglob('*'):
        if path.is_file():
            destination = dist / 'assets' / path.relative_to(old / 'dist/assets')
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(path, destination)
    for path in dist.rglob('*'): path.chmod(0o644 if path.is_file() else 0o755)
    dist.chmod(0o755)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    previous = root / ('previous-source-' + stamp)
    assert not previous.exists()
    metadata = {name:(root / name).read_bytes() for name in ('SOURCE.json','BUILD-VERIFIED.json')}
    with log_path.open('ab') as log:
        def start(): subprocess.run(['docker','compose','-f',str(root / 'docker-compose.yml'),'up','-d','--force-recreate','web'], stdout=log, stderr=log, check=True)
        old.rename(previous); source.rename(old)
        try:
            start()
            for attempt in range(10):
                try:
                    with urllib.request.urlopen('http://127.0.0.1:9091/', timeout=5) as response: assert response.status == 200
                    break
                except (OSError, AssertionError):
                    if attempt == 9: raise
                    time.sleep(2)
            for route in ('/','/auth','/reset-password','/auth/callback','/privacy','/imprint','/community-rules'):
                with urllib.request.urlopen('http://127.0.0.1:9091'+route, timeout=30) as response:
                    assert response.status == 200 and response.read().decode() == html
        except Exception:
            old.rename(stage / 'failed-source'); previous.rename(old); start()
            for name, content in metadata.items(): (root / name).write_bytes(content)
            raise
    # Install reviewed operator and backup updates without executing erasure.
    for origin,target in [('ops/hostinger/account-deletion.py','/opt/kws/release-readiness/account-deletion.py'),('ops/hostinger/backup-production.py','/opt/kws/tools/backup-production.py')]:
        destination = Path(target)
        shutil.copyfile(destination, stage / (destination.name + '.previous'))
        shutil.copyfile(old / origin, destination); destination.chmod(0o700)
    report = {'revision':args.revision,'archive_sha256':args.archive_sha256,'deployed_at':stamp,'public_api_configured':True,'base':'/',
        'secret_in_bundle':False,'minimum_account_age':16,'account_deletion_request':True,'deadline_days':7,
        'previous_source':str(previous),'media_unchanged':True,'database_unchanged':True,'backup_operator_updated':True}
    (root / 'SOURCE.json').write_text(json.dumps({'revision':args.revision})+'\n')
    (root / 'BUILD-VERIFIED.json').write_text(json.dumps(report)+'\n')
    (stage / 'DEPLOYED.json').write_text(json.dumps(report)+'\n')
    age_proof = Path('/opt/kws/release-readiness/ACCOUNT-AGE-VERIFIED.json')
    age = json.loads(age_proof.read_text()); age['web_release_pending'] = False; age['web_revision'] = args.revision
    age_proof.write_text(json.dumps(age)+'\n')
    print(json.dumps(report))

if __name__ == '__main__':
    try: main()
    except Exception as error:
        print('WEB_RELEASE_STOPPED: ' + type(error).__name__ + '; inspect protected release diagnostics')
        raise SystemExit(1)
