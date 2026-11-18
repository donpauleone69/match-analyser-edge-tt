// R25 (Shot by shot and Spine, 2 rallies each) and R26 (copy). Dev server on 5174.
import { launch, fresh, tapRally, end, point, stroke, serve, fix, fit, shot } from './best-v013-lib.mjs'

const W = Number(process.env.W ?? 393)
const H = Number(process.env.H ?? 660)
const touch = W < 800
const { browser, page, errors } = await launch({ width: W, height: H, touch })
const out = []
const report = (id, fails) => {
  out.push(`${fails.length ? 'FAIL' : 'pass'} ${id}${fails.length ? '\n   ' + fails.join('\n   ') : ''}`)
}
const look = (sel) =>
  page.evaluate((sel) => {
    const b = document.querySelector(sel)
    if (!b) return null
    const cs = getComputedStyle(b)
    return { h: Math.round(b.getBoundingClientRect().height), r: cs.borderRadius, fs: cs.fontSize, fw: cs.fontWeight }
  }, sel)
const pressText = (t) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('[data-tag-panel] button, [data-tag-slot] button, button[data-tag-save]')].find(
      (x) => x.textContent.trim() === t && !x.disabled && x.offsetParent !== null,
    )
    b?.click()
    return Boolean(b)
  }, t)
const savedCount = () => page.evaluate(() => document.querySelectorAll('[aria-label^="Rally "][aria-pressed]').length)

// Best + FA reference look
await fresh(page)
await tapRally(page, 1)
const bestLook = await look('[data-best-end="Winner"]')
await end(page, 'Winner')
await point(page, 'You')

// R25 Spine
{
  const fails = []
  await fresh(page, 'spine')
  for (let k = 0; k < 2; k++) {
    await tapRally(page, k + 2)
    await page.waitForTimeout(300)
    if (k === 0) {
      const l = await look('[data-idea-live] [data-cell="Winner"]')
      if (JSON.stringify(l) !== JSON.stringify(bestLook)) fails.push(`Spine look ${JSON.stringify(l)} vs Best ${JSON.stringify(bestLook)}`)
      await shot(page, `R25-spine${touch ? '' : '-desk'}`)
    }
    await page.click('[data-idea-live] [data-cell="Winner"]')
    await page.waitForTimeout(700)
  }
  const n = await savedCount()
  if (n !== 2) fails.push(`spine saved ${n}`)
  const bad = await fit(page)
  if (bad) fails.push(bad)
  report('R25 Spine', fails)
}

// R25 Shot by shot
{
  const fails = []
  await fresh(page, 'sequential')
  for (let k = 0; k < 2; k++) {
    await tapRally(page, 1)
    await page.waitForTimeout(1300)
    if (k === 0) {
      const l = await look('[data-won-by="me"]')
      if (!l || l.h !== bestLook.h || l.r !== bestLook.r) fails.push(`Shot by shot look ${JSON.stringify(l)} vs Best ${JSON.stringify(bestLook)}`)
      await shot(page, `R25-shotbyshot${touch ? '' : '-desk'}`)
    }
    for (let i = 0; i < 6 && (await savedCount()) < k + 1; i++) {
      for (const t of ['You', 'Winner']) await pressText(t)
      await page.waitForTimeout(300)
      await page.evaluate(() => document.querySelector('[data-tag-save]')?.click())
      await page.waitForTimeout(900)
    }
  }
  const n = await savedCount()
  if (n !== 2) fails.push(`shot by shot saved ${n}`)
  report('R25 Shot by shot', fails)
}

// R26 copy, over Best + FA states
{
  const fails = []
  const texts = []
  const grab = async (where) => texts.push([where, await page.evaluate(() => document.body.innerText)])
  await fresh(page)
  await tapRally(page, 1)
  await end(page, 'Winner')
  await point(page, 'You')
  await page.waitForTimeout(300)
  await grab('saved row')
  await tapRally(page, 10)
  await grab('End')
  await end(page, 'Winner')
  await point(page, 'You')
  await grab('mismatch')
  await fix(page, 'more')
  await grab('more')
  await fix(page, 'switch')
  await stroke(page, 'FH', 'Attack')
  await grab('serve')
  await serve(page, 'Short')
  await stroke(page, 'FH', 'Control')
  await stroke(page, 'FH', 'Control')
  await stroke(page, 'FH', 'Control')
  await grab('rally page')
  const banned = [/middle/i, /→|->|⟶|➜/, /—|–/, /does not match/i, /\bclip\b/i, /swipe|long press|long-press|drag|double tap/i]
  for (const [where, t] of texts) for (const re of banned) if (re.test(t)) fails.push(`${where}: ${re} in "${(t.match(re) || [''])[0]}"`)
  report('R26 copy', fails)
}

console.log(out.join('\n'))
console.log('errors', JSON.stringify(errors))
await browser.close()
