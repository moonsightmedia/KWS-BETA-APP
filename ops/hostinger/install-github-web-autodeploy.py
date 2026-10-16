"""Install only operator-reviewed files; run as root on the production VPS."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import socket
import subprocess

assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
os.umask(0o077)
parser = argparse.ArgumentParser()
parser.add_argument('--expected-revision', required=True)
args = parser.parse_args()
assert json.loads(Path('/opt/kws/web-production/SOURCE.json').read_text())['revision'] == args.expected_revision
source = Path(__file__).resolve().parent
target = Path('/opt/kws/github-web-autodeploy')
assert not target.exists(), 'Existing installation requires an explicit upgrade, not blind replacement'
target.mkdir(mode=0o700)
for name in ('github-web-autodeploy.py', 'update-production-web.py'):
    origin = source / name
    assert origin.is_file() and not origin.is_symlink()
    shutil.copyfile(origin, target / name)
    (target / name).chmod(0o700)
config = {'operator_sha256': hashlib.sha256((target / 'update-production-web.py').read_bytes()).hexdigest()}
(target / 'config.json').write_text(json.dumps(config) + '\n')
for name in ('kws-web-autodeploy.service', 'kws-web-autodeploy.timer'):
    destination = Path('/etc/systemd/system') / name
    assert not destination.exists(), 'Existing systemd unit needs review'
    shutil.copyfile(source / name, destination)
    destination.chmod(0o644)
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemd-analyze', 'verify', '/etc/systemd/system/kws-web-autodeploy.service',
                '/etc/systemd/system/kws-web-autodeploy.timer'], check=True)
# The first read-only tick must succeed before scheduled execution is enabled.
subprocess.run(['systemctl', 'start', 'kws-web-autodeploy.service'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'kws-web-autodeploy.timer'], check=True)
print('GITHUB_WEB_AUTODEPLOY_INSTALLED')
