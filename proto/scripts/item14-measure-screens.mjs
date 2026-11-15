/**
 * Item 14 table helper: max main/control heights per screen from DOM.
 * BASE=http://127.0.0.1:5174 node scripts/item14-measure-screens.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const VIEWPORTS = [
  { width: 390, height: 844, touch: true, label: '390×844 finger' },
  { width: 375, height: 667, touch: true, label: '375×667 finger' },
  { width: 1280, height: 800, touch: true, label: '1280×800 finger' },
  { width: 1280, height: 800, touch: false, label: '1280×800 mouse' },
]

const ROUTES = [
  { screen: 'Sign in', path: '/' },
  { screen: 'Home', path: '/home' },
  { screen: 'Find', path: '/find' },
  { screen: 'Account', path: '/account' },
  { screen: 'Insights', path: '/insights/summary' },
  { screen: 'Match header and tabs', path: '/matches/m-partial/tag' },
  { screen: 'Match Details', path: '/matches/m-partial/details' },
  { screen: 'Tag page', path: '/matches/m-partial/tag' },
  { screen: 'Tag page (Start)', path: '/matches/m-ready/tag' },
  { screen: 'Back', path: '/find' },
  { screen: 'Bottom bar', path: '/home' },
]

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const out = {}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
  out[vp.label] = []

  for (const { screen, path } of ROUTES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
  const kinds = await page.evaluate(() => {
    const pick = (cls) => {
      const els = [...document.querySelectorAll(`.${cls}`)].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.height > 8 && getComputedStyle(el).display !== 'none'
      })
      return els.length ? Math.max(...els.map((e) => Math.round(e.getBoundingClientRect().height))) : null
    }
    return { main: pick('btn-kind-main'), control: pick('btn-kind-control'), field: pick('btn-kind-field') }
  })
    out[vp.label].push({ screen, ...kinds })
  }
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(out, null, 2))