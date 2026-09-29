/** Keep occupied cells stable; each new item takes the first free cell. */
export function reconcileInventorySlots(
  slots: (string | null)[],
  acquiredIds: string[],
): (string | null)[] {
  const acquired = new Set(acquiredIds);
  const placed = new Set<string>();
  const next = slots.map((id) => {
    if (!id || !acquired.has(id) || placed.has(id)) return null;
    placed.add(id);
    return id;
  });
  for (const id of acquired) {
    if (placed.has(id)) continue;
    const free = next.indexOf(null);
    if (free < 0) next.push(id);
    else next[free] = id;
    placed.add(id);
  }
  while (next.length && next.at(-1) === null) next.pop();
  return next;
}
