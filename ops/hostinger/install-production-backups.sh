#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
test -f /opt/kws/tools/backup-production.py
python3 -m py_compile /opt/kws/tools/backup-production.py
test ! -e /etc/systemd/system/kws-production-backup.service
cat > /etc/systemd/system/kws-production-backup.service <<'EOF'
[Unit]
Description=Verified encrypted Kletterwelt application backup
After=docker.service
Requires=docker.service
ConditionPathExists=/opt/kws/production/CUTOVER-COMPLETE.json
[Service]
Type=oneshot
User=root
UMask=0077
ExecStart=/usr/bin/python3 /opt/kws/tools/backup-production.py
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
TimeoutStartSec=45min
EOF
cat > /etc/systemd/system/kws-production-backup.timer <<'EOF'
[Unit]
Description=Daily Kletterwelt backup at 03:30 UTC
[Timer]
OnCalendar=*-*-* 03:30:00 UTC
RandomizedDelaySec=10min
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemd-analyze verify /etc/systemd/system/kws-production-backup.service /etc/systemd/system/kws-production-backup.timer
systemctl daemon-reload
systemctl enable --now kws-production-backup.timer
systemctl is-active kws-production-backup.timer
echo BACKUP_TIMER_ENABLED_REQUIRES_VERIFIED_CUTOVER
