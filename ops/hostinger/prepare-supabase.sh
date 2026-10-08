#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
sshd -t
sed -i 's/^PermitRootLogin prohibit-password$/PermitRootLogin no/' /etc/ssh/sshd_config.d/00-kws-security.conf
sshd -t
systemctl reload ssh

ref=self-hosted/v0.8.2
expected=564eab8ad7840b13324f68b1bfac074ef8d51c21
if [[ ! -d /opt/kws/supabase/upstream/.git ]]; then
  git clone --depth 1 --filter=blob:none --sparse --branch "$ref" https://github.com/supabase/supabase.git /opt/kws/supabase/upstream
  git -C /opt/kws/supabase/upstream sparse-checkout set docker
fi
[[ $(git -C /opt/kws/supabase/upstream rev-parse HEAD) == "$expected" ]] || { echo 'Unexpected upstream commit'; exit 1; }
install -d -m 700 /opt/kws/supabase/runtime
if [[ ! -f /opt/kws/supabase/runtime/docker-compose.yml ]]; then
  cp -a /opt/kws/supabase/upstream/docker/. /opt/kws/supabase/runtime/
fi
# Config mounts must be readable by the non-root users inside containers.
chmod 644 /opt/kws/supabase/runtime/volumes/db/*.sql /opt/kws/supabase/runtime/volumes/pooler/pooler.exs
find /opt/kws/supabase/runtime/volumes/api -type d -exec chmod 755 {} +
find /opt/kws/supabase/runtime/volumes/api -type f -exec chmod 644 {} +
chmod 755 /opt/kws/supabase/runtime/volumes/api/envoy/docker-entrypoint.sh
find /opt/kws/supabase/runtime/volumes/functions -type d -exec chmod 755 {} +
find /opt/kws/supabase/runtime/volumes/functions -type f -exec chmod 644 {} +
printf 'ref=%s\ncommit=%s\n' "$ref" "$expected" > /opt/kws/supabase/runtime/.supabase-version
git -C /opt/kws/supabase/upstream rev-parse HEAD
echo 'SUPABASE_CONFIGURATION_PREPARED_NOT_STARTED'
docker compose version
sshd -T | awk '/^(permitrootlogin|passwordauthentication) /'
