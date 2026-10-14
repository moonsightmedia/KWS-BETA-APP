"""Export only an encrypted production set with a successful restore proof."""
from pathlib import Path
import hashlib, json, os, pwd, re, shutil, socket

assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
os.umask(0o077)
base = Path('/var/backups/kws/production')
archive = max(p for p in base.glob('*.tar.age') if Path(str(p)+'.restore-verified.json').exists())
assert re.fullmatch(r'\d{8}T\d{6}Z\.tar\.age', archive.name)
proof = json.loads(Path(str(archive)+'.restore-verified.json').read_text())
assert proof['archive'] == archive.name and proof['database_restore_tested'] and proof['main_target_unchanged']
assert not json.loads(Path(str(archive)+'.verified.json').read_text())['rehearsal']
stamp = archive.name.removesuffix('.tar.age')
parent = Path('/home/kws-admin/.kws-production-backup-export')
assert not parent.is_symlink()
parent.mkdir(mode=0o700, exist_ok=True)
stage = parent/stamp
assert not stage.exists(), 'Inspect existing export rather than overwrite it'
stage.mkdir(mode=0o700)
actor = pwd.getpwnam('kws-admin')
files = []
for suffix in ('', '.sha256', '.verified.json', '.restore-verified.json'):
    source = Path(str(archive)+suffix)
    assert source.is_file() and not source.is_symlink() and source.parent == base
    with source.open('rb') as content: checksum = hashlib.file_digest(content,'sha256').hexdigest()
    if not suffix:
        assert checksum == Path(str(archive)+'.sha256').read_text().split()[0]
    target = stage/source.name
    shutil.copyfile(source,target)
    target.chmod(0o600); os.chown(target,actor.pw_uid,actor.pw_gid)
    files.append({'name':source.name,'bytes':source.stat().st_size,'sha256':checksum})
manifest = {'encrypted_only':True,'database_restore_tested':True,'files':files}
path = stage/'manifest.json'
path.write_text(json.dumps(manifest)+'\n'); path.chmod(0o600); os.chown(path,actor.pw_uid,actor.pw_gid)
os.chown(stage,actor.pw_uid,actor.pw_gid); os.chown(parent,actor.pw_uid,actor.pw_gid)
print(json.dumps({'transfer_directory':str(stage),'encrypted_only':True,'database_restore_tested':True,'source_changed':False}))
