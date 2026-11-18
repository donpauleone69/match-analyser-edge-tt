// Best + FA v0.13.1: real double taps at speed 1, and the flow picker on an open rally. Dev server on 5174.
import { launch, fresh, state, fit } from './best-v013-lib.mjs'

const W = Number(process.env.W ?? 393)
const H = Number(process.env.H ?? 660)
const touch = W < 800
const { browser, page, errors } = await launch({ width: W, height: H, touch, speed: '1' })
const out = []
const report = (id, fails) => out.push(`${fails.length ? 'FAIL' : 'pass'} ${id}${fails.length ? '\n   ' + fails.join('\n   ') : ''}`)

/** Wait out the 450 ms guard between scripted answers. */
const slow = async (sel) => {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, sel)
  await page.waitForTimeout(650)
  return ok
}
const centre = async (sel) => {
  const box = await page.locator(sel).first().boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
const tapAt = async ({ x, y }) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
/** Two real taps on one spot, 150 ms apart. */
const doubleTap = async (sel) => {
  const at = await centre(sel)
  await tapAt(at)
  await page.waitForTimeout(150)
  await tapAt(at)
  await page.waitForTimeout(700)
}
const tapRally = async (page, n) => {
  const playing = await page.evaluate(() => document.querySelector('.tag-set')?.dataset.playing === 'true')
  if (!playing) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(1200)
  } else await page.waitForTimeout(1200)
  for (let i = 0; i < n; i++) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(500)
  }
  await page.waitForFunction(() => document.querySelector('.tag-set')?.dataset.tagMode === 'tagging', { timeout: 15000 })
  await page.waitForTimeout(1100)
}
const pressedStrokes = () => page.evaluate(() => document.querySelectorAll('[data-stroke-shot] [aria-pressed="true"]').length)
const aceFirst = async () => {
  await fresh(page)
  await tapRally(page, 1)
  await slow('[data-best-end="Winner"]')
  await slow('[data-point-to="You"]')
}

// Receive double tap: the Third grid draws under the second tap, which must not answer it.
{
  const fails = []
  await aceFirst()
  await tapRally(page, 4)
  await slow('[data-best-end="Winner"]')
  await slow('[data-point-to="Kim"]')
  await slow('[data-stroke-shot] [data-wing="FH"][data-stroke="Attack"]')
  await slow('[data-best-serve="Short"]')
  let s = await state(page)
  if (s.step !== 'receive') fails.push(`expected Receive, got ${s.step}`)
  await doubleTap('[data-stroke-shot] [data-wing="BH"][data-stroke="Control"]')
  s = await state(page)
  if (s.step !== 'third') fails.push(`after double tap step ${s.step} saved ${s.saved}`)
  if (s.saved) fails.push('saved on the second tap')
  if ((await pressedStrokes()) !== 0) fails.push('Third answered by the second tap')
  if (s.step === 'third') {
    await tapAt(await centre('[data-stroke-shot] [data-wing="FH"][data-stroke="Control"]'))
    await page.waitForTimeout(700)
    s = await state(page)
    if (!s.saved) fails.push('a deliberate tap after the guard did not answer Third')
  }
  const bad = await fit(page)
  if (bad) fails.push(bad)
  report('Double tap on Receive', fails)
}

// Delete last double tap: the last stroke grid draws under the second tap, which must not answer it.
{
  const fails = []
  await aceFirst()
  await tapRally(page, 6)
  await slow('[data-best-end="Winner"]')
  await slow('[data-point-to="You"]')
  let s = await state(page)
  if (!s.line) fails.push('no mismatch')
  await doubleTap('[data-best-fix="deleteLast"]')
  s = await state(page)
  const n = s.contacts.split(',').length
  if (n !== 5) fails.push(`contacts ${n}, want 5`)
  if (s.strokeShot !== '5') fails.push(`last stroke grid shot ${s.strokeShot}`)
  if ((await pressedStrokes()) !== 0) fails.push('new last stroke answered by the second tap')
  if (s.step !== 'end') fails.push(`step ${s.step}`)
  report('Double tap on Delete last', fails)
}

// Flow picker follows the open rally.
{
  const fails = []
  await aceFirst()
  await tapRally(page, 3)
  let f = await page.evaluate(() => {
    const sel = document.querySelector('[data-flow-toggle]')
    return [sel.value, sel.disabled]
  })
  if (JSON.stringify(f) !== JSON.stringify(['bestfa', true])) fails.push(`open rally picker ${JSON.stringify(f)}`)
  await slow('[data-best-end="Winner"]')
  await slow('[data-point-to="You"]')
  await slow('[data-stroke-shot] [data-wing="FH"][data-stroke="Attack"]')
  await slow('[data-best-serve="Short"]')
  await slow('[data-stroke-shot] [data-wing="BH"][data-stroke="Control"]')
  const s = await state(page)
  if (!s.saved) fails.push('not saved')
  f = await page.evaluate(() => {
    const sel = document.querySelector('[data-flow-toggle]')
    return [sel.value, sel.disabled]
  })
  if (JSON.stringify(f) !== JSON.stringify(['bestfa', false])) fails.push(`after save picker ${JSON.stringify(f)}`)
  const bad = await fit(page)
  if (bad) fails.push(bad)
  report('Flow picker on an open rally', fails)
}

if (errors.length) out.push('FAIL page errors\n   ' + errors.slice(0, 5).join('\n   '))
console.log(`${W}x${H}\n${out.join('\n')}`)
await browser.close()
