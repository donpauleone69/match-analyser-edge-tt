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
  { screen: 'Matches', path: '/matches' },
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
  { screen: 'Tag set', path: '/matches/m-ready/tag/1', manyMains: true },
  { screen: 'Tag set finished', path: '/matches/m-partial/tag/1', manyMains: true },
  { screen: 'Tag set insights', path: '/matches/m-complete/tag/1', manyMains: true },
  {
    screen: 'Tag set finish match',
    path: '/matches/m-complete/details',
    manyMains: true,
    after: async (page) => {
      await page.locator('select[aria-label="Result"]').selectOption('')
      await page.getByRole('link', { name: 'Tag' }).click()
      await page.waitForSelector('text=Finish match', { timeout: 15000 })
    },
  },
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
        /** The tagging set screen only. The picture on that screen keeps the shared heights. */
        function onSetScreen(el) {
          if (!el.closest('.tag-set')) return false
          if (el.closest('.tag-picture')) return false
          return true
        }
        function expectedHeight(kind, coarse, vh, el) {
          const here = onSetScreen(el)
          if (kind === 'main') return coarse ? 48 : 44
          if (kind === 'control' || kind === 'field') {
            if (here) return coarse ? 40 : 32
            return coarse ? 44 : 36
          }
          if (kind === 'textLink') {
            if (!coarse) return null
            return here ? 40 : 44
          }
          if (kind === 'tapPad') {
            // One foot height on the set screen. Everywhere else, 64 under 700 high, else 80.
            if (here) return coarse ? 48 : 40
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
        // Rally Zone marks. They are 16px on purpose, not a shell control.
        if (el.hasAttribute('data-review-chip')) continue
        // Edit Set, Review and Edit Rally sit in a fixed zone row. The zone owns that height.
        if (!kindOf(el) && el.closest('.tag-rally, .tag-setzone')) continue
          const kind = kindOf(el)
          const lab = labelOf(el)
          const h = Math.round(el.getBoundingClientRect().height)
          const w = Math.round(el.getBoundingClientRect().width)
          // The strip under the picture is 28 high and is not one of the button kinds.
          if (el.getAttribute('aria-label') === 'Match timeline') {
            if (h !== 28) fails.push({ screen, viewport: viewportLabel, lab, issue: 'height', h, want: 28, w })
            continue
          }
          // The tap zone on the set screen fills the band. It is not one of the button kinds.
          if (el.hasAttribute('data-tag-zone')) {
            if (kind) fails.push({ screen, viewport: viewportLabel, lab, kind, issue: 'zone-has-kind', h, w })
            if (h < 160) fails.push({ screen, viewport: viewportLabel, lab, issue: 'zone-too-small', h, want: '>= 160', w })
            continue
          }
          if (!kind) {
            fails.push({ screen, viewport: viewportLabel, lab, issue: 'no-kind', h, w })
            continue
          }
          const want = expectedHeight(kind, coarse, viewportHeight, el)
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

    // One main action per page (Sign in is a multi-card stub and is exempt).
    if (route.path !== '/' && !route.manyMains) {
      const mainCount = await page.evaluate(() =>
        [...document.querySelectorAll('.btn-kind-main')].filter((el) => {
          const r = el.getBoundingClientRect()
          if (r.width < 4 || r.height < 4) return false
          const st = getComputedStyle(el)
          return st.display !== 'none' && st.visibility !== 'hidden'
        }).length
      )
      if (mainCount > 1) {
        allFails.push({
          screen: route.screen,
          viewport: vp.label,
          issue: 'too-many-main',
          count: mainCount,
        })
      }
    }
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