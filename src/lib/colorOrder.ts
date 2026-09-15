export type ColorPosition = { id: string; sort_order: number };

export function moveColor<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function sameColorPositions(left: ColorPosition[], right: ColorPosition[]) {
  const positions = new Map(left.map(row => [row.id, row.sort_order]));
  return left.length === right.length && right.every(row => positions.get(row.id) === row.sort_order);
}

export class ColorOrderError extends Error {
  constructor(message: string, readonly reloadRequired = false) { super(message); }
}

// Existing authenticated UPDATE transport, deliberately writing only sort_order.
// Compare-and-set protects against another admin's changes. If a request fails,
// compensate acknowledged AND ambiguous writes, then read back the actual order.
// This is not a DB transaction: never claim success or a rollback without verification.
export async function persistColorOrder(
  expected: ColorPosition[],
  ids: string[],
  transport: {
    read: () => Promise<ColorPosition[]>;
    update: (id: string, from: number, to: number) => Promise<void>;
  },
) {
  if (ids.length !== expected.length || new Set(ids).size !== ids.length || ids.some(id => !expected.some(row => row.id === id))) {
    throw new ColorOrderError('Die Farbliste ist nicht mehr vollständig. Bitte lade sie neu.', true);
  }
  const before = await transport.read();
  if (!sameColorPositions(expected, before)) {
    throw new ColorOrderError('Die Reihenfolge wurde inzwischen geändert. Bitte lade die Liste neu und sortiere erneut.', true);
  }
  const planned = ids.map((id, index) => ({ id, sort_order: index + 1 }));
  const attempted: { id: string; from: number; to: number }[] = [];
  try {
    for (const row of planned) {
      const from = before.find(item => item.id === row.id)!.sort_order;
      if (from === row.sort_order) continue;
      attempted.push({ id: row.id, from, to: row.sort_order });
      await transport.update(row.id, from, row.sort_order);
    }
    if (!sameColorPositions(planned, await transport.read())) throw new Error('Order verification failed');
    return planned;
  } catch {
    try {
      const current = await transport.read();
      for (const change of [...attempted].reverse()) {
        if (current.find(row => row.id === change.id)?.sort_order !== change.to) continue;
        // Conditional restoration cannot overwrite a newer, different position.
        try { await transport.update(change.id, change.to, change.from); } catch { /* read-back below decides */ }
      }
      if (sameColorPositions(before, await transport.read())) {
        throw new ColorOrderError('Speichern fehlgeschlagen. Die bisherige Reihenfolge wurde beibehalten. Dein Entwurf bleibt erhalten – versuche es erneut.');
      }
    } catch (error) {
      if (error instanceof ColorOrderError) throw error;
    }
    throw new ColorOrderError('Der gespeicherte Stand konnte nicht bestätigt werden. Möglicherweise wurde nur ein Teil übernommen. Bitte lade die Liste neu, bevor du weiter sortierst.', true);
  }
}
