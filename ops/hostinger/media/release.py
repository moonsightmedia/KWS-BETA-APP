"""Guarded video-service release on srv2044594. Never changes SSH or networking."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import time
import urllib.request

ROOT = Path('/opt/kws/video-production')
CONTAINER = 'kws-video-production'
RAW = 'https://raw.githubusercontent.com/moonsightmedia/KWS-BETA-APP/'


def output(args):
    return subprocess.check_output(args).decode().strip()


def health():
    with urllib.request.urlopen('http://127.0.0.1:9085/health', timeout=10) as response:
        return json.load(response)


def idle():
    value = health()
    assert value['ok'] and value['queue'] == 0 and value['uploads']['multipart_active'] == 0, 'Active uploads; retry when idle'


def validate_container(container, expected_image):
    assert container['Image'] == expected_image, 'Live image changed'
    assert container['Config']['Labels']['com.docker.compose.project.working_dir'] == str(ROOT), 'Wrong Compose project'
    assert container['Config']['Labels']['com.docker.compose.service'] == 'video', 'Wrong Compose service'
    assert any(m['Source'] == str(ROOT / 'data') and m['Destination'] == '/data' and m['RW'] for m in container['Mounts']), 'Wrong data volume'


def replace_image(config, image):
    assert re.fullmatch(r'kws-video-production:sdr-[0-9a-f]{12}', image), 'Unexpected image tag'
    assert len(re.findall(r'^KWS_VIDEO_IMAGE=.*$', config, flags=re.M)) == 1, 'Missing or ambiguous image variable'
    return re.sub(r'^KWS_VIDEO_IMAGE=.*$', 'KWS_VIDEO_IMAGE=' + image, config, flags=re.M)


def safe_relative(relative):
    candidate = PurePosixPath(relative)
    assert not candidate.is_absolute() and '..' not in candidate.parts and '\\' not in relative, 'Unsafe source path'
    assert str(candidate) == relative and (relative.startswith(('src/', 'test/')) or relative in ('Dockerfile', 'package.json', 'package-lock.json')), 'Unexpected source file'
    return relative


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def atomic_write(target, data):
    temporary = target.with_name(target.name + '.sdr-partial')
    assert not temporary.is_symlink()
    with temporary.open('xb') as file:
        file.write(data); file.flush(); os.fsync(file.fileno())
    os.replace(temporary, target)


def source_hashes(names):
    return {name: output(['docker', 'exec', CONTAINER, 'sha256sum', '/app/' + safe_relative(name)]).split()[0] for name in names}


def main():
    import fcntl
    parser = argparse.ArgumentParser()
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--revision')
    parser.add_argument('--manifest-sha256')
    parser.add_argument('--expected-image')
    args = parser.parse_args()
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594', 'Wrong host or operator'
    assert ROOT.is_dir() and not ROOT.is_symlink()
    os.umask(0o077)
    container = json.loads(output(['docker', 'inspect', CONTAINER]))[0]
    if args.inspect:
        names = ['src/server.js', 'src/transcode.js', 'src/auth.js', 'src/config.js', 'src/file-merge.js', 'src/path-safety.js', 'src/supabase-publisher.js']
        print(json.dumps({'image': container['Image'], 'source_sha256': source_hashes(names), 'health': health()}, indent=2))
        return
    assert re.fullmatch('[0-9a-f]{40}', args.revision or '')
    assert re.fullmatch('[0-9a-f]{64}', args.manifest_sha256 or '')
    assert re.fullmatch('sha256:[0-9a-f]{64}', args.expected_image or '')
    validate_container(container, args.expected_image)
    lock_path = ROOT / '.sdr-release.lock'
    assert not lock_path.is_symlink()
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        idle()
        base = RAW + args.revision + '/'
        manifest_bytes = fetch(base + 'ops/hostinger/media/release-manifest.json')
        assert hashlib.sha256(manifest_bytes).hexdigest() == args.manifest_sha256, 'Manifest hash mismatch'
        manifest = json.loads(manifest_bytes)
        assert source_hashes(manifest['previous_src_sha256']) == manifest['previous_src_sha256'], 'Live source differs from reviewed base; inspect before releasing'
        stage = ROOT / 'releases' / ('sdr-' + args.revision)
        stage.mkdir(parents=True, exist_ok=False, mode=0o700)
        assert stage.resolve().is_relative_to(ROOT.resolve()) and not stage.is_symlink()
        context = stage / 'source'; context.mkdir(mode=0o700)
        for relative, digest in manifest['candidate_sha256'].items():
            safe_relative(relative)
            data = fetch(base + 'hostinger-video-server/' + relative)
            assert hashlib.sha256(data).hexdigest() == digest, 'Candidate source checksum mismatch'
            target = context / relative; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
        previous = {}
        for name in ('.env', 'docker-compose.yml'):
            file = ROOT / name
            assert file.is_file() and not file.is_symlink()
            previous[name] = file.read_bytes(); shutil.copyfile(file, stage / ('previous' + name))
        rollback_tag = 'kws-video-production:before-sdr-' + args.revision[:12]
        assert subprocess.run(['docker', 'image', 'inspect', rollback_tag], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0, 'Rollback tag already exists'
        subprocess.run(['docker', 'tag', args.expected_image, rollback_tag], check=True)
        candidate = 'kws-video-production:sdr-' + args.revision[:12]
        with (stage / 'verification.log').open('wb') as log:
            subprocess.run(['docker', 'build', '-t', candidate, str(context)], check=True, stdout=log, stderr=log)
            subprocess.run(['docker', 'run', '--rm', '--network', 'none', '-v', str(context / 'test') + ':/app/test:ro', '--entrypoint', 'node', candidate, '--test'], check=True, stdout=log, stderr=log)
        # Database backup precedes the independent, explicit library migration.
        with (stage / 'database-before-sdr.dump').open('xb') as backup:
            subprocess.run(['docker', 'exec', 'supabase-db', 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc'], check=True, stdout=backup)
            backup.flush(); os.fsync(backup.fileno())
        assert (stage / 'database-before-sdr.dump').stat().st_size > 1000
        idle()
        validate_container(json.loads(output(['docker', 'inspect', CONTAINER]))[0], args.expected_image)
        for name, data in previous.items():
            assert (ROOT / name).read_bytes() == data, 'Concurrent configuration change'
        compose = ['docker', 'compose', '--env-file', str(ROOT / '.env'), '-f', str(ROOT / 'docker-compose.yml'), 'up', '-d', '--no-deps', '--force-recreate', 'video']
        try:
            atomic_write(ROOT / '.env', replace_image(previous['.env'].decode(), candidate).encode())
            subprocess.run(compose, check=True, cwd=ROOT)
            for attempt in range(30):
                try:
                    value = health()
                    if value.get('ok') and value.get('capabilities', {}).get('private_silent_originals') and value['capabilities'].get('sdr_playback'):
                        break
                except (OSError, ValueError):
                    pass
                time.sleep(2)
            else:
                raise RuntimeError('Candidate health failed')
            assert source_hashes(manifest['candidate_src_sha256']) == manifest['candidate_src_sha256'], 'Running source checksum mismatch'
        except BaseException:
            atomic_write(ROOT / '.env', previous['.env'])
            subprocess.run(compose, check=True, cwd=ROOT)
            raise
        proof = {'revision': args.revision, 'previous_image': args.expected_image, 'candidate_image': json.loads(output(['docker', 'inspect', CONTAINER]))[0]['Image'], 'health': health(), 'library_migrated': False}
        (stage / 'release-proof.json').write_text(json.dumps(proof, indent=2) + '\n')
        print(json.dumps(proof, indent=2))


if __name__ == '__main__':
    main()
