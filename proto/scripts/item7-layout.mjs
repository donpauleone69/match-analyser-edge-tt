/**
 * Item 7: the Tag set screen does not scroll, nothing is cut off or overlapping,
 * and the big button stays at the same pixel through a rally.
 * BASE=http://127.0.0.1:5174 npm run check:item7
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const SHOTS = '/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/proto-tagging-pass-3'
mkdirSync(SHOTS, { recursive: true })

const VIEWPORTS = [
  { width: 390, height: 844, touch: true, file: 'f-390x844.png' },
  { width: 390, height: 664, touch: true, file: 'f-390x664.png' },
  { width: 375, height: 667, touch: true, file: 'f-375x667.png' },
  { width: 820, height: 1180, touch: true, file: 'f-820x1180.png' },
  { width: 1180, height: 820, touch: true, file: 'f-1180x820.png' },
  { width: 1280, height: 800, touch: false, file: 'f-1280x800.png' },
]

const STEPS = [
  'tapping',
  'result',
  'end shot details',
  'pick first attack',
  'first attack details',
  'Ready',
  'editing a saved rally',
  'Add contact on',
]

function note(fails, ok, msg) {
  console.log(`${ok ? 'ok' : 'FAIL'} ${msg}`)
  if (!ok) fails.push(msg)
}

async function readStage(page) {
  return page.evaluate(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage ?? '')
}

async function pressCell(page, label) {
  const hit = await page.evaluate((name) => {
    const el = [...document.querySelectorAll('[data-shot-panel] [data-cell]')].find(
      (b) => b.getAttribute('data-cell') === name
    )
    if (!el) return false
    el.click()
    return true
  }, label)
  if (!hit) return false
  await page.waitForTimeout(120)
  return true
}

/** Layout facts for one moment. */
async function measure(page) {
  return page.evaluate(() => {
    const view = document.documentElement
    const screen = document.querySelector('.tag-set')
    const body = document.querySelector('[data-tag-body]')
    const box = document.querySelector('[data-details-box]')
    const pic = document.querySelector('.tag-picture')
    const slotBtn = document.querySelector(
      '[data-tag-slot] [data-tap-pad], [data-tag-slot] [data-tap-add], [data-tag-slot] [data-tag-fa], [data-tag-slot] [data-tag-save]'
    )
    const rows = [...document.querySelectorAll('[data-shot-panel] [data-row]')].filter((el) => {
      const st = getComputedStyle(el)
      return st.display !== 'none'
    })
    const panel = document.querySelector('[data-shot-panel]')
    const wide = getComputedStyle(screen).flexDirection === 'row'
    const del = document.querySelector('[data-action="delete-rally"]')
    const warn = document.querySelector('[data-switch-warning]')

    function clipped(el) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return null
      let node = el.parentElement
      while (node && node !== document.body) {
        const st = getComputedStyle(node)
        if (st.overflow === 'hidden' || st.overflowX === 'hidden' || st.overflowY === 'hidden') {
          const b = node.getBoundingClientRect()
          const cut =
            r.top < b.top - 1 || r.left < b.left - 1 || r.bottom > b.bottom + 1 || r.right > b.right + 1
          if (cut) {
            return {
              lab: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
              top: Math.round(r.top),
              bottom: Math.round(r.bottom),
              boxTop: Math.round(b.top),
              boxBottom: Math.round(b.bottom),
            }
          }
        }
        node = node.parentElement
      }
      if (r.bottom > window.innerHeight + 1 || r.right > window.innerWidth + 1 || r.top < -1 || r.left < -1) {
        return {
          lab: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          off: true,
        }
      }
      return null
    }

    const controls = [...document.querySelectorAll('button, a[aria-label="Back"]')].filter((el) => {
      if (el.hasAttribute('data-late-tap')) return false
      const r = el.getBoundingClientRect()
      const st = getComputedStyle(el)
      return r.width > 4 && r.height > 4 && st.display !== 'none' && st.visibility !== 'hidden'
    })
    const cuts = controls.map(clipped).filter(Boolean)

    const rects = controls.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        lab: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32),
        t: r.top,
        l: r.left,
        b: r.bottom,
        right: r.right,
        el,
      }
    })
    const overlaps = []
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        if (controls[i].contains(controls[j]) || controls[j].contains(controls[i])) continue
        const a = rects[i]
        const c = rects[j]
        const w = Math.min(a.right, c.right) - Math.max(a.l, c.l)
        const h = Math.min(a.b, c.b) - Math.max(a.t, c.t)
        if (w > 2 && h > 2) overlaps.push(`${a.lab} × ${c.lab} (${Math.round(w)}×${Math.round(h)})`)
      }
    }

    const warnCut =
      warn && (warn.scrollHeight > warn.clientHeight + 2 || warn.scrollWidth > warn.clientWidth + 2)
        ? {
            scroll: warn.scrollHeight,
            client: warn.clientHeight,
            scrollW: warn.scrollWidth,
            clientW: warn.clientWidth,
            text: warn.textContent.replace(/\s+/g, ' ').trim(),
          }
        : null

    return {
      pageScroll: view.scrollHeight - view.clientHeight,
      screenScroll: screen ? screen.scrollHeight - screen.clientHeight : -1,
      bodyScroll: body ? body.scrollHeight - body.clientHeight : -1,
      bodyH: body ? Math.round(body.clientHeight) : 0,
      boxTop: box ? Math.round(box.getBoundingClientRect().top) : null,
      btnTop: slotBtn ? Math.round(slotBtn.getBoundingClientRect().top) : null,
      btnH: slotBtn ? Math.round(slotBtn.getBoundingClientRect().height) : null,
      picH: pic ? Math.round(pic.getBoundingClientRect().height) : 0,
      picW: pic ? Math.round(pic.getBoundingClientRect().width) : 0,
      wide,
      rows: rows.length,
      page: panel?.getAttribute('data-page') ?? '',
      fit: body?.getAttribute('data-fit') ?? '',
      delTop: del ? Math.round(del.getBoundingClientRect().top) : null,
      delBottom: del ? Math.round(del.getBoundingClientRect().bottom) : null,
      cuts,
      overlaps: overlaps.slice(0, 6),
      warnCut,
    }
  })
}

async function shot(page, file) {
  await page.screenshot({ path: `${SHOTS}/${file}` })
}

async function driveRally(page, fails, vp) {
  await page.goto(`${BASE}/matches/m-ready/tag/1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tap-pad]')
  const tops = []
  const boxes = []

  const snap = async (step) => {
    const m = await measure(page)
    tops.push(m.btnTop)
    boxes.push(m.boxTop)
    const scrollOk = m.pageScroll <= 1 && m.screenScroll <= 1 && m.bodyScroll <= 1
    note(fails, scrollOk, `${vp.file} ${step}: no scroll (page ${m.pageScroll}, screen ${m.screenScroll}, box ${m.bodyScroll}, body ${m.bodyH})`)
    note(fails, m.cuts.length === 0, `${vp.file} ${step}: nothing cut off${m.cuts[0] ? ` (${m.cuts[0].lab} ${m.cuts[0].top}-${m.cuts[0].bottom})` : ''}`)
    note(fails, m.overlaps.length === 0, `${vp.file} ${step}: no overlap${m.overlaps[0] ? ` (${m.overlaps[0]})` : ''}`)
    note(
      fails,
      m.wide || m.picH <= vp.height * 0.45 + 1,
      `${vp.file} ${step}: picture ${m.picW}×${m.picH}${m.wide ? '' : ' ≤ 45%'}`
    )
    const wantWide = vp.width >= 700 && vp.width > vp.height
    note(fails, m.wide === wantWide, `${vp.file} ${step}: ${m.wide ? 'two columns' : 'one column'}`)
    return m
  }

  await page.click('[data-tap-pad]')
  await page.waitForTimeout(180)
  await page.click('[data-tap-pad]')
  let sawTap = false
  if ((await readStage(page)) === 'contacts') {
    await snap('tapping')
    sawTap = true
  }
  for (let i = 0; i < 3; i++) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(70)
  }
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'result',
    { timeout: 8000 }
  ).catch(() => {})
  let stage = await readStage(page)
  if (stage !== 'result' && stage !== 'tapping' && stage !== '') {
    /* closed already */
  }
  if (stage === '' || stage === 'contacts') {
    await page.waitForTimeout(600)
    stage = await readStage(page)
  }
  // Still tapping if the idle close has not landed.
  if (!sawTap) await snap('tapping')
  note(fails, stage === 'result' || stage === 'endShot', `${vp.file} reached result (got ${stage || 'none'})`)

  await snap('result')
  // The panel ignores presses for a moment after the rally closes.
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-tag-panel]')
    if (!panel) return true
    return Number(getComputedStyle(panel).opacity) > 0.9
  }, { timeout: 3000 }).catch(() => {})
  let long = await pressCell(page, 'Long')
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot',
    { timeout: 1500 }
  ).catch(() => {})
  if ((await readStage(page)) !== 'endShot') long = await pressCell(page, 'Long')
  note(fails, long, `${vp.file} press Long`)
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot',
    { timeout: 4000 }
  ).catch(() => {})
  const end = await snap('end shot details')
  await shot(page, vp.file)
  note(
    fails,
    end.rows <= 3 || end.fit === 'all',
    `${vp.file} end shot shows ${end.rows} rows (fit ${end.fit})`
  )

  const wing = await pressCell(page, 'BH')
  const stroke = await pressCell(page, 'Loop')
  note(fails, wing && stroke, `${vp.file} wing and stroke`)
  await page.waitForFunction(
    () => {
      const s = document.querySelector('[data-tag-stage]')?.dataset.tagStage
      return s === 'pickFa' || s === 'ready' || s === 'faShot'
    },
    { timeout: 4000 }
  ).catch(() => {})
  stage = await readStage(page)
  if (stage === 'pickFa') {
    await snap('pick first attack')
    await page.waitForFunction(() => !document.querySelector('[data-late-tap]'), { timeout: 3000 }).catch(() => {})
    // The press marks the shot on screen. Wait until that is past the serve.
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-tag-stage]')
      const time = Number(root?.dataset.time || 0)
      const contacts = (root?.dataset.contacts || '').split(',').filter(Boolean).map(Number)
      return contacts.filter((c) => c <= time + 0.05).length >= 2
    }, { timeout: 4000 }).catch(() => {})
    await page.locator('[data-tag-fa]').click()
    await page.waitForFunction(() => {
      const s = document.querySelector('[data-tag-stage]')?.dataset.tagStage
      return s === 'faShot' || s === 'ready'
    }, { timeout: 3000 }).catch(() => {})
    stage = await readStage(page)
  } else {
    await snap('pick first attack')
  }
  note(fails, stage === 'faShot' || stage === 'ready', `${vp.file} after first attack (got ${stage})`)
  if (stage === 'faShot') {
    await pressCell(page, 'FH')
    await pressCell(page, 'Flick')
    await page.waitForTimeout(200)
  }
  await snap('first attack details')
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'ready',
    { timeout: 4000 }
  ).catch(() => {})
  stage = await readStage(page)
  const ready = await snap('Ready')
  note(fails, stage === 'ready', `${vp.file} ready (got ${stage})`)

  // Worst case: open the end shot. Six rows when the box has 310, otherwise three plus More.
  await page.locator('[aria-label^="Shot"]').last().click()
  await page.waitForTimeout(150)
  await pressCell(page, 'Review')
  const worst = await measure(page)
  if (vp.height >= 800 && vp.width < vp.height) {
    note(fails, worst.rows >= 6 && worst.bodyScroll <= 1, `${vp.file} six rows on screen (${worst.rows}, body ${worst.bodyH}, scroll ${worst.bodyScroll})`)
  } else if (worst.fit === 'three') {
    const more = await page.locator('[data-more-rows]').count()
    note(fails, more === 1 && worst.rows === 3 && worst.bodyScroll <= 1, `${vp.file} three rows plus More (${worst.rows} rows, more ${more})`)
  } else {
    note(fails, worst.rows >= 6 && worst.bodyScroll <= 1, `${vp.file} rows fit (${worst.rows}, fit ${worst.fit}, body ${worst.bodyH})`)
  }

  const btnSame = tops.every((t) => t !== null && Math.abs(t - tops[0]) <= 1)
  const boxSame = boxes.every((t) => t !== null && Math.abs(t - boxes[0]) <= 1)
  note(fails, btnSame, `${vp.file} big button stays at ${tops[0]} (${tops.join(',')})`)
  note(fails, boxSame, `${vp.file} details box stays at ${boxes[0]} (${boxes.join(',')})`)
  return ready
}

async function driveEdit(page, fails, vp) {
  await page.goto(`${BASE}/matches/m-partial/tag/2`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const listBtn = page.getByRole('button', { name: /^Rallies/ })
  if (await listBtn.count()) {
    const visible = await listBtn.first().isVisible()
    if (visible) await listBtn.first().click()
  }
  const rally = page.getByRole('button', { name: 'Rally 1' })
  await rally.first().click()
  await page.waitForTimeout(300)
  const m = await measure(page)
  note(fails, m.pageScroll <= 1 && m.bodyScroll <= 1, `${vp.file} editing: no scroll`)
  note(fails, m.delBottom !== null && m.delBottom <= vp.height + 1, `${vp.file} Delete rally on screen (${m.delTop}-${m.delBottom})`)
  note(fails, m.cuts.length === 0, `${vp.file} editing: nothing cut off`)
  const add = page.locator('[data-action="add-contact"]')
  if (await add.count()) {
    await add.click()
    await page.waitForTimeout(200)
    const a = await measure(page)
    note(fails, a.pageScroll <= 1 && a.bodyScroll <= 1, `${vp.file} Add contact: no scroll`)
    note(
      fails,
      a.btnTop !== null && m.btnTop !== null && Math.abs(a.btnTop - m.btnTop) <= 1,
      `${vp.file} Add contact: button stays (${m.btnTop} then ${a.btnTop})`
    )
  } else {
    note(fails, false, `${vp.file} Add contact button missing`)
  }
}

async function driveWarn(page, fails, vp) {
  if (vp.file !== 'f-390x844.png') return
  await page.goto(`${BASE}/matches/m-partial/tag/2`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tag-switch]')
  const before = await measure(page)
  await page.click('[data-tag-switch]')
  await page.waitForTimeout(150)
  const after = await measure(page)
  note(
    fails,
    before.btnTop !== null && after.btnTop === before.btnTop && after.boxTop === before.boxTop,
    `warning does not move the button (${before.btnTop}->${after.btnTop}) or the box (${before.boxTop}->${after.boxTop})`
  )
  const text = await page.locator('[data-switch-warning]').innerText()
  note(
    fails,
    /due to serve/.test(text) && /will be marked to check/.test(text),
    `warning keeps its words (${text.replace(/\s+/g, ' ')})`
  )
  note(
    fails,
    !after.warnCut,
    `warning text fits${after.warnCut ? ` (height ${after.warnCut.scroll - after.warnCut.client}px, width ${after.warnCut.scrollW - after.warnCut.clientW}px)` : ''}`
  )
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const fails = []
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  })
  await ctx.addInitScript(() => localStorage.setItem('proto-test-speed', '8'))
  const page = await ctx.newPage()
  console.log(`\n== ${vp.width}×${vp.height} ${vp.touch ? 'finger' : 'mouse'} ==`)
  try {
    await driveRally(page, fails, vp)
    await driveEdit(page, fails, vp)
    await driveWarn(page, fails, vp)
  } catch (err) {
    note(fails, false, `${vp.file} threw ${err.message}`)
  }
  await ctx.close()
}

await browser.close()
console.log(`\n${fails.length === 0 ? 'PASS' : 'FAIL'} ${fails.length} problems`)
if (fails.length) {
  for (const f of fails) console.log(' - ' + f)
  process.exit(1)
}
