/**
 * Item 14: per-screen kind heights from DOM (running app).
 * BASE=http://127.0.0.1:5174 node proto/scripts/item14-measure-screens.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'

function classify(h, finger) {
  if (h === 80 || h === 64) return 'tapPad'
  if (h === 48) return 'main'
  if (h === 44) return finger ? 'control' : 'main'
  if (h === 36) return 'control'
  return `unexpected-${h}`
}

async function heightsByKind(page, finger) {
  const sel =
    'button, nav[aria-label="Main"] a, nav[aria-label="Match sections"] a, nav[aria-label="Insight sections"] button, a[aria-label="Back"]'
  const raw = await page.evaluate((selector) => {
    const hs = new Set()
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect()
      if (r.height < 8) continue
      const st = getComputedStyle(el)
      if (st.display === 'none' || st.visibility === 'hidden') continue
      hs.add(Math.round(r.height))
    }
    return [...hs]
  }, sel)
  const map = {}
  for (const h of raw.sort((a, b) => b - a)) {
    const k = classify(h, finger)
    if (!map[k]) map[k] = h
  }
  return map
}

async function run(browser, { width, height, touch, label }) {
  const finger = touch
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
  await page.goto(BASE + '/home', { waitUntil: 'networkidle' })
  const firstMatch = await page.evaluate(() => {
    const a = document.querySelector('ul li a[href*="/matches/"]')
    return a?.getAttribute('href')?.match(/\/matches\/([^/]+)/)?.[1] ?? 'm-partial'
  })

  const routes = [
    { screen: 'Sign in', path: '/' },
    { screen: 'Home', path: '/home' },
    { screen: 'Find', path: '/find' },
    { screen: 'Account', path: '/account' },
    { screen: 'Insights', path: '/insights/summary' },
    { screen: 'Match header and tabs', path: '/matches/m-partial/tag' },
    { screen: 'Match Details', path: '/matches/m-partial/details' },
    { screen: 'Tag page', path: '/matches/m-partial/tag' },
    { screen: 'Back (PageHeader)', path: '/find' },
    { screen: 'Bottom bar', path: '/home' },
  ]

  const rows = []
  for (const { screen, path } of routes) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    if (screen === 'Back (PageHeader)') {
      const h = await page.evaluate(() =>
        Math.round(document.querySelector('a[aria-label="Back"]')?.getBoundingClientRect().height ?? 0)
      )
      rows.push({ screen, viewport: label, kind: 'control', height: h })
      continue
    }
    if (screen === 'Bottom bar') {
      const h = await page.evaluate((phone) => {
        const links = [...document.querySelectorAll('nav[aria-label="Main"] a')].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.height >= 8
        })
        if (phone) {
          const bottom = links.filter((el) => el.getBoundingClientRect().bottom > 700)
          return bottom[0] ? Math.round(bottom[0].getBoundingClientRect().height) : 0
        }
        const top = links.filter((el) => el.getBoundingClientRect().top < 80)
        return top[0] ? Math.round(top[0].getBoundingClientRect().height) : 0
      }, touch)
      rows.push({
        screen,
        viewport: label,
        kind: 'control',
        height: h,
        note: touch ? 'phone fixed bottom nav' : 'desktop top nav',
      })
      continue
    }
    const kinds = await heightsByKind(page, finger)
    for (const [kind, height] of Object.entries(kinds)) {
      rows.push({ screen, viewport: label, kind, height })
    }
  }

  await ctx.close()
  return rows
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const finger = await run(browser, { width: 390, height: 844, touch: true, label: '390×844 finger' })
const mouse = await run(browser, { width: 1280, height: 800, touch: false, label: '1280×800 mouse' })
await browser.close()

console.log(JSON.stringify({ finger, mouse }, null, 2))