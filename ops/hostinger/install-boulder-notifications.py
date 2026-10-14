"""Install the reviewed queue and local worker, retaining the previous function."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess

FILES = {
    '20261013163000_batch_ready_boulder_notifications.sql': 'ad00ea0b923ef706d040a35b7d5e9d7a9a68f3af6fb9614072a235ad52895a40',
    'flush-boulder-notifications.py': '5860e27f09e3bbdfba480eaf128a1bde81a6a15c223391a5df4f863d1df6a270',
    'kws-boulder-notifications.service': 'ed9ec53dcd6d865c8d47e6f132eb43fe544b89e483a34407ea29243a7b7b3e05',
    'kws-boulder-notifications.timer': '1e153cd649c539079de10eb26e21af809c12f87bc2078e4fd95b508851892d11',
}


def sql(query):
    result = subprocess.run(['docker','exec','-i','supabase-db','psql','-X','-U','supabase_admin','-d','postgres',
                             '-qAt','-v','ON_ERROR_STOP=1','-1','-f','-'], input=query, capture_output=True, text=True, timeout=30)
    if result.returncode:
        Path('/opt/kws/production/boulder-notification-install-error.log').write_text(result.stderr)
        raise RuntimeError('Production SQL failed; protected diagnostics retained')
    return result.stdout.strip()


def main(directory):
    assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
    os.umask(0o077)
    assert Path('/opt/kws/production/CUTOVER-COMPLETE.json').is_file()
    for name,digest in FILES.items():
        assert hashlib.sha256((directory/name).read_bytes()).hexdigest()==digest, 'Unreviewed installation input'
    assert sql("SELECT to_regclass('public.boulder_notification_queue') IS NULL;")=='t', 'Already installed; inspect rather than overwrite'
    for name in ('kws-boulder-notifications.service','kws-boulder-notifications.timer'):
        target=Path('/etc/systemd/system')/name
        if target.exists():
            assert not target.is_symlink() and hashlib.sha256(target.read_bytes()).hexdigest()==FILES[name], 'Existing worker unit differs'
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/opt/kws/production')/('boulder-notifications-before-'+stamp)
    backup.mkdir(mode=0o700)
    previous=sql("SELECT pg_get_functiondef('public.notify_new_boulder()'::regprocedure);")
    (backup/'rollback-notify.sql').write_text(previous+'\n')
    assert 'notify_new_boulder' in previous and '10 seconds' in previous
    worker=Path('/opt/kws/tools/flush-boulder-notifications.py')
    if worker.exists():
        assert not worker.is_symlink() and hashlib.sha256(worker.read_bytes()).hexdigest()==FILES[worker.name], 'Existing worker differs'
    worker.write_bytes((directory/worker.name).read_bytes()); worker.chmod(0o700)
    for name in ('kws-boulder-notifications.service','kws-boulder-notifications.timer'):
        target=Path('/etc/systemd/system')/name
        target.write_bytes((directory/name).read_bytes()); target.chmod(0o644)
    subprocess.run(['systemd-analyze','verify',str(directory/'kws-boulder-notifications.service'),
                    str(directory/'kws-boulder-notifications.timer')], check=True, capture_output=True)
    sql((directory/'20261013163000_batch_ready_boulder_notifications.sql').read_text())
    assert json.loads(sql('SELECT public.flush_pending_boulder_notifications();'))=={'boulders':0,'notifications':0}
    subprocess.run(['systemctl','daemon-reload'], check=True, capture_output=True)
    subprocess.run(['systemctl','enable','--now','kws-boulder-notifications.timer'], check=True, capture_output=True)
    subprocess.run(['systemctl','start','kws-boulder-notifications.service'], check=True, capture_output=True)
    assert subprocess.check_output(['systemctl','is-active','kws-boulder-notifications.timer'],text=True).strip()=='active'
    assert subprocess.check_output(['systemctl','show','kws-boulder-notifications.service','--property=Result','--value'],text=True).strip()=='success'
    report={'installed':True,'quiet_seconds':120,'timer_seconds':15,'worker_result':'success',
            'existing_notifications_resent':False,'previous_function':str(backup/'rollback-notify.sql'),
            'file_sha256':FILES,'verified_at':stamp}
    (Path('/opt/kws/production')/'BOULDER-NOTIFICATIONS-VERIFIED.json').write_text(json.dumps(report)+'\n')
    print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--directory',required=True)
    args=parser.parse_args()
    try: main(Path(args.directory).resolve())
    except Exception as error:
        print(json.dumps({'installation_failed':True,'error_class':type(error).__name__}))
        raise SystemExit(1)
