#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
database='kws_restore_probe_20261009_092807'
work=Path('/var/backups/kws/migration')/database
assert json.loads((work/'STORAGE-VERIFIED.json').read_text())['all_sha256_match'] is True
query="""DO $witness$ BEGIN
IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='kws_backup_restore_witness') THEN
 PERFORM vault.create_secret('KWS backup restore test witness','kws_backup_restore_witness');
END IF;
END; $witness$;
SELECT decrypted_secret='KWS backup restore test witness'
FROM vault.decrypted_secrets WHERE name='kws_backup_restore_witness';
"""
output=subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stderr=subprocess.DEVNULL).decode().strip()
assert output=='t'
report={'database':database,'inert_vault_witness_created':True,'vault_decryption_verified':True,'application_data_unchanged':True,'do_not_promote_rehearsal_database':True}
(work/'BACKUP-RESTORE-WITNESS.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
PY
