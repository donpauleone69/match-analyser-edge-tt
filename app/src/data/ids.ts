/**
 * Ids for new rows: `<prefix>-<ms>-<8 hex>`. The time keeps an id readable;
 * the random part keeps two ids made in one millisecond, or on two devices,
 * apart. `crypto.getRandomValues` works on a plain http address, where
 * `crypto.randomUUID` does not. Seed ids are fixed and never made here.
 */
export function createRowId(prefix: string, now: number = Date.now()): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${now}-${hex}`
}
