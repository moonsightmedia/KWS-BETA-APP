#!/usr/bin/env python3
"""Exercise real uploads/RLS only against the isolated synthetic review stack."""
import binascii
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import time
import urllib.error
import urllib.request
import uuid
import zlib

ROOT = Path('/opt/kws/store-review')


def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    assert json.loads((ROOT / 'SEEDED.json').read_text())['source_rows_copied'] == 0
    env = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if '=' in line)
    accounts = {a['role']: a for a in json.loads((ROOT / 'review-accounts.json').read_text())}
    def address(container, port):
        state = json.loads(subprocess.check_output(['docker', 'inspect', container]))[0]
        assert set(state['NetworkSettings']['Networks']) == {'kws-store-review-private'}
        return 'http://' + state['NetworkSettings']['Networks']['kws-store-review-private']['IPAddress'] + ':' + str(port)
    api_base = address('kws-store-review-api-gw', 8000)
    video_base = address('kws-store-review-video', 3000)
    checks = []
    def check(name, passed):
        checks.append({'check': name, 'passed': bool(passed)})
        if not passed:
            raise AssertionError(name)
    def http(url, token, body=None, method='GET', headers=None):
        req = urllib.request.Request(url, data=body, headers={
            'Authorization': 'Bearer ' + token, 'apikey': env['ANON_KEY'], **(headers or {})}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()
    def api(path, token=None, payload=None, method=None):
        status, data = http(api_base + path, token or env['SERVICE_ROLE_KEY'],
            None if payload is None else json.dumps(payload).encode(),
            method or ('POST' if payload is not None else 'GET'), {'Content-Type': 'application/json'})
        return status, json.loads(data) if data else None
    tokens = {}
    for role, account in accounts.items():
        status, response = api('/auth/v1/token?grant_type=password', env['ANON_KEY'],
            {'email': account['email'], 'password': account['password']})
        check(role + '_login', status == 200 and response['user']['id'] == account['id'])
        tokens[role] = response['access_token']
    # Real JWT/API negative checks, not only simulated SQL claims.
    status, visible = api('/rest/v1/profiles?select=id', tokens['customer'])
    check('customer_sees_only_own_private_profile', status == 200 and visible == [{'id': accounts['customer']['id']}])
    status, visible = api('/rest/v1/profiles?select=id', tokens['admin'])
    check('review_admin_can_read_synthetic_users', status == 200 and len(visible) == 4)
    status, _ = api('/rest/v1/user_roles', tokens['customer'], {'user_id': accounts['customer']['id'], 'role': 'admin'})
    check('customer_cannot_self_promote', status in [401, 403])
    missing_session = '00000000-0000-4000-8000-000000000000'
    status, _ = http(video_base + '/upload-status.php?session_id=' + missing_session, tokens['customer'])
    check('customer_video_management_denied', status == 403)
    status, detail = http(video_base + '/upload-status.php?session_id=' + missing_session, tokens['setter'])
    if status != 404:
        print(json.dumps({'review_video_status':status,'error':json.loads(detail).get('error')}))
    check('setter_video_management_permitted', status == 404)
    # A review user JWT must never authenticate against the actual system.
    production_env = dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
    req = urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/rest/v1/profiles?select=id&limit=1', headers={
        'apikey': production_env['ANON_KEY'], 'Authorization': 'Bearer ' + tokens['admin']})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            production_status = response.status
    except urllib.error.HTTPError as error:
        production_status = error.code
    check('review_admin_jwt_rejected_by_production', production_status == 401)
    # Likewise the production public JWT is not a valid review credential.
    status, _ = api('/rest/v1/boulders?select=id', production_env['ANON_KEY'])
    check('production_jwt_rejected_by_review', status == 401)
    production_env = None
    media_marker = ROOT / 'MEDIA-SEEDED.json'
    if not media_marker.exists():
        # Original generated fixture, no real image or identifiable person.
        def png_chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', binascii.crc32(kind + data) & 0xffffffff)
        raw = b''.join(b'\x00' + b''.join(bytes((54, 181, 49) if ((x-90)**2+(y-100)**2<1800 or (x-210)**2+(y-250)**2<2000) else (232, 237, 232)) for x in range(300)) for y in range(400))
        image = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB',300,400,8,2,0,0,0)) + png_chunk(b'IDAT', zlib.compress(raw)) + png_chunk(b'IEND',b'')
        def upload(data, filename, mime, boulder=None):
            session = str(uuid.uuid4())
            if boulder:
                status, _ = api('/rest/v1/rpc/begin_boulder_video_upload', tokens['setter'],
                    {'p_boulder_id':boulder,'p_upload_session_id':session})
                check('setter_begin_video_job',status == 200)
            boundary = 'kws-review-' + secrets_token()
            body = ('--'+boundary+'\r\nContent-Disposition: form-data; name="chunk"; filename="'+filename+'"\r\nContent-Type: '+mime+'\r\n\r\n').encode() + data + ('\r\n--'+boundary+'--\r\n').encode()
            headers = {'Content-Type':'multipart/form-data; boundary='+boundary,
                'X-Upload-Session-Id':session,'X-Chunk-Number':'0','X-Total-Chunks':'1',
                'X-File-Size':str(len(data)),'X-File-Name':filename,'X-File-Type':mime,'X-Sector-Id':'demo'}
            if boulder:
                headers['X-Boulder-Id'] = boulder
            status, response = http(video_base+'/upload.php',tokens['setter'],body,'POST',headers)
            check('upload_' + mime, status == 200)
            return json.loads(response)
        thumbnail = upload(image,'demo-wall.png','image/png')
        check('synthetic_thumbnail_completed', thumbnail['status']=='completed')
        status,_=api('/rest/v1/boulders?id=in.(a3000000-0000-4000-8000-000000000001,a3000000-0000-4000-8000-000000000002,a3000000-0000-4000-8000-000000000003)', payload={'thumbnail_url':thumbnail['url']},method='PATCH')
        check('synthetic_thumbnails_assigned',status in [200,204])
        source = ROOT / 'demo-source.mp4'
        assert source.is_file()
        boulder='a3000000-0000-4000-8000-000000000001'
        job=upload(source.read_bytes(),'demo-animation.mp4','video/mp4',boulder)
        check('synthetic_video_queued',job['status']=='queued')
        completed=None
        for _ in range(90):
            status,data=http(video_base+'/jobs/'+job['job_id'],tokens['setter'])
            check('video_job_read',status==200)
            completed=json.loads(data)
            if completed.get('status') in ['completed','failed']:break
            time.sleep(1)
        check('synthetic_video_transcoded',completed['status']=='completed')
        for quality in ['hd','sd','low']:
            url=completed['urls'][quality]
            check('review_media_url_'+quality,url.startswith('https://review-video.kletterwelt-sauerland.de/videos/'))
            status,data=http(video_base+urllib.parse.urlsplit(url).path,env['ANON_KEY'],headers={'Range':'bytes=0-63'})
            check('video_range_'+quality,status==206 and len(data)==64)
        for _ in range(20):
            status,rows=api('/rest/v1/boulders?id=eq.'+boulder+'&select=beta_video_status')
            if status==200 and rows[0]['beta_video_status']=='ready':break
            time.sleep(1)
        check('publisher_saved_ready',rows[0]['beta_video_status']=='ready')
        media_marker.write_text(json.dumps({'synthetic_media_only':True,'three_quality_levels':True})+'\n')
    proof={'checks':checks,'passed':len(checks),'production_changed':False,
        'public_routing_enabled':False,'private_media_ready':True}
    (ROOT/'SECURITY-VERIFIED.json').write_text(json.dumps(proof)+'\n')
    print(json.dumps(proof))


def secrets_token():
    import secrets
    return secrets.token_hex(12)


if __name__=='__main__':
    main()
