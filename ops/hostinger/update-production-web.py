"""Deploy an exact, verified public Git commit; preserve the previous web release.

No database, mail, media or account mutation. Build before replacing the web
directory, retain old hashed assets for open clients, and roll back failed starts.
"""
from pathlib import Path
import argparse, datetime, hashlib, http.client, io, json, os, re, shutil, socket, subprocess, tarfile, time, urllib.parse, urllib.request

def verified_landing(source, revision):
    directory = source / 'dist/landing'
    manifest = json.loads((directory / 'release.json').read_text())
    assert manifest['schema'] == 1 and manifest['revision'] == revision, 'Landing revision differs'
    assert manifest['canonical'] == 'https://beta.kletterwelt-sauerland.de/landingpage'
    assert re.fullmatch('[0-9a-f]{16}', manifest['release'])
    routes = (source / 'ops/hostinger/landingpage/routes.caddy').read_bytes()
    assert hashlib.sha256(routes).hexdigest() == manifest['routesSha256'], 'Landing routes differ'
    names = set()
    for file in manifest['files']:
        name = file['path']
        assert name.startswith('public/landing/') and '..' not in Path(name).parts
        relative = name.removeprefix('public/landing/')
        assert relative and not Path(relative).is_absolute() and relative not in names and relative != 'release.json'
        names.add(relative)
        path = directory / relative
        assert path.resolve().is_relative_to(directory.resolve()), 'Landing asset escapes release'
        assert path.is_file() and not path.is_symlink()
        data = path.read_bytes()
        assert len(data) == file['bytes'] and hashlib.sha256(data).hexdigest() == file['sha256'], 'Landing asset differs'
    actual = set()
    for path in directory.rglob('*'):
        assert not path.is_symlink(), 'Linked landing asset'
        if path.is_file(): actual.add(path.relative_to(directory).as_posix())
    assert actual == names | {'release.json'}, 'Unexpected or missing landing assets'
    assert {'index.html', 'privacy.html', 'imprint.html', 'community-rules.html', 'robots.txt', 'sitemap.xml', 'googlef8c88b5192841789.html', 'beta-favicon.ico'} <= names
    return manifest

def unified_compose(root, compose):
    """Change only the reviewed landing mount; retain all other service settings."""
    pattern = re.compile(r'(?m)^( +)- (' + re.escape(str(root)) + r'/(?:landing-releases/[0-9a-f]{16}/public/landing|source/dist/landing)):/landing:ro$')
    assert len(pattern.findall(compose)) == 1 and compose.count(':/landing:ro') == 1, 'Landing mount differs; review before deployment'
    return pattern.sub(lambda match: match[1] + '- ' + str(root / 'source/dist/landing') + ':/landing:ro', compose)

def web_response(port, route):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    try:
        connection.request('GET', route)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally:
        connection.close()

def smoke_web(dist, revision, port):
    for attempt in range(30):
        try:
            if web_response(port, '/')[0] == 200: break
        except OSError: pass
        if attempt == 29: raise RuntimeError('Web did not become ready')
        time.sleep(.5)
    manifest = json.loads((dist / 'landing/release.json').read_text())
    for route in ('/', '/auth', '/guest?sector=Bug%20A', '/reset-password', '/auth/callback'):
        status, headers, body = web_response(port, route)
        assert status == 200 and body == (dist / 'index.html').read_bytes(), route
        assert headers.get('X-Robots-Tag') == 'noindex, follow'
    status, headers, body = web_response(port, '/landingpage')
    assert status == 200 and body == (dist / 'landing/index.html').read_bytes()
    assert 'default-src' in headers.get('Content-Security-Policy', '') and 'noindex' not in headers.get('X-Robots-Tag', '')
    for file in manifest['files']:
        name = file['path'].removeprefix('public/landing/')
        if name == 'index.html': continue
        status, _, body = web_response(port, '/landing/' + name)
        assert status == 200 and hashlib.sha256(body).hexdigest() == file['sha256'], name
    for route in ('/privacy', '/imprint', '/community-rules', '/robots.txt', '/sitemap.xml', '/googlef8c88b5192841789.html'):
        status, headers, body = web_response(port, route)
        file = route[1:] + ('.html' if route in ('/privacy', '/imprint', '/community-rules') else '')
        assert status == 200 and body == (dist / 'landing' / file).read_bytes(), route
        if file.endswith('.html') and route != '/googlef8c88b5192841789.html':
            assert headers.get('X-Robots-Tag') == 'noindex, follow' and b'<script' not in body
    for alias in ('/landing', '/landing/', '/landing/index.html', '/landingpage/'):
        status, headers, _ = web_response(port, alias + '?qa=release')
        assert status == 308 and headers.get('Location') == '/landingpage?qa=release'
    assert web_response(port, '/landing/missing-release-asset.png')[0] == 404
    assert web_response(port, '/favicon.ico')[2] == (dist / 'landing/beta-favicon.ico').read_bytes()
    app = json.loads(web_response(port, '/release.json')[2])
    landing = json.loads(web_response(port, '/landing/release.json')[2])
    assert app['revision'] == landing['revision'] == revision
    assert app['landing_release'] == landing['release'] == manifest['release']
    for path in (dist / 'downloads').rglob('*'):
        if path.is_file():
            status, _, body = web_response(port, '/downloads/' + urllib.parse.quote(path.relative_to(dist / 'downloads').as_posix(), safe='/'))
            assert status == 200 and body == path.read_bytes(), 'Installer differs'
    return {'appAndLandingRevision': revision, 'landingRelease': manifest['release'], 'assets': len(manifest['files']), 'legalStatic': True, 'aliases': 308, 'missingAsset': 404}

def preflight(root, stage, dist, revision, log):
    image = 'caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f'
    name = 'kws-web-release-smoke-' + revision[:12]
    subprocess.run(['docker', 'run', '-d', '--name', name, '--read-only', '--cap-drop=ALL', '--cap-add=NET_BIND_SERVICE', '--security-opt=no-new-privileges:true',
        '--tmpfs', '/data:size=16m', '--tmpfs', '/config:size=16m', '--tmpfs', '/metrics:size=16m', '-p', '127.0.0.1:19092:80',
        '-v', str(root / 'Caddyfile') + ':/etc/caddy/Caddyfile:ro', '-v', str(dist) + ':/web:ro', '-v', str(dist / 'landing') + ':/landing:ro',
        '-v', str(root / 'media') + ':/media:ro', image], stdout=log, stderr=log, check=True)
    try:
        return smoke_web(dist, revision, 19092)
    finally:
        subprocess.run(['docker', 'logs', name], stdout=log, stderr=log, check=False)
        subprocess.run(['docker', 'rm', '-f', name], stdout=log, stderr=log, check=True)

def activate_release(root, stage, candidate, previous, compose, start, verify, commit):
    """Restore source, landing mount and release proofs together on any failure."""
    names = ('SOURCE.json', 'BUILD-VERIFIED.json', 'LANDING-VERIFIED.json', 'docker-compose.yml')
    metadata = {name: (root / name).read_bytes() for name in names}
    for name, content in metadata.items(): (stage / (name + '.previous')).write_bytes(content)
    old = root / 'source'
    old.rename(previous)
    try:
        candidate.rename(old)
        pending = root / 'docker-compose.next.yml'; pending.write_text(compose); pending.chmod(0o600); pending.replace(root / 'docker-compose.yml')
        start(); verify(); commit()
    except Exception:
        if old.exists(): old.rename(stage / 'failed-source')
        previous.rename(old)
        for name, content in metadata.items(): (root / name).write_bytes(content)
        start()
        raise

def expected_page(root, route, app_html):
    """Legal pages belong to the independently verified landing release."""
    proof = root / 'LANDING-VERIFIED.json'
    if route not in ('/privacy', '/imprint', '/community-rules') or not proof.exists():
        return app_html
    data = json.loads(proof.read_text())
    if data.get('mode') == 'unified':
        return (root / 'source/dist/landing' / (route[1:] + '.html')).read_text()
    release = data['release']
    assert re.fullmatch('[0-9a-f]{16}', release), 'Invalid landing release'
    return (root / 'landing-releases' / release / 'public/landing' / (route[1:] + '.html')).read_text()

def preserve_downloads(previous_dist, next_dist):
    """Carry distributed installers across a web build, verifying their bytes."""
    downloads = previous_dist / 'downloads'
    if not downloads.exists():
        assert not downloads.is_symlink(), 'Dangling download directory'
        return 0
    assert downloads.is_dir() and not downloads.is_symlink(), 'Invalid download directory'
    count = 0
    for path in sorted(downloads.rglob('*')):
        assert not path.is_symlink(), 'Linked download cannot be carried forward'
        if path.is_dir(): continue
        assert path.is_file(), 'Invalid download file'
        destination = next_dist / 'downloads' / path.relative_to(downloads)
        for parent in (destination.parent, *destination.parents):
            assert not parent.is_symlink(), 'Linked download destination'
            if parent == next_dist: break
        assert not destination.is_symlink(), 'Linked download destination'
        expected = hashlib.sha256(path.read_bytes()).digest()
        if destination.exists():
            assert destination.is_file() and hashlib.sha256(destination.read_bytes()).digest() == expected, 'Download differs from distributed installer'
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, destination)
        assert hashlib.sha256(destination.read_bytes()).digest() == expected, 'Download copy differs'
        count += 1
    return count

def new_release_stage(root, revision):
    stage = root / 'releases' / revision
    if stage.exists():
        # Retain failed build diagnostics and permit a new GitHub run attempt.
        suffix = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        stage = stage.with_name(revision + '-' + suffix)
    stage.mkdir(mode=0o700, parents=True, exist_ok=False)
    return stage

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--archive-sha256', required=True)
    parser.add_argument('--expected-revision')
    parser.add_argument('--web-only', action='store_true')
    args = parser.parse_args()
    assert re.fullmatch('[0-9a-f]{40}', args.revision)
    assert re.fullmatch('[0-9a-f]{64}', args.archive_sha256)
    root = Path('/opt/kws/web-production')
    if args.expected_revision:
        assert re.fullmatch('[0-9a-f]{40}', args.expected_revision)
        assert json.loads((root / 'SOURCE.json').read_text())['revision'] == args.expected_revision, 'Live release changed; integrate before publishing'
    old = root / 'source'
    assert old.is_dir() and not old.is_symlink() and (old / 'dist/index.html').is_file()
    assert (root / 'docker-compose.yml').is_file()
    stage = new_release_stage(root, args.revision)
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
        'VITE_AUTH_SITE_URL':'https://beta.kletterwelt-sauerland.de','VITE_TELEMETRY_ENABLED':'false','VITE_SENTRY_DSN':'',
        'VITE_TRAINING_UI_PREVIEW':'false'}
    (source / '.env.hostinger.local').write_text('\n'.join(key+'='+value for key,value in values.items())+'\n')
    log_path = stage / 'build.log'
    with log_path.open('ab') as log:
        subprocess.run(['docker','run','--rm','--memory=2g','--cpus=2','-v',str(source)+':/app','-w','/app','node:22-alpine','sh','-c',
            'npm ci --legacy-peer-deps --no-audit --no-fund && node ops/hostinger/build-web.mjs ' + args.revision], stdout=log, stderr=log, check=True)
    dist = source / 'dist'; html = (dist / 'index.html').read_text()
    assert '/assets/' in html
    landing = verified_landing(source, args.revision)
    routes = (source / 'ops/hostinger/landingpage/routes.caddy').read_text()
    assert routes in (root / 'Caddyfile').read_text(), 'Landing route contract changed; review server config first'
    compose_before = (root / 'docker-compose.yml').read_text()
    compose = unified_compose(root, compose_before)
    download_count = preserve_downloads(old / 'dist', dist)
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
    (dist / 'release.json').write_text(json.dumps({'revision':args.revision, 'landing_release':landing['release'], 'deployed_at':stamp})+'\n')
    (dist / 'release.json').chmod(0o644)
    previous = root / ('previous-source-' + stamp)
    assert not previous.exists()
    report = {'revision':args.revision,'archive_sha256':args.archive_sha256,'deployed_at':stamp,'public_api_configured':True,'base':'/',
        'secret_in_bundle':False,'minimum_account_age':16,'account_deletion_request':True,'deadline_days':7,
        'downloads_preserved':download_count,'landing_release':landing['release'],'combined_web_release':True,
        'previous_source':str(previous),'media_unchanged':True,'database_unchanged':True,'backup_operator_updated':not args.web_only}
    with log_path.open('ab') as log:
        def start(): subprocess.run(['docker','compose','-f',str(root / 'docker-compose.yml'),'up','-d','--force-recreate','--no-deps','web'], stdout=log, stderr=log, check=True)
        report['preflight'] = preflight(root, stage, dist, args.revision, log)
        if args.expected_revision:
            assert json.loads((root / 'SOURCE.json').read_text())['revision'] == args.expected_revision, 'Concurrent live release changed; do not overwrite'
        assert (root / 'docker-compose.yml').read_text() == compose_before, 'Concurrent compose change'
        def verify(): report['checks'] = smoke_web(old / 'dist', args.revision, 9091)
        def commit():
            (root / 'SOURCE.json').write_text(json.dumps({'revision':args.revision})+'\n')
            (root / 'BUILD-VERIFIED.json').write_text(json.dumps(report)+'\n')
            (root / 'LANDING-VERIFIED.json').write_text(json.dumps({'mode':'unified','revision':args.revision,'release':landing['release'],'published':True,'publishedAt':stamp,'checks':report['checks']})+'\n')
            (stage / 'DEPLOYED.json').write_text(json.dumps(report)+'\n')
        activate_release(root, stage, source, previous, compose, start, verify, commit)
    # Install reviewed operator and backup updates without executing erasure.
    for origin,target in [('ops/hostinger/account-deletion.py','/opt/kws/release-readiness/account-deletion.py'),('ops/hostinger/backup-production.py','/opt/kws/tools/backup-production.py')]:
        if args.web_only: continue
        destination = Path(target)
        shutil.copyfile(destination, stage / (destination.name + '.previous'))
        shutil.copyfile(old / origin, destination); destination.chmod(0o700)
    age_proof = Path('/opt/kws/release-readiness/ACCOUNT-AGE-VERIFIED.json')
    age = json.loads(age_proof.read_text()); age['web_release_pending'] = False; age['web_revision'] = args.revision
    age_proof.write_text(json.dumps(age)+'\n')
    print(json.dumps(report))

if __name__ == '__main__':
    try:
        import fcntl
        with Path('/run/lock/kws-production-web-release.lock').open('w') as release_lock:
            fcntl.flock(release_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            main()
    except Exception as error:
        print('WEB_RELEASE_STOPPED: ' + type(error).__name__ + '; inspect protected release diagnostics')
        raise SystemExit(1)
