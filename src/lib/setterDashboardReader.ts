/** Read every page, including when a gateway imposes a smaller cap than requested. */
export async function readDashboardRows<T extends { id: string }>(path: string, request: (path: string) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  let cursor = '';
  while (true) {
    const page = await request(`${path}&order=id.asc&limit=200${cursor ? `&id=gt.${encodeURIComponent(cursor)}` : ''}`);
    if (!Array.isArray(page)) throw new Error('Ungültige Dashboard-Antwort');
    if (!page.length) return rows;
    const nextCursor = page[page.length - 1].id;
    if (!nextCursor || (cursor && nextCursor <= cursor)) throw new Error('Dashboard konnte nicht vollständig geladen werden');
    rows.push(...page);
    cursor = nextCursor;
  }
}
