"""Trusted local worker; no device tokens or credentials enter its output."""
import json
import os
import socket
import subprocess


def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    result = subprocess.run([
        'docker', 'exec', 'supabase-db', 'psql', '-X', '-U', 'postgres', '-d', 'postgres',
        '-At', '-v', 'ON_ERROR_STOP=1', '-c',
        "SET statement_timeout = '10s'; SELECT public.flush_pending_boulder_notifications();",
    ], capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise RuntimeError('Database dispatch failed')
    report = json.loads(result.stdout.strip().splitlines()[-1])
    if report.get('boulders', 0):
        print(json.dumps(report))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'dispatch_failed': True, 'error_class': type(error).__name__}))
        raise SystemExit(1)
