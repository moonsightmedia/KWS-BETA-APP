#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
version=2.120.0
release="https://github.com/supabase/cli/releases/download/v${version}"
asset="supabase_${version}_linux_amd64.tar.gz"
stage="/opt/kws/tools/supabase-cli-${version}"
install -d -m 700 "$stage" /opt/kws/tools /opt/kws/migration-work/supabase
cd "$stage"
if [[ ! -f supabase ]]; then
  curl --fail --silent --show-error --location "$release/checksums.txt" -o checksums.txt
  curl --fail --silent --show-error --location "$release/$asset" -o "$asset"
  awk -v asset="$asset" '$2==asset {print}' checksums.txt > selected-checksum.txt
  [[ $(wc -l < selected-checksum.txt) == 1 ]] || exit 1
  sha256sum -c selected-checksum.txt
  # Inspect names before unpacking official release content.
  python3 - <<'PY'
import tarfile
from pathlib import PurePosixPath
with tarfile.open('supabase_2.120.0_linux_amd64.tar.gz','r:gz') as tar:
    members=tar.getmembers()
    assert all(not PurePosixPath(m.name).is_absolute() and '..' not in PurePosixPath(m.name).parts for m in members)
    binary=next(m for m in members if m.name=='supabase')
    assert binary.isfile()
    with tar.extractfile(binary) as source,open('supabase','xb') as target: target.write(source.read())
PY
  chmod 700 supabase
fi
install -m 700 supabase /opt/kws/tools/supabase
[[ $(/opt/kws/tools/supabase --version) == "$version" ]] || exit 1
# Separate workspace; do not touch any existing laptop CLI account or link.
if [[ ! -e /opt/kws/migration-work/supabase/config.toml ]]; then
  printf 'project_id = "kws-source-export"\n[db]\nmajor_version = 17\n' > /opt/kws/migration-work/supabase/config.toml
fi
echo 'DATABASE_EXPORT_TOOL_READY_NO_SOURCE_CONNECTION_OR_DUMP_PERFORMED'
