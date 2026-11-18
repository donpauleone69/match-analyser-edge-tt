import { chromium } from '../node_modules/playwright-core/index.mjs'

export const BASE = 'http://127.0.0.1:5174'

export async function launch({ width = 393, height = 660, touch = true, speed = '4' } = {}) {
  const errors = []
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
  const ctx = await browser.newContext(touch ? { viewport: { width, height }, hasTouch: true, isMobile: true } : { viewport: { width, height } })
  await ctx.addInitScript((s) => localStorage.setItem('proto-test-speed', s), speed)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
  return { browser, page, errors }
}

export async function fresh(page, flow = '') {
  await page.goto(`${BASE}/matches/m-ready/tag/1${flow ? `?flow=${flow}` : ''}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k !== 'proto-test-speed') localStorage.removeItem(k)
  })
  await page.goto(`${BASE}/matches/m-ready/tag/1${flow ? `?flow=${flow}` : ''}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-flow-toggle]')
}

/** n contacts, then wait for the idle close. */
export async function tapRally(page, n) {
  const playing = await page.evaluate(() => document.querySelector('.tag-set')?.dataset.playing === 'true')
  if (!playing) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(250)
  }
  for (let i = 0; i < n; i++) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(160)
  }
  await page.waitForFunction(() => document.querySelector('.tag-set')?.dataset.tagMode === 'tagging', { timeout: 10000 })
  await page.waitForTimeout(150)
}

export async function state(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-best-panel]')
    const chips = [...document.querySelectorAll('[data-best-chip]')]
    const parts = [...document.querySelectorAll('[data-best-part]')].map((b) => `${b.dataset.label}:${b.dataset.from}-${b.dataset.to}`)
    const strokeBtns = [...document.querySelectorAll('[data-stroke-shot] [data-cell]')].map((b) => b.textContent)
    const tagSet = document.querySelector('.tag-set')
    return {
      mode: tagSet?.dataset.tagMode,
      step: panel?.dataset.bestStep ?? null,
      page: panel?.dataset.bestPage ?? null,
      marks: chips.map((c) => `${c.dataset.bestChip}${{ now: '*', done: '✓', todo: '~', off: '.', '': '' }[c.dataset.bestMark] ?? '?'}`).join(' '),
      parts: parts.join(' '),
      line: document.querySelector('[data-best-line]')?.textContent ?? '',
      strokes: strokeBtns.join('|'),
      strokeShot: document.querySelector('[data-stroke-shot]')?.dataset.strokeShot ?? '',
      who: [...document.querySelectorAll('[data-best-first]')].map((b) => b.textContent).join('|'),
      saved: Boolean(document.querySelector('[data-best-saved]')),
      rallies: document.querySelectorAll('[aria-label^="Rally "][aria-pressed]').length,
      score: tagSet?.dataset.bestScore ?? '',
      contacts: tagSet?.dataset.contacts ?? '',
      loop: [tagSet?.dataset.bestA, tagSet?.dataset.bestB, tagSet?.dataset.rate, tagSet?.dataset.playing].join(' '),
      fixes: [...document.querySelectorAll('[data-best-fix]')].map((b) => b.textContent).join('|'),
      hint: document.querySelector('[data-point-hint]')?.textContent ?? '',
      toss: Boolean(document.querySelector('[data-best-toss-offer]')),
      notes: [...document.querySelectorAll('[data-best-end-note],[data-best-serve-note]')].map((n) => n.textContent).join('|'),
    }
  })
}

export async function click(page, sel) {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, sel)
  await page.waitForTimeout(220)
  return ok
}

export const end = (page, e) => click(page, `[data-best-end="${e}"]`)
export const point = (page, name) => click(page, `[data-point-to="${name}"]`)
export const serve = (page, d) => click(page, `[data-best-serve="${d}"]`)
export const stroke = (page, wing, s) => click(page, `[data-stroke-shot] [data-wing="${wing}"][data-stroke="${s}"]`)
export const cell = (page, k) => click(page, `[data-best-chip="${k}"]`)
export const fix = (page, f) => click(page, `[data-best-fix="${f}"]`)
export const who = (page, w) => click(page, `[data-best-first="${w}"]`)
export const part = (page, p) => click(page, `[data-best-part="${p}"]`)

/** No scroll in the panes, and the cells and fix rows do not overflow. */
export async function fit(page) {
  return page.evaluate(() => {
    const bad = []
    for (const sel of ['.tag-set', '.tag-entry', '[data-tag-body]']) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.scrollHeight > el.clientHeight + 1) bad.push(`${sel} ${el.scrollHeight}>${el.clientHeight}`)
      }
    }
    for (const sel of ['[data-best-cells]', '[data-best-fixes]', '[data-best-more]']) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.scrollWidth > el.clientWidth + 1) bad.push(`${sel} w ${el.scrollWidth}>${el.clientWidth}`)
      }
    }
    for (const b of document.querySelectorAll('[data-best-part]')) {
      const label = b.firstElementChild
      if (label && label.getBoundingClientRect().width > b.clientWidth + 1) bad.push(`part ${b.dataset.bestPart} label ${Math.round(label.getBoundingClientRect().width)}>${b.clientWidth}`)
    }
    for (const h of document.querySelectorAll('.tag-set header, header h1')) {
      if (h.scrollWidth > h.clientWidth + 1) bad.push(`header w ${h.scrollWidth}>${h.clientWidth}`)
    }
    return bad.join('; ')
  })
}

export const shot = (page, name) => page.screenshot({ path: `/tmp/shots/${name}.png` })
