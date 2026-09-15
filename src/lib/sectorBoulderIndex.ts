type BoulderReference = { id: string; sector_id: string | null; sector_id_2: string | null };

/** Read all pages, even when the server's page cap is lower than our limit. */
export async function fetchActiveSectorBoulderIndex(baseUrl: string, read: (url: string) => Promise<Response>) {
  const index = new Map<string, Set<string>>();
  let cursor = '';
  for (;;) {
    const url = new URL(`${baseUrl}/rest/v1/boulders`);
    url.searchParams.set('select', 'id,sector_id,sector_id_2');
    url.searchParams.set('or', '(status.eq.haengt,status.is.null)');
    url.searchParams.set('order', 'id.asc');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('id', `gt.${cursor}`);
    const response = await read(url.toString());
    if (!response.ok) throw new Error(`Boulder-Zähler nicht verfügbar (${response.status})`);
    const rows = await response.json() as BoulderReference[];
    if (!rows.length) return index;
    const nextCursor = rows.at(-1)!.id;
    if (!nextCursor || (cursor && nextCursor <= cursor)) throw new Error('Boulder-Zähler: ungültige Folgeseite');
    for (const row of rows) {
      for (const sectorId of [row.sector_id, row.sector_id_2]) {
        if (!sectorId) continue;
        if (!index.has(sectorId)) index.set(sectorId, new Set());
        index.get(sectorId)!.add(row.id);
      }
    }
    cursor = nextCursor;
  }
}
