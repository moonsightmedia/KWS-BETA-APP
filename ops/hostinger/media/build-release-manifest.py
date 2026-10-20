"""Run from the repository root after the final source edit, before committing."""
from pathlib import Path
import hashlib
import json
import subprocess
import argparse

root = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--base', required=True, help='Freshly fetched, reviewed main commit')
args = parser.parse_args()
base = subprocess.check_output(['git', 'rev-parse', args.base], cwd=root).decode().strip()
server = root / 'hostinger-video-server'
files = [server / name for name in ['Dockerfile', 'package.json', 'package-lock.json']]
files += sorted((server / 'src').glob('*.js')) + sorted((server / 'test').glob('*.js'))
candidate = {}
for file in files:
    name = file.relative_to(server).as_posix()
    # Hash staged Git bytes, so Windows CRLF checkouts cannot invalidate the
    # downloaded Linux source. Stage final server edits before generating this.
    data = subprocess.check_output(['git', 'show', ':hostinger-video-server/' + name], cwd=root)
    candidate[name] = hashlib.sha256(data).hexdigest()
previous = {}
for name in candidate:
    if not name.startswith('src/'):
        continue
    command = subprocess.run(['git', 'show', base + ':hostinger-video-server/' + name], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if command.returncode == 0:
        previous[name] = hashlib.sha256(command.stdout).hexdigest()
manifest = {'version': 1, 'reviewed_base': base, 'previous_src_sha256': previous, 'candidate_src_sha256': {name: digest for name, digest in candidate.items() if name.startswith('src/')}, 'candidate_sha256': candidate}
target = Path(__file__).with_name('release-manifest.json')
target.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
print(hashlib.sha256(target.read_bytes()).hexdigest())
