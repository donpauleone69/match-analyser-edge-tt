/**
 * Item 14 fast check: sample buttons on each shell screen; heights must be 36, 44, 48, 64, or 80.
 * Run: BASE=http://127.0.0.1:5174 node proto/scripts/item14-heights.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const ALLOWED = new Set([36, 44, 48, 64, 80])

async function measure(page) {
  return page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('button, a[aria-label="Back"], nav[aria-label="Main"] a')) {
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const label = (
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-current') ||
        el.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 48)
      out.push({ label, h: Math.round(r.height), w: Math.round(r.width) })
    }
    return out
  })
}

function classify(h, coarse) {
  if (h === 80) return 'tapPad'
  if (h === 64) return 'tapPad-short'
  if (h === 48) return 'main-finger'
  if (h === 44) return coarse ? 'main-mouse-or-control-finger' : 'main-mouse'
  if (h === 36) return 'control-mouse'
  return `unexpected-${h}`
}

async function runViewport(browser, { width, height, coarse, touch, name }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
  await page.goto(BASE + '/home', { waitUntil: 'networkidle' })

  const screens = [
    { path: '/home', name: 'Home' },
    { path: '/find', name: 'Find' },
    { path: '/account', name: 'Account' },
    { path: '/insights/summary', name: 'Insights' },
  ]
  const rows = []
  let bad = 0

  for (const s of screens) {
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' })
    const buttons = await measure(page)
    const main = buttons.find((b) => /Continue|New match|All matches|Go to Tag/i.test(b.label))
    const control = buttons.find((b) => /^(New|Find|Filter|Back)/i.test(b.label) || b.label === 'Back')
    for (const b of [main, control].filter(Boolean)) {
      const ok = ALLOWED.has(b.h)
      if (!ok) bad++
      rows.push({
        screen: s.name,
        viewport: name,
        label: b.label,
        kind: classify(b.h, coarse),
        height: b.h,
        ok,
      })
    }
  }

  await page.goto(BASE + '/home', { waitUntil: 'networkidle' })
  const firstMatch = await page.evaluate(() => {
    const a = document.querySelector('ul li a[href*="/matches/"]')
    return a?.getAttribute('href')?.match(/\/matches\/([^/]+)/)?.[1] ?? null
  })
  if (firstMatch) {
    for (const [suffix, screen] of [
      ['/details', 'Match Details'],
      ['/tag', 'Match Tag'],
      ['/insights/summary', 'Match Insights'],
    ]) {
      await page.goto(`${BASE}/matches/${firstMatch}${suffix}`, { waitUntil: 'networkidle' })
      const buttons = await measure(page)
      const main = buttons.find((b) =>
        /Continue set|Start|Finish match|Next: Tag|Go to Tag/i.test(b.label)
      )
      const back = buttons.find((b) => b.label === 'Back')
      const tab = buttons.find((b) => /^(Insights|Details|Tag)$/i.test(b.label))
      for (const [b, role] of [
        [main, 'main'],
        [back, 'back'],
        [tab, 'tab'],
      ]) {
        if (!b) continue
        const ok = ALLOWED.has(b.h)
        if (!ok) bad++
        rows.push({
          screen,
          viewport: name,
          label: `${role}: ${b.label}`,
          kind: classify(b.h, coarse),
          height: b.h,
          ok,
        })
      }
    }
  }

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const signIn = (await measure(page)).find((b) => /Fake sign-in/i.test(b.label))
  if (signIn) {
    const ok = ALLOWED.has(signIn.h)
    if (!ok) bad++
    rows.push({
      screen: 'Sign in',
      viewport: name,
      label: signIn.label,
      kind: classify(signIn.h, coarse),
      height: signIn.h,
      ok,
    })
  }

  await ctx.close()
  return { rows, bad }
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const configs = [
  { width: 390, height: 844, coarse: true, touch: true, name: '390x844-finger' },
  { width: 1280, height: 800, coarse: false, touch: false, name: '1280x800-mouse' },
  { width: 1280, height: 800, coarse: true, touch: true, name: '1280x800-finger' },
]

const allRows = []
let totalBad = 0
for (const cfg of configs) {
  const { rows, bad } = await runViewport(browser, cfg)
  allRows.push(...rows)
  totalBad += bad
}
await browser.close()

console.log(JSON.stringify({ ok: totalBad === 0, rows: allRows }, null, 2))
process.exit(totalBad ? 1 : 0)