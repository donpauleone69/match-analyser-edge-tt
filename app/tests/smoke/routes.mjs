/** Route tour for page smoke screenshots and URL assertions. */

export const VIEWPORTS = [
  { name: '393x660', width: 393, height: 660 },
  { name: '1440x912', width: 1440, height: 912 },
]

export const ROUTES = [
  { id: '01', slug: 'gate', path: '/' },
  { id: '02', slug: 'matches', path: '/matches' },
  { id: '03', slug: 'm-complete-insights', path: '/matches/m-complete/insights' },
  { id: '04', slug: 'm-complete-details', path: '/matches/m-complete/details' },
  { id: '05', slug: 'm-complete-tag', path: '/matches/m-complete/tag' },
  { id: '06', slug: 'm-complete-tag-5', path: '/matches/m-complete/tag/5' },
  { id: '07', slug: 'm-partial-insights', path: '/matches/m-partial/insights' },
  { id: '08', slug: 'm-partial-details', path: '/matches/m-partial/details' },
  { id: '09', slug: 'm-partial-tag', path: '/matches/m-partial/tag' },
  { id: '10', slug: 'm-partial-tag-2', path: '/matches/m-partial/tag/2' },
  { id: '11', slug: 'm-new-tag', path: '/matches/m-new/tag' },
  { id: '12', slug: 'm-ready-tag', path: '/matches/m-ready/tag' },
  { id: '13', slug: 'm-h3-tag', path: '/matches/m-h3/tag' },
  { id: '14', slug: 'm-h10-tag', path: '/matches/m-h10/tag' },
  { id: '15', slug: 'insights', path: '/insights' },
  { id: '16', slug: 'account', path: '/account' },
]

export const URL_ASSERTIONS = [
  { from: '/matches/m-complete', pathname: '/matches/m-complete/insights', search: '' },
  { from: '/matches/m-new', pathname: '/matches/m-new/tag', search: '' },
  { from: '/no-such-route', pathname: '/', search: '' },
]

export function contextOptions(vp) {
  return {
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    hasTouch: vp.width < 768,
    locale: 'en-GB',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  }
}

/**
 * The document itself does not scroll. Pick the overflow-y auto/scroll element
 * with the largest scrollHeight - clientHeight (a 1px remainder is not a step).
 * s0 is scrollTop 0. Then one shot per clientHeight, runFor(300) after each move.
 */
async function placeScroll(page, top) {
  return page.evaluate((next) => {
    const marked = document.querySelector('[data-smoke-scroller]')
    let el = marked
    if (!el) {
      let best = null
      let bestExtra = 1
      for (const node of document.querySelectorAll('*')) {
        const oy = getComputedStyle(node).overflowY
        if (oy !== 'auto' && oy !== 'scroll') continue
        const extra = node.scrollHeight - node.clientHeight
        if (extra > bestExtra) {
          best = node
          bestExtra = extra
        }
      }
      el = best
      if (el) el.setAttribute('data-smoke-scroller', '')
    }
    if (!el) return { hasScroller: false, top: 0, clientHeight: 0, max: 0 }
    if (next !== null) el.scrollTop = next
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    return {
      hasScroller: max > 1,
      top: el.scrollTop,
      clientHeight: el.clientHeight,
      max,
    }
  }, top)
}

async function captureScroll(page, baseName, prepare, shoot) {
  const names = []
  let state = await placeScroll(page, 0)
  let step = 0
  while (true) {
    // Font first, then the post-scroll settle, so the reflow is inside this runFor.
    await prepare(page)
    await page.clock.runFor(300)
    const name = `${baseName}-s${step}.png`
    await shoot(name)
    names.push(name)
    if (!state.hasScroller || state.top >= state.max - 0.5) break
    const next = Math.min(state.top + state.clientHeight, state.max)
    if (next <= state.top + 0.5) break
    state = await placeScroll(page, next)
    step += 1
    if (step > 40) throw new Error(`too many scroll steps at ${baseName}`)
  }
  return names
}

export async function captureRoutes(page, base, vp, prepare, shoot) {
  const names = []
  for (const route of ROUTES) {
    await page.goto(`${base}${route.path}`, { waitUntil: 'load' })
    await prepare(page)
    await page.clock.runFor(1000)
    const taken = await captureScroll(page, `${vp.name}/${route.id}-${route.slug}`, prepare, shoot)
    names.push(...taken)
    console.log(`${vp.name} ${route.path} ${taken.length} shot${taken.length === 1 ? '' : 's'}`)
  }
  return names
}

export async function assertUrls(page, base) {
  for (const item of URL_ASSERTIONS) {
    await page.goto(`${base}${item.from}`, { waitUntil: 'load' })
    await page.clock.runFor(200)
    const url = new URL(page.url())
    const got = `${url.pathname}${url.search}`
    const want = `${item.pathname}${item.search}`
    if (got !== want) throw new Error(`url ${item.from} -> ${got}, expected ${want}`)
  }
}
