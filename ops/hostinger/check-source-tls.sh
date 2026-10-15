#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
host=aws-1-eu-north-1.pooler.supabase.com
# Public CA URL verified in the authenticated source dashboard's SSL settings.
ca=/opt/kws/tools/source-supabase-ca.crt
curl --fail --silent --show-error --location 'https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt' -o "$ca"
openssl x509 -in "$ca" -noout -fingerprint -sha256
timeout 20 openssl s_client -starttls postgres -connect "$host:5432" -servername "$host" -verify_hostname "$host" -verify_return_error -CAfile "$ca" < /dev/null > /var/log/kws-source-pooler-tls.log 2>&1 || true
# An unauthenticated session may end with EOF after the completed handshake.
if grep -Fq 'Verify return code: 0 (ok)' /var/log/kws-source-pooler-tls.log && ! grep -Fq 'verify error:' /var/log/kws-source-pooler-tls.log; then
  echo 'SOURCE_SESSION_POOLER_TLS_CHAIN_AND_HOSTNAME_VERIFIED_NO_DATABASE_AUTH_PERFORMED'
else
  echo 'SOURCE_SESSION_POOLER_TLS_CHECK_FAILED_REQUIRES_DIAGNOSTIC'
  exit 1
fi
