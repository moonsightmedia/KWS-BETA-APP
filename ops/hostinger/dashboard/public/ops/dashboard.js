const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('de-DE');
const date = value => {
  const d = new Date(value);
  return value && Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat('de-DE', {dateStyle:'short', timeStyle:'short', timeZone:'Europe/Berlin'}).format(d) + ' Uhr'
    : 'Nicht verfügbar';
};
const count = value => Number.isFinite(value) ? number.format(value) : '—';
const bytes = value => {
  if (!Number.isFinite(value)) return 'Nicht verfügbar';
  const unit = value >= 1024**3 ? 'GiB' : 'MiB';
  return new Intl.NumberFormat('de-DE', {maximumFractionDigits:1}).format(value / (unit === 'GiB' ? 1024**3 : 1024**2)) + ' ' + unit;
};
const text = (id, value) => { $(id).textContent = value; };
const badge = (id, value, style) => { text(id,value); $(id).className = 'badge ' + style; };
let last = null;
let busy = false;

function freshness(failed = false) {
  const age = last ? Date.now() - new Date(last.generated_at).getTime() : Infinity;
  const stale = !Number.isFinite(age) || age > 180000 || age < -60000;
  const notice = $('notice');
  notice.hidden = !(failed || stale || last?.errors?.length);
  if (failed) notice.textContent = last ? 'Aktualisierung fehlgeschlagen. Die angezeigten Werte stammen vom letzten erfolgreichen Abruf.' : 'Die Betriebsdaten sind momentan nicht erreichbar. Bitte erneut aktualisieren.';
  else if (stale) notice.textContent = last ? 'Die Messwerte sind älter als drei Minuten. Der Server liefert momentan keine aktuellen Betriebsdaten.' : 'Betriebsdaten werden geladen …';
  else if (last.errors.length) notice.textContent = 'Einzelne Bereiche sind nicht verfügbar: ' + last.errors.map(v => ({database:'Datenbank',services:'Dienste',server:'Server',backups:'Sicherungen',videos:'Videos'})[v] || 'Betriebsdaten').join(', ') + '.';
  text('freshness', last ? 'Messstand: ' + date(last.generated_at) + ' · automatische Aktualisierung jede Minute' : 'Noch keine Betriebsdaten verfügbar');
}

function resource(id, used, total) {
  const valid = Number.isFinite(used) && Number.isFinite(total) && total > 0;
  const percent = valid ? used / total * 100 : null;
  text(id, valid ? Math.round(percent) + ' %' : '—');
  $(id + '-bar').hidden = !valid;
  if (valid) $(id + '-bar').value = Math.min(100, Math.max(0,percent));
}

function render(value) {
  last = value;
  const db = value.database;
  text('users',count(db?.users)); text('boulders',count(db?.boulders));
  text('sectors',count(db?.sectors)); text('storage',count(db?.storage_objects));
  text('boulder-detail', db ? 'Letzte Änderung: ' + date(db.latest_boulder_change) : 'Bestand nicht verfügbar');
  text('storage-detail', db ? bytes(db.storage_bytes) + ' in Supabase Storage' : 'Bestand nicht verfügbar');
  text('database-summary',db ? count(db.public_tables) + ' App-Tabellen · ' + bytes(db.database_bytes) + ' Datenbankgröße' : 'Datenbankwerte nicht verfügbar');
  const host = value.server;
  resource('cpu', host?.cpu_percent, 100);
  resource('ram',host?.ram_used_bytes,host?.ram_total_bytes);
  resource('disk',host?.disk_used_bytes,host?.disk_total_bytes);
  text('cpu-detail',host ? count(host.cpu_cores) + ' Kerne · Momentaufnahme (1 s)' : 'Messwert nicht verfügbar');
  text('ram-detail',host ? bytes(host.ram_used_bytes) + ' / ' + bytes(host.ram_total_bytes) : 'Messwert nicht verfügbar');
  text('disk-detail',host ? bytes(host.disk_free_bytes) + ' frei' : 'Messwert nicht verfügbar');
  const days = host ? Math.floor(host.uptime_seconds/86400) : null;
  text('uptime',host ? 'Server läuft seit ' + count(days) + (days === 1 ? ' Tag.' : ' Tagen.') + ' Nur Produktionsdienste der KWS-App.' : 'Serverlaufzeit nicht verfügbar. Nur Produktionsdienste der KWS-App.');
  $('services').replaceChildren();
  const services = value.services;
  if (Array.isArray(services) && services.length) {
    const healthy = services.every(item => item.healthy);
    badge('service-badge',healthy ? 'Alle Dienste laufen' : 'Dienst prüfen',healthy ? 'good' : 'error');
    services.forEach(item => {
      const row = document.createElement('li');
      const label = document.createElement('span'); label.textContent = item.label;
      const status = document.createElement('span');
      status.className = 'service-state ' + (item.healthy ? '' : item.running ? 'warn' : 'error');
      status.textContent = item.healthy ? 'Läuft' : item.running ? 'Healthcheck prüfen' : 'Gestoppt';
      row.append(label,status); $('services').append(row);
    });
  } else {
    badge('service-badge','Nicht verfügbar','warn');
    const row = document.createElement('li'); row.textContent = 'Dienste können momentan nicht geprüft werden.'; $('services').append(row);
  }
  const backup = value.backups;
  const latest = backup?.latest;
  const freshBackup = latest && Date.now() - new Date(latest.created_at).getTime() < 36*3600000;
  const okay = freshBackup && backup.timer_active && backup.last_job_result === 'success';
  badge('backup-badge',okay ? 'Lokal geprüft' : 'Sicherung prüfen',okay ? 'good' : 'warn');
  text('backup-date',latest ? date(latest.created_at) : backup ? 'Keine geprüfte Sicherung gefunden' : 'Nicht verfügbar');
  text('backup-integrity',latest ? count(latest.files_verified) + ' Dateien entschlüsselt & geprüft · ' + bytes(latest.bytes) : 'Nicht verfügbar');
  text('restore',backup?.restore_test ? date(backup.restore_test.created_at) + ' · ' + count(backup.restore_test.tables_verified) + ' Tabellen geprüft' : 'Kein bestätigter Restore-Test');
  text('backup-schedule',backup ? (backup.timer_active ? 'Aktiv · täglich 03:30 UTC (+ bis 10 Min.)' : 'Nicht aktiv') + (backup.last_job_result !== 'success' ? ' · letzter Lauf prüfen' : '') : 'Nicht verfügbar');
  $('offsite').className = 'backup-note' + (backup?.independent_location_verified ? ' good' : '');
  text('offsite',backup ? backup.independent_location_verified ? 'Sicherung außerhalb des VPS bestätigt.' : 'Noch offen: Eine unabhängige Sicherung außerhalb dieses VPS ist nicht bestätigt. Lokale Backups schützen nicht vor dem Verlust des gesamten Servers.' : 'Sicherungsstatus nicht verfügbar. Schutz außerhalb des VPS kann nicht bestätigt werden.');
  const video = value.videos;
  text('video-count',count(video?.video_files)); text('thumbnail-count',count(video?.thumbnail_files)); text('video-bytes',bytes(video?.total_bytes));
  text('video-jobs',video ? count((video.jobs.queued||0)+(video.jobs.processing||0)) + ' aktiv · ' + count(video.jobs.failed||0) + ' fehlgeschlagen' : 'Nicht verfügbar');
  freshness();
}

async function refresh() {
  if (busy) return;
  busy = true; $('refresh').disabled = true; text('refresh','Wird geladen …');
  try {
    const response = await fetch('/ops/status.json',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('snapshot-unavailable');
    const value = await response.json();
    if (value.schema_version !== 1 || !Array.isArray(value.errors) || !Number.isFinite(new Date(value.generated_at).getTime())) throw new Error('invalid-snapshot');
    render(value);
  } catch { freshness(true); }
  finally { busy = false; $('refresh').disabled = false; text('refresh','Aktualisieren'); }
}
$('refresh').addEventListener('click',refresh);
setInterval(refresh,60000);
refresh();
