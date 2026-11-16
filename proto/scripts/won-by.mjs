/**
 * End asks who won before the result. The checks were written when the
 * result alone decided it, from the proposed server, so this picks the
 * winner that proposal gives (the last shot's hitter for Winner and Lucky,
 * the other player for an error) and keeps every expected score the same.
 */
export const RESULTS = ['Winner', 'Lucky', 'Net', 'Long', 'Wide', 'Air']

export async function wonByFor(page, result) {
  return page.evaluate((result) => {
    const row = document.querySelector('[data-row="Won by"]')
    if (!row || row.querySelector('[aria-pressed="true"]')) return null
    const title = document.querySelector('[aria-label="End of the point"] [data-shot-title]')?.textContent ?? ''
    const hitter = title.split(' · ')[1]?.trim()
    const buttons = [...row.querySelectorAll('[data-won-by]')]
    const own = buttons.find((b) => b.textContent.trim() === hitter)
    const pick = result === 'Winner' || result === 'Lucky' ? own : buttons.find((b) => b !== own)
    return pick?.getAttribute('data-won-by') ?? null
  }, result)
}

/** Press Won by first when `name` is a result and End has not been told who won. */
export async function beforeResult(page, name, press) {
  if (!RESULTS.includes(name)) return
  const side = await wonByFor(page, name)
  if (side) await press(`[data-won-by="${side}"]`)
}
