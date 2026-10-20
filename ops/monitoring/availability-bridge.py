import hashlib
import hmac
import json
import os
from pathlib import Path
import stat
import subprocess
import urllib.request


ROOT = Path('/opt/moonsight-hub/integrations/kws-availability')
CONFIG = Path('/etc/moonmon/secrets/kws_availability_bridge.json')
TARGET = 'https://beta-api.kletterwelt-sauerland.de/rest/v1/rpc/kws_publish_availability'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        raise ValueError('Redirect rejected')


def publish(config, snapshot, opener=None):
    if set(config) != {'signing_key', 'public_key'} or len(config['signing_key']) != 64:
        raise ValueError('Invalid bridge configuration')
    key = bytes.fromhex(config['signing_key'])
    if len(key) != 32 or not isinstance(config['public_key'], str) or not config['public_key']:
        raise ValueError('Invalid bridge configuration')
    if not isinstance(snapshot, str) or len(snapshot.encode()) > 32768:
        raise ValueError('Invalid snapshot')
    signature = hmac.new(key, snapshot.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(TARGET, method='POST', data=json.dumps({'p_snapshot': snapshot, 'p_signature': signature}).encode(),
                                     headers={'Content-Type': 'application/json', 'apikey': config['public_key'], 'Authorization': 'Bearer ' + config['public_key']})
    with (opener or urllib.request.build_opener(NoRedirect())).open(request, timeout=15) as response:
        if response.status != 200:
            raise ValueError('Snapshot rejected')
        raw = response.read(4097)
        if len(raw) > 4096:
            raise ValueError('Invalid acknowledgement')
        result = json.loads(raw)
        if not isinstance(result, dict) or result.get('accepted') is not True or not isinstance(result.get('updated'), bool) or set(result) != {'accepted', 'updated'}:
            raise ValueError('Snapshot rejected')
        return result


def main():
    metadata = CONFIG.lstat()
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.geteuid() or metadata.st_mode & 0o077:
        raise ValueError('Unsafe bridge configuration')
    source = (ROOT / 'availability-export.mjs').read_bytes()
    result = subprocess.run(['docker', 'exec', '-i', 'moonsight-hub-operator-1', 'node', '--input-type=module', '-'],
                            input=source, capture_output=True, timeout=25, check=True)
    if len(result.stdout) > 32768:
        raise ValueError('Snapshot too large')
    publish(json.loads(CONFIG.read_text()), result.stdout.decode())
    print('KWS availability snapshot confirmed')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('KWS availability snapshot unavailable')
        raise SystemExit(1)
