"""Read-only aggregate snapshot. Run locally on the VPS; expose no credentials/users."""
from pathlib import Path
from datetime import datetime, timezone
import json, os, shutil, subprocess, time

BASE = Path('/opt/kws/operations-dashboard')
BACKUPS = Path('/var/backups/kws/production')
SERVICES = {
    'supabase-db': 'Datenbank', 'supabase-auth': 'Anmeldung',
    'supabase-rest': 'Daten-API', 'supabase-storage': 'Dateispeicher',
    'realtime-dev.supabase-realtime': 'Live-Aktualisierung',
    'supabase-edge-functions': 'App-Funktionen', 'supabase-studio': 'Supabase Studio',
    'supabase-envoy': 'Supabase Gateway', 'kws-api-internal': 'API-Zugang',
    'kws-video-production': 'Videoverarbeitung', 'kws-web-production': 'Web-App',
    'kws-public-gateway-caddy-1': 'HTTPS-Zugang',
}

def run(args, stdin=None):
    return subprocess.run(args, input=stdin, text=True, capture_output=True,
                          timeout=12, check=True).stdout.strip()

def database():
    query = """BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
    SET LOCAL statement_timeout = '6s';
    SELECT json_build_object(
      'users', (SELECT count(*) FROM auth.users),
      'boulders', (SELECT count(*) FROM public.boulders),
      'sectors', (SELECT count(*) FROM public.sectors),
      'storage_objects', (SELECT count(*) FROM storage.objects),
      'storage_bytes', (SELECT coalesce(sum((metadata->>'size')::bigint),0) FROM storage.objects),
      'database_bytes', pg_database_size(current_database()),
      'public_tables', (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
      'boulder_status', (SELECT coalesce(json_object_agg(status,n),'{}'::json) FROM
        (SELECT status::text, count(*) n FROM public.boulders GROUP BY status) t),
      'latest_boulder_change', (SELECT max(updated_at) FROM public.boulders)
    ); ROLLBACK;"""
    return json.loads(run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin',
                          '-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'], query))

def services():
    # Whitelist production containers; migration probes are not app dependencies.
    data = json.loads(run(['docker','inspect',*SERVICES]))
    state = {v['Name'].lstrip('/'): v['State'] for v in data}
    result = []
    for name, label in SERVICES.items():
        value = state[name]
        health = value.get('Health',{}).get('Status')
        healthy = bool(value['Running']) and (health is None or health == 'healthy')
        result.append({'label': label, 'running': bool(value['Running']),
                       'health': health, 'healthy': healthy,
                       'started_at': value.get('StartedAt')})
    return result

def server():
    def cpu():
        values = list(map(int, Path('/proc/stat').read_text().splitlines()[0].split()[1:9]))
        return sum(values), values[3] + values[4]
    first = cpu(); time.sleep(1); second = cpu()
    total = second[0] - first[0]
    memory = {line.split(':')[0]: int(line.split()[1])*1024
              for line in Path('/proc/meminfo').read_text().splitlines()}
    disk = shutil.disk_usage('/opt/kws')
    return {'cpu_percent': round(100*(1-(second[1]-first[1])/total),1) if total else None,
            'cpu_cores': os.cpu_count(), 'load_1m': os.getloadavg()[0],
            'ram_total_bytes': memory['MemTotal'],
            'ram_used_bytes': memory['MemTotal'] - memory['MemAvailable'],
            'disk_total_bytes': disk.total, 'disk_used_bytes': disk.used,
            'disk_free_bytes': disk.free,
            'uptime_seconds': int(float(Path('/proc/uptime').read_text().split()[0]))}

def stamp_from_archive(name):
    return datetime.strptime(name[:16], '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc).isoformat()

def backups():
    result = {'latest': None, 'restore_test': None, 'independent_location_verified': False,
              'timer_active': subprocess.run(['systemctl','is-active','kws-production-backup.timer'],
                  text=True, capture_output=True, timeout=12).stdout.strip() == 'active',
              'last_job_result': run(['systemctl','show','kws-production-backup.service','-p','Result','--value']),
              'schedule': 'Täglich um 03:30 UTC, mit bis zu 10 Minuten Verzögerung',
              'retention': '7 aktuelle Sicherungen und bis zu 4 Wochensicherungen'}
    for path in sorted(BACKUPS.glob('*.tar.age.verified.json'), reverse=True):
        report = json.loads(path.read_text())
        archive = BACKUPS / report['archive']
        if archive.parent != BACKUPS or not archive.is_file() or report.get('rehearsal'):
            continue
        if not report.get('decrypted_files_verified'):
            continue
        result['latest'] = {'created_at': stamp_from_archive(archive.name),
            'bytes': archive.stat().st_size, 'files_verified': report['decrypted_files_verified'],
            'storage_versions_verified': report.get('storage_versions_verified'),
            'media_references_present': report.get('media_references_present'),
            'database_restore_tested': report.get('database_restore_tested') is True}
        # Only a concrete verification marker can establish off-server protection.
        result['independent_location_verified'] = report.get('independent_backup_location') is True
        break
    for path in sorted(BACKUPS.glob('*.tar.age.restore-verified.json'), reverse=True):
        report = json.loads(path.read_text())
        if report.get('database_restore_tested') is True and report.get('vault_decryption_verified') is True:
            result['restore_test'] = {'created_at': stamp_from_archive(report['archive']),
                'tables_verified': report.get('tables_with_exact_rows'),
                'rows_verified': report.get('rows_verified')}
            break
    return result

def videos():
    counts = {}
    jobs = Path('/opt/kws/video-production/data/jobs')
    assert jobs.is_dir()
    for path in jobs.glob('*.json'):
        value = json.loads(path.read_text()).get('status', 'unknown')
        key = value if value in ('queued','processing','completed','failed','deleted') else 'unknown'
        counts[key] = counts.get(key, 0) + 1
    final = Path('/opt/kws/video-production/data/final')
    assert final.is_dir()
    extensions = {'.mp4','.mov','.webm','.m4v'}
    files = [p for p in final.rglob('*') if p.is_file() and not p.is_symlink()]
    return {'jobs': counts, 'video_files': sum(p.suffix.lower() in extensions for p in files),
            'thumbnail_files': sum(p.suffix.lower() in ('.jpg','.jpeg','.png','.webp') for p in files),
            'total_bytes': sum(p.stat().st_size for p in files)}

def collect():
    result = {'schema_version': 1, 'generated_at': datetime.now(timezone.utc).isoformat(),
              'errors': []}
    for name, callback in [('database',database),('services',services),('server',server),
                           ('backups',backups),('videos',videos)]:
        try:
            result[name] = callback()
        except Exception:
            # No raw subprocess/DB diagnostics in the public-facing snapshot or log.
            result[name] = None
            result['errors'].append(name)
    return result

if __name__ == '__main__':
    assert os.geteuid() == 0
    target = BASE / 'public/ops/status.json'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(collect(), ensure_ascii=False) + '\n')
    temp.chmod(0o644)
    temp.replace(target)
