"""Publish only the static landing page, preserving the independent app release."""
from pathlib import Path
import datetime, fcntl, hashlib, http.client, json, os, re, shutil, socket, subprocess, sys, tarfile, time

ROOT = Path('/opt/kws/web-production')
IMAGE = 'caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f'
EXPECTED_APP = None
RELEASE = None
STAGE = None

def digest(data): return hashlib.sha256(data).hexdigest()
def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode: raise RuntimeError(str(args[:3]) + ': ' + result.stderr[-3000:])
    return result.stdout
def request(port, route):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
    try:
        connection.request('GET', route)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally: connection.close()
def ready(port):
    for attempt in range(20):
        try:
            if request(port, '/')[0] == 200: return
        except OSError: pass
        time.sleep(.5)
    raise RuntimeError('Web did not become ready')
def other_containers():
    ids = run(['docker','ps','-q']).split()
    containers = json.loads(run(['docker','inspect',*ids]))
    return {c['Name']: {'startedAt':c['State']['StartedAt'],'running':c['State']['Running']} for c in containers if c['Name'] != '/kws-web-production' and not c['Name'].startswith('/kws-landing-smoke-')}
def smoke(port, manifest, expected_app):
    status, icon_headers, icon_content = request(port, '/favicon.ico')
    assert status == 200 and icon_content == (STAGE/'public/landing/beta-favicon.ico').read_bytes()
    assert 'image/' in icon_headers.get('Content-Type','')
    status, headers, content = request(port, '/landingpage')
    assert status == 200 and content == (STAGE/'public/landing/index.html').read_bytes()
    assert 'default-src' in headers.get('Content-Security-Policy','')
    assert 'text/html' in headers.get('Content-Type','')
    for file in manifest['files']:
        route = '/' + file['path'].removeprefix('public/')
        status, _, content = request(port, route)
        # index.html is a canonical redirect; /landingpage above verifies its bytes.
        if route == '/landing/index.html': continue
        assert status == 200 and digest(content) == file['sha256'], route
    for route in ['/landing','/landing/','/landing/index.html','/landingpage/']:
        status, headers, _ = request(port, route+'?qa=online')
        assert status == 308 and headers['Location'] == '/landingpage?qa=online', route
    assert request(port, '/landing/definitely-missing-asset.png')[0] == 404
    for route in ['/privacy','/imprint','/community-rules','/robots.txt','/sitemap.xml','/googlef8c88b5192841789.html']:
        status, headers, content = request(port,route)
        file = route.lstrip('/') + ('.html' if route in ['/privacy','/imprint','/community-rules'] else '')
        assert status == 200 and content == (STAGE/'public/landing'/file).read_bytes(), route
        if route in ['/privacy','/imprint','/community-rules']:
            assert headers.get('X-Robots-Tag') == 'noindex, follow' and '<script' not in content.decode(), route
        if route == '/sitemap.xml': assert 'xml' in headers.get('Content-Type',''), headers
    for route in ['/','/auth','/guest?sector=Bug%20A','/reset-password','/auth/callback']:
        status, _, content = request(port, route)
        assert status == 200 and digest(content) == expected_app, route
    return {'landing':200,'assets':len(manifest['files']),'aliases':308,'missingAsset':404,'appRoutesUnchanged':True,'domainFavicon':'approved Beta icon'}

def stage(archive, archive_hash):
    assert digest(archive.read_bytes()) == archive_hash
    assert not STAGE.exists(), 'Preserve prior staged release'
    STAGE.mkdir(parents=True, mode=0o700)
    with tarfile.open(archive, 'r:gz') as bundle:
        for member in bundle:
            relative = Path(member.name)
            assert not relative.is_absolute() and '..' not in relative.parts
            assert member.isdir() or member.isfile()
            destination = STAGE/relative
            assert destination.resolve().is_relative_to(STAGE.resolve())
            if member.isdir(): destination.mkdir(parents=True, exist_ok=True, mode=0o755)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                with bundle.extractfile(member) as source, destination.open('xb') as output: shutil.copyfileobj(source,output)
                destination.chmod(0o644)
    manifest = json.loads((STAGE/'manifest.json').read_text())
    assert manifest['release'] == RELEASE and digest((STAGE/'routes.caddy').read_bytes()) == manifest['routesSha256']
    expected = {file['path'] for file in manifest['files']}
    actual = {p.relative_to(STAGE).as_posix() for p in (STAGE/'public').rglob('*') if p.is_file()}
    assert actual == expected
    for file in manifest['files']:
        data = (STAGE/file['path']).read_bytes()
        assert len(data)==file['bytes'] and digest(data)==file['sha256']
    assert json.loads((ROOT/'SOURCE.json').read_text())['revision'] == EXPECTED_APP
    caddy = (ROOT/'Caddyfile').read_text()
    compose = (ROOT/'docker-compose.yml').read_text()
    previous_release = None
    if '@landingAliases' in caddy:
        previous_release = json.loads((ROOT/'LANDING-VERIFIED.json').read_text())['release']
        assert re.fullmatch('[0-9a-f]{16}',previous_release)
        previous_routes=(ROOT/'landing-releases'/previous_release/'routes.caddy').read_text()
        assert caddy.count(previous_routes)==1, 'Previous reviewed routes differ; inspect first'
        anchor='   - '+str(ROOT/'landing-releases'/previous_release/'public/landing')+':/landing:ro\n'
        assert compose.count(anchor)==1 and compose.count(':/landing:ro')==1
        candidate=caddy.replace(previous_routes,(STAGE/'routes.caddy').read_text(),1)
        candidate_compose=compose.replace(anchor,'   - '+str(STAGE/'public/landing')+':/landing:ro\n')
    else:
        assert '/landingpage' not in caddy
        fallback = re.compile(r'\n([ \t]*)handle \{\s*\n[ \t]*root \* /web\s*\n[ \t]*header Cache-Control no-store\s*\n[ \t]*try_files \{path\} /index\.html')
        matches=list(fallback.finditer(caddy)); assert len(matches)==1
        candidate=caddy[:matches[0].start()]+'\n'+(STAGE/'routes.caddy').read_text()+caddy[matches[0].start():]
        anchor='   - /opt/kws/web-production/media:/media:ro\n'
        assert compose.count(anchor)==1 and ':/landing:' not in compose
        candidate_compose=compose.replace(anchor,anchor+'   - '+str(STAGE/'public/landing')+':/landing:ro\n')
    fallback='  header Cache-Control no-store\n  try_files {path} /index.html'
    indexed_fallback='  header Cache-Control no-store\n  header X-Robots-Tag "noindex, follow"\n  try_files {path} /index.html'
    assert candidate.count(fallback)+candidate.count(indexed_fallback)==1
    candidate=candidate.replace(fallback,indexed_fallback,1)
    metrics=ROOT/'landing-metrics'
    if ':/metrics:rw' not in candidate_compose:
        anchor='   - '+str(STAGE/'public/landing')+':/landing:ro\n'
        assert candidate_compose.count(anchor)==1
        candidate_compose=candidate_compose.replace(anchor,anchor+'   - '+str(metrics)+':/metrics:rw\n',1)
    smoke_metrics=STAGE/'metrics-smoke';smoke_metrics.mkdir(mode=0o700)
    for name, data in [('Caddyfile.before',caddy),('docker-compose.before.yml',compose),('Caddyfile.candidate',candidate),('docker-compose.candidate.yml',candidate_compose)]:
        (STAGE/name).write_text(data);(STAGE/name).chmod(0o600)
    run(['docker','compose','-f',str(STAGE/'docker-compose.candidate.yml'),'config','--quiet'])
    run(['docker','run','--rm','--network','none','-v',str(STAGE/'Caddyfile.candidate')+':/etc/caddy/Caddyfile:ro','-v',str(smoke_metrics)+':/metrics:rw',IMAGE,'caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'])
    app_hash=digest((ROOT/'source/dist/index.html').read_bytes())
    container='kws-landing-smoke-'+RELEASE
    before=other_containers()
    with socket.socket() as check: check.bind(('127.0.0.1',19091))
    args=['docker','run','-d','--name',container,'--read-only','--cap-drop','ALL','--cap-add','NET_BIND_SERVICE','--security-opt','no-new-privileges:true','-p','127.0.0.1:19091:80']
    for origin,target in [(STAGE/'Caddyfile.candidate','/etc/caddy/Caddyfile'),(STAGE/'public/landing','/landing'),(ROOT/'source/dist','/web'),(ROOT/'media','/media')]: args+=['-v',str(origin)+':'+target+':ro']
    args+=['-v',str(smoke_metrics)+':/metrics:rw']
    args+=['--tmpfs','/data:size=16m','--tmpfs','/config:size=16m',IMAGE]
    try:
        run(args);ready(19091);checks=smoke(19091,manifest,app_hash)
        # Deliberately send identifying-looking markers only to isolated staging.
        marker='KWS-PRIVACY-TEST-DO-NOT-RETAIN'
        connection=http.client.HTTPConnection('127.0.0.1',19091,timeout=20)
        connection.request('GET','/landingpage?private='+marker,headers={'Cookie':marker,'Referer':'https://example.org/'+marker,'User-Agent':marker,'X-Forwarded-For':'192.0.2.123'})
        response=connection.getresponse();response.read();connection.close();time.sleep(.2)
        records=[json.loads(line) for line in (smoke_metrics/'access.jsonl').read_text().splitlines()]
        allowed={'level','ts','logger','msg','status','page'}
        assert len(records)==2 and all(set(record)<=allowed and record['page']=='landingpage' for record in records), records
        assert marker not in (smoke_metrics/'access.jsonl').read_text() and '192.0.2.123' not in (smoke_metrics/'access.jsonl').read_text()
        assert all(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:00Z',record['ts']) for record in records)
        checks['counterPrivacyFilterVerified']=True
    finally: run(['docker','rm','-f',container])
    report={'release':RELEASE,'previousLandingRelease':previous_release,'expectedApp':EXPECTED_APP,'appHtmlSha256':app_hash,'caddyBeforeSha256':digest(caddy.encode()),'composeBeforeSha256':digest(compose.encode()),'otherContainers':before,'checks':checks,'published':False}
    (STAGE/'STAGED.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in ['release','expectedApp','checks','published']}))

def apply():
    report=json.loads((STAGE/'STAGED.json').read_text());manifest=json.loads((STAGE/'manifest.json').read_text())
    assert digest((ROOT/'Caddyfile').read_bytes()) == report['caddyBeforeSha256']
    assert digest((ROOT/'docker-compose.yml').read_bytes()) == report['composeBeforeSha256']
    assert json.loads((ROOT/'SOURCE.json').read_text())['revision'] == report['expectedApp']
    assert digest((ROOT/'source/dist/index.html').read_bytes()) == report['appHtmlSha256']
    def start(): run(['docker','compose','-f',str(ROOT/'docker-compose.yml'),'up','-d','--force-recreate','--no-deps','web'])
    def replace(name, source):
        pending=ROOT/(name+'.landing-next');shutil.copyfile(STAGE/source,pending);pending.chmod(0o600);os.replace(pending,ROOT/name)
    try:
        (ROOT/'landing-metrics').mkdir(exist_ok=True,mode=0o700)
        (ROOT/'landing-metrics').chmod(0o700)
        replace('Caddyfile','Caddyfile.candidate');replace('docker-compose.yml','docker-compose.candidate.yml')
        start();ready(9091);checks=smoke(9091,manifest,report['appHtmlSha256'])
        assert other_containers() == report['otherContainers'], 'Another service changed during publication'
        assert json.loads((ROOT/'SOURCE.json').read_text())['revision'] == report['expectedApp']
    except Exception:
        replace('Caddyfile','Caddyfile.before');replace('docker-compose.yml','docker-compose.before.yml');start();ready(9091)
        (STAGE/'ROLLED-BACK.json').write_text(json.dumps({'release':RELEASE,'rolledBack':True})+'\n')
        raise
    report.update({'published':True,'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'independentMount':str(STAGE/'public/landing'),'rollbackFiles':['Caddyfile.before','docker-compose.before.yml']})
    (STAGE/'PUBLISHED.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'LANDING-VERIFIED.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in ['release','published','publishedAt','checks','independentMount']}))

if __name__ == '__main__':
    assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
    os.umask(0o077)
    if sys.argv[1]=='stage':
        assert len(sys.argv)==5, 'stage archive archive-sha256 expected-app-revision'
        assert re.fullmatch('[0-9a-f]{64}',sys.argv[3]) and re.fullmatch('[0-9a-f]{40}',sys.argv[4])
        assert digest(Path(sys.argv[2]).read_bytes())==sys.argv[3]
        EXPECTED_APP=sys.argv[4]
        with tarfile.open(sys.argv[2],'r:gz') as bundle:
            manifests=[member for member in bundle if Path(member.name).as_posix()=='manifest.json']
            assert len(manifests)==1 and manifests[0].isfile()
            RELEASE=json.load(bundle.extractfile(manifests[0]))['release']
    else:
        assert sys.argv[1]=='apply' and len(sys.argv)==3, 'apply release-id'
        RELEASE=sys.argv[2]
    assert re.fullmatch('[0-9a-f]{16}',RELEASE)
    STAGE=ROOT/'landing-releases'/RELEASE
    # Use both existing release locks; the timer remains enabled and simply skips a busy tick.
    with open('/run/lock/kws-web-autodeploy.lock','w') as auto, open('/run/lock/kws-production-web-release.lock','w') as web:
        fcntl.flock(auto,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(web,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if sys.argv[1]=='stage': stage(Path(sys.argv[2]),sys.argv[3])
        elif sys.argv[1]=='apply': apply()
        else: raise ValueError('stage or apply required')
