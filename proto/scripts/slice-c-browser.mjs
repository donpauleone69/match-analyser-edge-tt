/**
 * Items 3, 5 and 11 in the browser.
 * Run: node proto/scripts/slice-c-browser.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { shotWindow, loopShotOf } from '../src/features/tagging/rally.ts'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

const fails = []
const note = (ok, msg) => {
  console.log(`${ok ? 'ok' : 'FAIL'} ${msg}`)
  if (!ok) fails.push(msg)
}

async function read(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-tag-stage]')
    return {
      stage: el?.dataset.tagStage ?? '',
      t: Number(el?.dataset.time ?? 'NaN'),
      a: Number(el?.dataset.loopA ?? 'NaN'),
      b: Number(el?.dataset.loopB ?? 'NaN'),
      contacts: (el?.dataset.contacts ?? '').split(',').filter(Boolean).map(Number),
      fa: el?.dataset.fa ?? '',
      adding: el?.hasAttribute('data-tag-adding') ?? false,
    }
  })
}

async function watch(page, ms, label) {
  const bad = []
  const start = Date.now()
  let n = 0
  let min = Infinity
  let max = -Infinity
  while (Date.now() - start < ms) {
    const s = await read(page)
    n += 1
    if (!Number.isFinite(s.a) || !Number.isFinite(s.b)) {
      bad.push(`${label} missing loop`)
      break
    }
    min = Math.min(min, s.t)
    max = Math.max(max, s.t)
    // data-time is rounded to 0.1s, so allow half a step.
    if (s.t < s.a - 0.06 || s.t > s.b + 0.06) bad.push(`${label} t=${s.t} outside ${s.a}..${s.b}`)
    await page.waitForTimeout(100)
  }
  note(bad.length === 0, `${label}: ${n} samples, time ${min} to ${max}${bad[0] ? ` (${bad[0]})` : ''}`)
  return read(page)
}

function endsMatch(s, shot) {
  const d = {
    videoId: 'v',
    server: 'me',
    contacts: s.contacts,
    closed: true,
    start: null,
    end: null,
    ending: 'Winner',
    fa: s.fa ? Number(s.fa) : null,
    noAttack: false,
    shots: s.contacts.map(() => ({})),
    highlight: false,
  }
  const w = shotWindow(d, shot)
  const da = Math.abs(s.a - w.a)
  const db = Math.abs(s.b - w.b)
  note(da < 0.02 && db < 0.02, `window shot ${shot}: screen ${s.a}..${s.b}, rule ${w.a}..${w.b}`)
}

async function clickText(page, text) {
  const hit = await page.evaluate((label) => {
    const buttons = [...document.querySelectorAll('[data-tag-panel] button')]
    const el = buttons.find((b) => b.textContent?.replace(/\s+/g, ' ').trim().startsWith(label))
    if (!el) return false
    el.click()
    return true
  }, text)
  note(hit, `press ${text}`)
  await page.waitForTimeout(200)
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await phone.newPage()
  await page.goto(`${BASE}/matches/m-ready/tag/1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tap-pad]')
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(700)
  for (let i = 0; i < 12; i++) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(180)
  }
  // Twelve shots: the pick comes straight after the close, before the result.
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'pickFa', {
    timeout: 8000,
  })
  const noAttack = await page.evaluate(() => {
    const btn = document.querySelector('[data-tag-slot] [data-action="no-attack"]')
    const old = document.querySelector('[aria-label^="First attack on shot"]')
    return {
      text: btn?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      live: btn ? !btn.disabled : false,
      old: Boolean(old),
      button: document.querySelector('[data-tag-fa]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }
  })
  // No end stroke is asked yet, so No attack is offered.
  note(
    noAttack.text === 'No attack' && noAttack.live && !noAttack.old,
    `No attack in the foot at the pick, pressable (${noAttack.text || 'none'}${noAttack.live ? '' : ', dimmed'})`
  )
  note(noAttack.button.startsWith('First attack'), `big button reads First attack (${noAttack.button})`)

  const pick = await watch(page, 10000, 'pick first attack')
  const rallySpan = pick.contacts.length
    ? pick.contacts[pick.contacts.length - 1] + 1 - Math.max(0, pick.contacts[0] - 2)
    : 0
  note(
    Math.abs(pick.b - pick.a - rallySpan) < 0.05,
    `pick loops the rally (${(pick.b - pick.a).toFixed(2)}s, rally ${rallySpan.toFixed(2)}s)`
  )

  const followed = await page.evaluate(() => {
    const scroller = document.querySelector('[aria-label="Shots in this rally"]')
    const box = scroller.getBoundingClientRect()
    const live = scroller.querySelector('[aria-current="true"]')
    if (!live) return false
    const r = live.getBoundingClientRect()
    return r.left >= box.left - 1 && r.right <= box.right + 1
  })
  note(followed, 'with no shot picked, the shot on screen is in the row')

  // The button picks the shot 0.3s before the playhead, not the live chip.
  let pressed = false
  const pressUntil = Date.now() + 8000
  while (Date.now() < pressUntil && !pressed) {
    pressed = await page.evaluate(() => {
      const root = document.querySelector('[data-tag-stage]')
      if (root?.dataset.tagStage !== 'pickFa') return false
      const contacts = (root.dataset.contacts ?? '').split(',').filter(Boolean).map(Number)
      const at = Number(root.dataset.time) - 0.3
      const reached = contacts.filter((c) => c <= at + 0.05).length
      if (reached !== 4) return false
      document.querySelector('[data-tag-fa]')?.click()
      return true
    })
    if (!pressed) await page.waitForTimeout(30)
  }
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.fa === '4', { timeout: 3000 })
  const afterPress = await read(page)
  note(afterPress.fa === '4' && afterPress.stage === 'result', `press on shot 4 sets first attack 4, then the result (fa ${afterPress.fa}, ${afterPress.stage})`)

  const row = await page.evaluate(() => {
    const scroller = document.querySelector('[aria-label="Shots in this rally"]')
    const rail = document.querySelector('[data-rail-row]')
    const box = scroller.getBoundingClientRect()
    const cells = [...scroller.querySelectorAll('[data-rail^="shot-"]')]
    const whole = cells.filter((c) => {
      const r = c.getBoundingClientRect()
      return r.width > 8 && r.left >= box.left - 1 && r.right <= box.right + 1
    })
    const end = scroller.querySelector('[data-rail="end"] button')
    const er = end?.getBoundingClientRect()
    const extras = [...rail.querySelectorAll('button')].filter((b) => !/^Shot \d+$/.test(b.getAttribute('aria-label') || ''))
    return {
      shots: cells.length,
      whole: whole.length,
      wholeLabels: whole.map((c) => c.getAttribute('data-rail')),
      endInView: Boolean(er && er.width > 8 && er.left >= box.left - 1 && er.right <= box.right + 1),
      endW: er ? Math.round(er.width) : 0,
      endH: er ? Math.round(er.height) : 0,
      extras: extras.map((b) => b.getAttribute('aria-label')),
      railW: Math.round(rail.getBoundingClientRect().width),
      cellW: cells[0] ? Math.round(cells[0].getBoundingClientRect().width) : 0,
      cellH: cells[0] ? Math.round(cells[0].querySelector('button')?.getBoundingClientRect().height ?? 0) : 0,
    }
  })
  console.log('row', JSON.stringify(row))
  note(row.shots === 12, `12 shot cells (${row.shots})`)
  note(row.cellW === 40 && row.cellH === 40, `shot cell is 40 square (${row.cellW}×${row.cellH})`)
  note(row.endW === 48 && row.endH === 40, `End cell is 48 by 40 (${row.endW}×${row.endH})`)
  note(row.whole === 7, `7 whole shots at 390 (${row.whole})`)
  note(
    row.extras.length === 1 && row.extras[0] === 'End of the point',
    `row is shots and End (${row.extras.join(', ') || 'none'})`
  )
  note(row.endInView, 'End is in view')

  const result = await watch(page, 10000, 'result')
  const endShot = loopShotOf(
    {
      videoId: 'v',
      server: 'me',
      contacts: result.contacts,
      closed: true,
      start: null,
      end: null,
      ending: null,
      fa: 4,
      noAttack: false,
      shots: result.contacts.map(() => ({})),
      highlight: false,
    },
    'result',
    null
  )
  note(endShot === result.contacts.length, `result loops shot ${endShot}`)
  endsMatch(result, result.contacts.length)

  await clickText(page, 'Winner')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot')
  const end = await watch(page, 10000, 'end shot')
  endsMatch(end, end.contacts.length)

  await clickText(page, 'FH')
  await clickText(page, 'Loop')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'faShot', {
    timeout: 4000,
  })
  const tops = await page.evaluate(() => {
    const panel = document.querySelector('[data-tag-panel]')
    return { panel: panel.getBoundingClientRect().top, box: panel.parentElement.getBoundingClientRect().top }
  })
  await page.click('[aria-label="Shot 3"]')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.fa === '3')
  const tops2 = await page.evaluate(() => {
    const panel = document.querySelector('[data-tag-panel]')
    return { panel: panel.getBoundingClientRect().top, box: panel.parentElement.getBoundingClientRect().top }
  })
  const moved = await read(page)
  note(moved.fa === '3', `tap cell 3 sets first attack 3 (fa ${moved.fa})`)
  note(Math.abs(tops.panel - tops2.panel) < 1, `details panel top ${tops.panel} then ${tops2.panel}`)
  note(Math.abs(tops.box - tops2.box) < 1, `details box top ${tops.box} then ${tops2.box}`)

  const fa = await watch(page, 10000, 'first attack shot')
  endsMatch({ ...fa, fa: '3' }, 3)

  await page.screenshot({ path: `${OUT}/slice-c-390.png` })

  await clickText(page, 'FH')
  await clickText(page, 'Loop')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'ready', {
    timeout: 4000,
  })
  const summary = await page.evaluate(() => {
    const text = document.querySelector('[data-fa-summary]')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const change = Boolean(document.querySelector('[data-action="change-fa"]'))
    return { text, change }
  })
  note(
    /First attack:? shot 3/.test(summary.text) && summary.change,
    `summary line (${summary.text}${summary.change ? ', Change' : ''})`
  )
  await watch(page, 10000, 'ready')

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/slice-c-1280.png` })
  const wide = await page.evaluate(() => {
    const fa = document.querySelector('[data-tag-fa], [data-tag-save]')
    const r = fa?.getBoundingClientRect()
    return { label: fa?.textContent?.replace(/\s+/g, ' ').trim() ?? '', top: r?.top ?? -1, bottom: r?.bottom ?? -1, h: r?.height ?? 0 }
  })
  note(wide.bottom > 0 && wide.bottom <= 800, `1280x800 big button on screen (${wide.label}, y ${Math.round(wide.top)}-${Math.round(wide.bottom)}, h ${Math.round(wide.h)})`)

  await browser.close()
  if (fails.length) {
    console.error(`FAILED ${fails.length}`)
    process.exit(1)
  }
  console.log('browser check passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
