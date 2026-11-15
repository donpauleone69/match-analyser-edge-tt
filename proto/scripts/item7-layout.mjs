/**
 * Item 7: nothing is cut off or overlapping, the details box sits at the foot
 * straight above the slot, and the big button stays at the same pixel through a rally.
 * In one column the title line is back, so rows that no longer fit are listed as
 * OPEN (the fit for Paul's screens is designed separately) and do not fail the run.
 * BASE=http://127.0.0.1:5174 npm run check:item7
 * SHOTS=/some/folder keeps the pictures. By default they go to /tmp.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const SHOTS = process.env.SHOTS || '/tmp/item7-shots'
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

const open = []
/** `waits` marks a one column fit that is still to be designed: listed, not failed. */
function note(fails, ok, msg, waits = false) {
  console.log(`${ok ? 'ok' : waits ? 'OPEN' : 'FAIL'} ${msg}`)
  if (!ok) (waits ? open : fails).push(msg)
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

    const picBox = pic ? pic.getBoundingClientRect() : null
    const outside = picBox
      ? [...pic.querySelectorAll('button, a')].filter((el) => {
          const r = el.getBoundingClientRect()
          const st = getComputedStyle(el)
          if (r.width < 4 || r.height < 4 || st.display === 'none' || st.visibility === 'hidden') return false
          return r.left < picBox.left - 1 || r.right > picBox.right + 1 || r.top < picBox.top - 1 || r.bottom > picBox.bottom + 1
        }).map((el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32))
      : []

    function textBox(el) {
      const r = el.getBoundingClientRect()
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      const st = getComputedStyle(el)
      if (!text || r.width < 2 || r.height < 2 || st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return null
      return { lab: text.slice(0, 28), t: r.top, l: r.left, b: r.bottom, right: r.right }
    }
    const texts = [...document.querySelectorAll('[data-scene-label], [data-caption], [data-shot-badge]')].map(textBox).filter(Boolean)
    const textOverlaps = []
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i]
        const c = texts[j]
        const w = Math.min(a.right, c.right) - Math.max(a.l, c.l)
        const h = Math.min(a.b, c.b) - Math.max(a.t, c.t)
        if (w > 2 && h > 2) textOverlaps.push(`${a.lab} × ${c.lab} (${Math.round(w)}×${Math.round(h)})`)
      }
    }

    return {
      pageScroll: view.scrollHeight - view.clientHeight,
      screenScroll: screen ? screen.scrollHeight - screen.clientHeight : -1,
      bodyScroll: body ? body.scrollHeight - body.clientHeight : -1,
      bodyH: body ? Math.round(body.clientHeight) : 0,
      boxTop: box ? Math.round(box.getBoundingClientRect().top) : null,
      boxGap: box && body ? Math.round(body.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom) : null,
      warnText: (warn?.textContent || '').replace(/\s+/g, ' ').trim(),
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
      outside,
      textOverlaps: textOverlaps.slice(0, 4),
      warnCut,
      status: (document.querySelector('[data-tag-status]')?.textContent || '').replace(/\s+/g, ' ').trim(),
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
  const gaps = []
  const oneColumn = !(vp.width >= 700 && vp.width > vp.height)

  const snap = async (step) => {
    const m = await measure(page)
    tops.push(m.btnTop)
    if (m.boxGap !== null && m.bodyScroll <= 1) gaps.push(m.boxGap)
    note(fails, m.pageScroll <= 1 && m.screenScroll <= 1, `${vp.file} ${step}: the page does not scroll (page ${m.pageScroll}, screen ${m.screenScroll})`)
    note(fails, m.bodyScroll <= 1, `${vp.file} ${step}: details fit (over by ${m.bodyScroll}, area ${m.bodyH})`, oneColumn)
    note(fails, m.cuts.length === 0, `${vp.file} ${step}: nothing cut off${m.cuts[0] ? ` (${m.cuts[0].lab} ${m.cuts[0].top}-${m.cuts[0].bottom})` : ''}`)
    note(fails, m.overlaps.length === 0, `${vp.file} ${step}: no overlap${m.overlaps[0] ? ` (${m.overlaps[0]})` : ''}`)
    note(fails, m.outside.length === 0, `${vp.file} ${step}: controls inside the picture${m.outside[0] ? ` (${m.outside[0]})` : ''}`)
    note(fails, m.textOverlaps.length === 0, `${vp.file} ${step}: caption text clear${m.textOverlaps[0] ? ` (${m.textOverlaps[0]})` : ''}`)
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
    // The press marks the shot a reaction (0.3s) earlier than the playhead.
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-tag-stage]')
      const stageNow = root?.dataset.tagStage
      if (stageNow === 'faShot' || stageNow === 'ready') return true
      const time = Number(root?.dataset.time || 0)
      const contacts = (root?.dataset.contacts || '').split(',').filter(Boolean).map(Number)
      const reached = contacts.filter((c) => c <= time - 0.3 + 0.05).length
      if (reached >= 2) document.querySelector('[data-tag-fa]')?.click()
      return false
    }, { timeout: 4000 }).catch(() => {})
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
    note(fails, worst.rows >= 6 && worst.bodyScroll <= 1, `${vp.file} six rows on screen (${worst.rows}, body ${worst.bodyH}, scroll ${worst.bodyScroll})`, oneColumn)
  } else if (worst.fit === 'three') {
    const more = await page.locator('[data-more-rows]').count()
    note(fails, more === 1 && worst.rows === 3, `${vp.file} three rows plus More (${worst.rows} rows, more ${more})`)
    note(fails, worst.bodyScroll <= 1, `${vp.file} three rows plus More fit (over by ${worst.bodyScroll})`, oneColumn)
  } else {
    note(fails, worst.rows >= 6 && worst.bodyScroll <= 1, `${vp.file} rows fit (${worst.rows}, fit ${worst.fit}, body ${worst.bodyH})`)
  }

  const btnSame = tops.every((t) => t !== null && Math.abs(t - tops[0]) <= 1)
  const atFoot = gaps.every((g) => g >= 0 && g <= 9)
  note(fails, btnSame, `${vp.file} big button stays at ${tops[0]} (${tops.join(',')})`)
  note(fails, atFoot, `${vp.file} details box sits at the foot, above the slot (gap ${gaps.join(',')})`)
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
  const oneColumn = !(vp.width >= 700 && vp.width > vp.height)
  note(fails, m.pageScroll <= 1, `${vp.file} editing: the page does not scroll`)
  note(fails, m.bodyScroll <= 1, `${vp.file} editing: details fit (over by ${m.bodyScroll})`, oneColumn)
  note(fails, m.delBottom !== null && m.delBottom <= vp.height + 1, `${vp.file} Delete rally on screen (${m.delTop}-${m.delBottom})`)
  note(fails, m.cuts.length === 0, `${vp.file} editing: nothing cut off`)
  const add = page.locator('[data-action="add-contact"]')
  if (await add.count()) {
    await add.click()
    await page.waitForTimeout(200)
    const a = await measure(page)
    note(fails, a.pageScroll <= 1, `${vp.file} Add contact: the page does not scroll`)
    note(fails, a.bodyScroll <= 1, `${vp.file} Add contact: details fit (over by ${a.bodyScroll})`, oneColumn)
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
  // An open rally is dropped so Switch happens while watching, with rallies already saved.
  await page.goto('about:blank')
  await page.goto(`${BASE}/matches/m-partial/tag/2`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tag-switch]')
  if (await page.locator('[data-action="let"]').count()) {
    await page.evaluate(() => document.querySelector('[data-action="let"]')?.click())
  }
  const watching = await page.waitForFunction(
    () => document.querySelector('.tag-set')?.dataset.tagMode === 'watch',
    null,
    { timeout: 4000 }
  ).then(() => true).catch(() => false)
  note(fails, watching, 'switch is pressed while watching')
  if (!watching) return
  await page.waitForSelector('[data-tap-pad]')
  // The slot ignores a click for a moment after Let swaps it back to the pad.
  await page.waitForTimeout(250)
  const before = await measure(page)
  await page.evaluate(() => document.querySelector('[data-tag-switch]')?.click())
  await page.waitForFunction(
    () => /due to serve/.test(document.querySelector('[data-switch-warning]')?.textContent || ''),
    null,
    { timeout: 3000 }
  ).catch(() => {})
  const after = await measure(page)
  // The warning is its own line above the big button (plan item 12). The button holds its place.
  note(
    fails,
    before.btnTop !== null && after.btnTop === before.btnTop,
    `warning does not move the button (${before.btnTop}->${after.btnTop})`
  )
  note(fails, !/due to serve/.test(after.status), `warning leaves the status line alone (${after.status})`)
  const text = after.warnText
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
  const tap = () => page.evaluate(() => document.querySelector('[data-tap-pad]')?.click())
  await tap()
  await page.waitForTimeout(200)
  if ((await readStage(page)) !== 'contacts') await tap()
  await page.waitForFunction(
    () => /Tap each contact/.test(document.querySelector('[data-tag-status]')?.textContent || ''),
    null,
    { timeout: 3000 }
  ).catch(() => {})
  const tapping = await measure(page)
  note(
    fails,
    /Tap each contact/.test(tapping.status) && !/due to serve/.test(tapping.status),
    `step owns the line after the first tap (${tapping.status})`
  )
  for (let i = 0; i < 3; i++) {
    await tap()
    await page.waitForTimeout(70)
  }
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'result',
    null,
    { timeout: 8000 }
  ).catch(() => {})
  const result = await measure(page)
  note(
    fails,
    /Result of shot/.test(result.status) && !/due to serve/.test(result.status),
    `step owns the line at the result (${result.status})`
  )
  await page.waitForFunction(
    () => {
      const panel = document.querySelector('[data-shot-panel]')
      return panel ? Number(getComputedStyle(panel).opacity) > 0.9 : false
    },
    null,
    { timeout: 3000 }
  ).catch(() => {})
  let pressed = await pressCell(page, 'Long')
  await page.waitForFunction(
    () => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot',
    null,
    { timeout: 1500 }
  ).catch(() => {})
  if ((await readStage(page)) !== 'endShot') pressed = await pressCell(page, 'Long')
  await page.waitForFunction(
    () => /Wing and stroke/.test(document.querySelector('[data-tag-status]')?.textContent || ''),
    null,
    { timeout: 3000 }
  ).catch(() => {})
  const detail = await measure(page)
  note(
    fails,
    pressed && /Wing and stroke/.test(detail.status) && !/due to serve/.test(detail.status),
    `step owns the line at the end shot (${detail.status})`
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
if (open.length) {
  console.log(`\nOPEN ${open.length}, one column rows that wait for the fit design`)
  for (const f of open) console.log(' - ' + f)
}
console.log(`\n${fails.length === 0 ? 'PASS' : 'FAIL'} ${fails.length} problems`)
if (fails.length) {
  for (const f of fails) console.log(' - ' + f)
  process.exit(1)
}
