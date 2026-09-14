let sequenceCounter = 0;

/**
 * Generates a collision-resistant unique ID with an optional prefix.
 * Guaranteed to be unique even across synchronous loops within the exact same millisecond.
 */
export function generateUniqueId(prefix: string = 'id'): string {
  sequenceCounter = (sequenceCounter + 1) % 1000000;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${sequenceCounter}-${randomStr}`;
}

/**
 * Ensures all items in an array have unique, valid IDs.
 * If duplicate IDs exist (e.g. from prior Date.now() collisions or duplicate storage entries):
 * - If two items have the same ID and identical non-id data, the redundant copy is removed.
 * - If two items have the same ID but differ in other fields, subsequent items receive a new unique ID.
 */
export function ensureUniqueItems<T extends { id: string }>(
  items: T[],
  fallbackPrefix: string = 'item'
): T[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  const sanitized: T[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    let finalId = item.id;

    if (!finalId || typeof finalId !== 'string' || seenIds.has(finalId)) {
      // Check if this is an identical duplicate of an already added item
      const isIdentical = sanitized.some(existing => {
        if (existing.id !== item.id) return false;
        const existingKeys = Object.keys(existing).filter(k => k !== 'id');
        const itemKeys = Object.keys(item).filter(k => k !== 'id');
        if (existingKeys.length !== itemKeys.length) return false;
        return existingKeys.every(k => (existing as Record<string, unknown>)[k] === (item as Record<string, unknown>)[k]);
      });

      if (isIdentical) {
        continue;
      }

      // Assign a fresh collision-proof unique ID
      finalId = generateUniqueId(fallbackPrefix);
    }

    seenIds.add(finalId);
    sanitized.push({ ...item, id: finalId });
  }

  return sanitized;
}
