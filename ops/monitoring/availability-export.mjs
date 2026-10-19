import { readFile } from 'node:fs/promises';

const mapping = { mon_1114D8A6A1631E123C62: 'app', mon_BF64DC59E9DC4DE1893C: 'api', mon_1B73146EF531CEE47868: 'video' };
const causes = new Set(['http_status', 'redirect', 'timeout', 'dns', 'tls', 'connection', 'destination_policy', 'other']);
export function projectAvailability(project, id, now = Date.now()) {
  if (project?.project?.projectId !== id || !mapping[id] || !Array.isArray(project.services) || project.services.length !== 1 || !Array.isArray(project.incidents)) throw new Error('Invalid project projection');
  const component = project.services[0].components?.find(value => value.component === 'public-http-monitor');
  const checkedAt = component?.observedAt;
  const fresh = typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt)) && now - Date.parse(checkedAt) < 180000 && Date.parse(checkedAt) <= now + 30000 && !component.stale;
  const open = project.incidents.some(value => value.lifecycle === 'open');
  const alertMode = project.settings?.alertMode;
  if (!['live', 'shadow', 'silent'].includes(alertMode)) throw new Error('Invalid alert mode');
  const state = !fresh ? 'unknown' : open ? 'outage' : component.status === 'ready' ? 'operational' : ['degraded', 'unavailable'].includes(component.status) ? 'checking' : 'unknown';
  return {
    service: { id: mapping[id], state, checked_at: typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt)) ? checkedAt : null,
      latency_ms: Number.isSafeInteger(component?.latencyMs) && component.latencyMs >= 0 && component.latencyMs <= 300000 ? component.latencyMs : null, alert_mode: alertMode },
    incidents: project.incidents.slice(0, 100).map(value => {
      if (!['open', 'resolved'].includes(value.lifecycle) || !Number.isFinite(Date.parse(value.openedAt)) || value.lifecycle === 'resolved' && !Number.isFinite(Date.parse(value.resolvedAt))) throw new Error('Invalid incident');
      return { service: mapping[id], state: value.lifecycle, started_at: value.openedAt, ended_at: value.lifecycle === 'resolved' ? value.resolvedAt : null, cause: causes.has(value.cause) ? value.cause : 'other' };
    }),
  };
}

async function exportAvailability() {
  const registry = JSON.parse(await readFile('/run/secrets/operator_auth', 'utf8'));
  const token = registry?.operators?.[0]?.token;
  if (typeof token !== 'string' || token.length < 32) throw new Error('Operator unavailable');
  const services = [];
  const incidents = [];
  for (const id of Object.keys(mapping)) {
    const response = await fetch(`http://127.0.0.1:8091/api/projects/${id}`, { headers: { authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Project unavailable');
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 1048576) { await reader.cancel(); throw new Error('Projection too large'); } chunks.push(next.value); }
    const projection = projectAvailability(JSON.parse(Buffer.concat(chunks).toString('utf8')), id);
    services.push(projection.service);
    incidents.push(...projection.incidents);
  }
  incidents.sort((first, second) => Date.parse(second.started_at) - Date.parse(first.started_at));
  process.stdout.write(JSON.stringify({ schema_version: 1, generated_at: new Date().toISOString(), services, incidents: incidents.slice(0, 12) }));
}

if (process.argv[1] === '-') exportAvailability().catch(() => { process.stderr.write('KWS availability source unavailable\n'); process.exitCode = 1; });
