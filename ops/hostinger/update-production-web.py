"""Deploy an exact, verified public Git commit; preserve the previous web release.

No database, mail, media or account mutation. Build before replacing the web
directory, retain old hashed assets for open clients, and roll back failed starts.
"""
from pathlib import Path
import argparse, datetime, hashlib, http.client, io, json, os, re, shutil, socket, subprocess, tarfile, time, urllib.parse, urllib.request

def thumbnail_build_values(root=Path('/opt/kws/thumbnail-focus'), gateway=Path('/opt/kws/public-gateway/Caddyfile'), health=None):
    values = {'VITE_THUMBNAIL_FOCUS': 'false', 'VITE_THUMBNAIL_API_PATH': '/thumbnail-focus'}
    config = root / 'ACTIVATION.json'
    if not config.exists(): return values
    def private_json(path):
        assert not root.is_symlink() and not path.is_symlink() and path.is_file() and path.stat().st_size <= 262144, 'Unsafe thumbnail configuration'
        if os.name != 'nt': assert path.stat().st_uid == os.geteuid() and path.stat().st_mode & 0o077 == 0, 'Thumbnail configuration must be operator-private'
        document = json.loads(path.read_text())
        assert isinstance(document, dict), 'Invalid thumbnail configuration'
        return document
    activation = private_json(config)
    assert activation.get('version') == 1 and isinstance(activation.get('enabled'), bool), 'Invalid thumbnail activation'
    if not activation['enabled']: return values
    receipt = root / 'VERIFIED.json'
    proof = private_json(receipt)
    assert hashlib.sha256(receipt.read_bytes()).hexdigest() == activation.get('verified_sha256'), 'Thumbnail verification changed'
    assert not gateway.is_symlink() and hashlib.sha256(gateway.read_bytes()).hexdigest() == activation.get('gateway_sha256'), 'Thumbnail gateway changed'
    assert proof.get('models_verified') is True and proof.get('private_networks_only') is True and proof.get('local_only_false') is True, 'Thumbnail runtime is not verified'
    for environment, origin in (('production', 'https://beta-api.kletterwelt-sauerland.de'), ('review', 'https://review-api.kletterwelt-sauerland.de')):
        if health:
            ready = health(origin + '/thumbnail-focus/api/health')
        else:
            with urllib.request.urlopen(origin + '/thumbnail-focus/api/health', timeout=12) as response:
                assert response.status == 200, 'Thumbnail runtime unavailable'
                ready = json.load(response)
        assert ready.get('ok') is True and ready.get('local_only') is False and ready.get('environment') == environment, 'Thumbnail runtime identity mismatch'
        assert ready.get('provider') == 'CPUExecutionProvider' and ready.get('model_revision') == 'e4668c026bd3743c6011cc5453dbe32d4d67cadf' and ready.get('version') == 'sam-number-cards-3.2', 'Thumbnail model contract changed'
    values['VITE_THUMBNAIL_FOCUS'] = 'true'
    return values

def monitoring_build_values(root=Path('/opt/kws/monitoring'), functions=Path('/opt/kws/supabase/runtime/volumes/functions'), candidate=None):
    values = {'VITE_MONITORING_ENABLED':'false','VITE_MONITORING_CHANNEL':'production','VITE_SENTRY_DSN':''}
    config_path = root / 'config.json'
    if not config_path.exists(): return values
    def private_document(path):
        assert not root.is_symlink() and not path.is_symlink() and path.is_file() and path.stat().st_size <= 262144, 'Unsafe monitoring configuration'
        if os.name != 'nt': assert path.stat().st_uid == os.geteuid() and path.stat().st_mode & 0o077 == 0, 'Monitoring configuration must be operator-private'
        document = json.loads(path.read_text())
        assert isinstance(document, dict), 'Invalid monitoring configuration'
        return document
    config = private_document(config_path)
    assert config.get('version') == 1 and isinstance(config.get('collection_enabled'), bool), 'Invalid monitoring build configuration'
    if not config['collection_enabled']: return values
    activation = private_document(root / 'activation.json')
    assert activation.get('allow_jobs') is True and activation.get('config_sha256') == hashlib.sha256(json.dumps(config, sort_keys=True, separators=(',', ':')).encode()).hexdigest(), 'Monitoring configuration is not approved'
    worker_files = {'common.py','alert_worker.py','sentry_importer.py','store_importer.py','maintenance.py','install.py'}
    artifacts = activation.get('artifacts')
    assert isinstance(artifacts, dict) and set(artifacts) == worker_files, 'Monitoring worker proof is incomplete'
    for filename, expected in artifacts.items():
        installed = root / filename
        assert not installed.is_symlink() and hashlib.sha256(installed.read_bytes()).hexdigest() == expected, 'Monitoring worker changed after activation'
    receipt = private_document(root / 'edge-installation.json')
    assert receipt.get('runtime_mount_verified') is True and receipt.get('handler_hashes_verified') is True and receipt.get('functions_restarted') is True, 'Monitoring edge installation is not verified'
    files = receipt.get('files')
    expected_files = {'monitoring-events/handler.ts','monitoring-events/index.ts','send-push-notification/handler.ts','send-push-notification/index.ts'}
    assert isinstance(files, dict) and set(files) == expected_files, 'Missing monitoring edge proof'
    assert candidate is not None, 'Monitoring candidate proof is required'
    verification = private_document(root / 'ingest-verification.json')
    assert verification.get('ingest_verified') is True and verification.get('config_sha256') == activation['config_sha256'] and verification.get('files') == files, 'Monitoring ingest was not verified for this configuration'
    assert re.fullmatch('[0-9a-f]{32}', verification.get('database_signature', '')), 'Missing monitoring schema signature'
    assert verification.get('migration_sha256') == hashlib.sha256((candidate / 'supabase/migrations/20261017203000_beta_launch_monitoring.sql').read_bytes()).hexdigest(), 'Monitoring migration differs from verified candidate'
    assert not functions.is_symlink(), 'Unsafe edge runtime'
    for relative, expected in files.items():
        assert relative in ('monitoring-events/handler.ts','monitoring-events/index.ts','send-push-notification/handler.ts','send-push-notification/index.ts'), 'Unexpected monitoring runtime file'
        installed = functions / relative
        assert not installed.is_symlink() and not installed.parent.is_symlink() and hashlib.sha256(installed.read_bytes()).hexdigest() == expected, 'Monitoring handler differs from installation proof'
        assert hashlib.sha256((candidate / 'supabase/functions' / relative).read_bytes()).hexdigest() == expected, 'Monitoring candidate handler differs from verified installation'
    dsn = config.get('client', {}).get('sentry_dsn') or ''
    if dsn:
        assert isinstance(dsn, str) and len(dsn) <= 512 and not re.search(r'[\s\x00-\x1f]', dsn), 'Invalid monitoring DSN'
        parsed = urllib.parse.urlsplit(dsn)
        assert parsed.scheme == 'https' and parsed.hostname and parsed.hostname.endswith(('.ingest.sentry.io','.ingest.us.sentry.io','.ingest.de.sentry.io')) and parsed.username and not parsed.password and parsed.path.strip('/').isdigit() and not parsed.query and not parsed.fragment, 'Invalid monitoring DSN'
    values.update(VITE_MONITORING_ENABLED='true', VITE_SENTRY_DSN=dsn)
    return values

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
    for route in ('/', '/auth', '/guest?sector=Bug%20A', '/reset-password', '/auth/callback', '/app/privacy'):
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
    values.update(monitoring_build_values(candidate=source))
    values.update(thumbnail_build_values())
    if values['VITE_MONITORING_ENABLED'] == 'true':
        subprocess.run(['systemctl','is-active','--quiet','kws-monitoring-maintenance.timer'], check=True)
        schema = subprocess.run(['docker','exec','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-c',"SELECT to_regprocedure('public.kws_ingest_monitoring_events(jsonb,uuid)') IS NOT NULL AND to_regprocedure('public.kws_monitoring_retain()') IS NOT NULL"], check=True, capture_output=True, text=True, timeout=20)
        assert schema.stdout.strip() == 't', 'Monitoring schema is not installed'
        signature_sql = "SELECT md5(coalesce(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' || E'\\n' || pg_get_functiondef(p.oid), E'\\n' ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)),'')) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND (p.proname LIKE 'kws_monitoring_%' OR p.proname = 'kws_ingest_monitoring_events')"
        signature = subprocess.run(['docker','exec','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-c',signature_sql], check=True, capture_output=True, text=True, timeout=20)
        assert signature.stdout.strip() == json.loads(Path('/opt/kws/monitoring/ingest-verification.json').read_text())['database_signature'], 'Monitoring schema changed after verification'
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
