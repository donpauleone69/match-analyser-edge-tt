/**
 * Item 14 strict check: every shell control must carry a btn-kind-* class and match its height.
 * BASE=http://127.0.0.1:5174 npm run check:item14
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'

const VIEWPORTS = [
  { width: 390, height: 844, touch: true, label: '390×844-finger' },
  { width: 375, height: 667, touch: true, label: '375×667-finger' },
  { width: 1280, height: 800, touch: true, label: '1280×800-finger' },
  { width: 1280, height: 800, touch: false, label: '1280×800-mouse' },
]

const ROUTES = [
  { screen: 'Sign in', path: '/' },
  { screen: 'Home', path: '/home' },
  { screen: 'Find', path: '/find' },
  { screen: 'Account', path: '/account' },
  {
    screen: 'Insights',
    path: '/insights/summary',
    after: async (page, vp) => {
      if (vp.width < 768) {
        await page.getByRole('button', { name: /^Filter/ }).click()
        await page.waitForTimeout(250)
      }
    },
  },
  { screen: 'Match header and tabs', path: '/matches/m-partial/tag' },
  { screen: 'Match Details', path: '/matches/m-partial/details' },
  { screen: 'Tag page', path: '/matches/m-partial/tag' },
  { screen: 'Tag page (Start)', path: '/matches/m-ready/tag' },
  { screen: 'Match Insights', path: '/matches/m-partial/insights/summary' },
]

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const allFails = []
let checked = 0

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))

  for (const route of ROUTES) {
    await page.goto(BASE + route.path, { waitUntil: 'networkidle' })
    if (route.after) await route.after(page, vp)
    const result = await page.evaluate(
      ({ screen, viewportLabel, viewportHeight }) => {
        const KIND_CLASS = {
          main: 'btn-kind-main',
          control: 'btn-kind-control',
          field: 'btn-kind-field',
          textLink: 'btn-kind-text-link',
          tapPad: 'btn-kind-tap-pad',
        }
        function expectedHeight(kind, coarse, vh) {
          if (kind === 'main') return coarse ? 48 : 44
          if (kind === 'control' || kind === 'field') return coarse ? 44 : 36
          if (kind === 'textLink') return coarse ? 44 : null
          if (kind === 'tapPad') {
            if (!coarse) return 80
            return vh >= 700 ? 80 : 64
          }
          return null
        }
        const coarse = matchMedia('(pointer: coarse)').matches
        const fails = []
        function kindOf(el) {
          for (const [k, cls] of Object.entries(KIND_CLASS)) {
            if (el.classList.contains(cls)) return k
          }
          return null
        }
        function labelOf(el) {
          return (
            el.getAttribute('aria-label') ||
            el.getAttribute('placeholder') ||
            el.textContent ||
            el.tagName
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 48)
        }
        function visible(el) {
          const r = el.getBoundingClientRect()
          if (r.width < 4 || r.height < 4) return false
          const st = getComputedStyle(el)
          if (st.display === 'none' || st.visibility === 'hidden') return false
          if (el.getAttribute('aria-hidden') === 'true') return false
          return true
        }
        const nodes = [
          ...document.querySelectorAll(
            'button, select, input:not([type="hidden"]):not(.hidden), a[aria-label="Back"], nav[aria-label="Main"] a, nav[aria-label="Match sections"] a, nav[aria-label="Insight sections"] button, a.btn-kind-text-link'
          ),
        ].filter(visible)

        for (const el of nodes) {
          if (el.getAttribute('aria-label') === 'Close filters') continue
          const kind = kindOf(el)
          const lab = labelOf(el)
          const h = Math.round(el.getBoundingClientRect().height)
          const w = Math.round(el.getBoundingClientRect().width)
          if (!kind) {
            fails.push({ screen, viewport: viewportLabel, lab, issue: 'no-kind', h, w })
            continue
          }
          const want = expectedHeight(kind, coarse, viewportHeight)
          if (want !== null && h !== want) {
            fails.push({ screen, viewport: viewportLabel, lab, kind, issue: 'height', h, want, w })
          }
          if (el.classList.contains('btn-kind-square') && kind === 'control' && w !== h) {
            fails.push({ screen, viewport: viewportLabel, lab, kind, issue: 'not-square', h, w })
          }
        }
        return { count: nodes.length, fails }
      },
      { screen: route.screen, viewportLabel: vp.label, viewportHeight: vp.height }
    )
    checked += result.count
    allFails.push(...result.fails)
  }
  await ctx.close()
}

await browser.close()

const ok = allFails.length === 0
console.log(JSON.stringify({ ok, checked, failCount: allFails.length, fails: allFails.slice(0, 30) }, null, 2))
if (!ok) {
  console.error(`item14: ${allFails.length} failures (showing up to 30)`)
  process.exit(1)
}