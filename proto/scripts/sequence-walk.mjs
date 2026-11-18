/**
 * Out of date since v0.13: End first and Current are gone, so the flow toggle checks fail.
 * Shot by shot walk with touch: rallies of 1, 2, 3 and 6 shots at 393x645
 * and 1440x912. Checks the walk moves on by itself, the 600 ms band guard,
 * Next never saving, the block of three loop, the flow toggle, Copy timings,
 * and that nothing scrolls.
 *
 * BASE=http://127.0.0.1:5174 node proto/scripts/sequence-walk.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { beforeResult } from './won-by.mjs'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const OUT = process.env.OUT || '/tmp/sequence-walk'
mkdirSync(OUT, { recursive: true })
const SIZES = [
  { w: 393, h: 645, name: '393x645', mobile: true },
  { w: 1440, h: 912, name: '1440x912', mobile: false },
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: process.env.HEADLESS === '1',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
})
const fails = []
let checked = 0
const check = (name, cond, detail = '') => {
  checked++
  if (!cond) fails.push(`${name}${detail ? ': ' + detail : ''}`)
  console.log(`${cond ? 'ok' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`)
}

for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    hasTouch: true,
    isMobile: size.mobile,
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('proto-demo-mode', 'filled')
    localStorage.removeItem('proto-tag-timings')
  })
  await page.goto(`${BASE}/matches/m-ready/tag/1?flow=sequential`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tag-zone="pad"]')
  const S = size.name

  const tapAt = async (sel) => {
    const b = await page.locator(sel).first().boundingBox()
    if (!b) throw new Error(`no box ${sel}`)
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
  }
  const cell = async (name) => {
    await beforeResult(page, name, tapAt)
    await tapAt(`[data-seq-shot] [data-cell="${name}"], [data-cell="${name}"]`)
  }
  const foot = () => tapAt('[data-tag-save]')
  const state = () =>
    page.evaluate(() => {
      const root = document.querySelector('[data-tag-mode]')
      const save = document.querySelector('[data-tag-save]')
      const band = document.querySelector('[data-tag-body]')
      const footEl = document.querySelector('[data-tag-slot]')
      return {
        mode: root?.getAttribute('data-tag-mode'),
        flow: root?.getAttribute('data-flow') ?? '',
        title: document.querySelector('[data-shot-title]')?.textContent ?? '',
        end: Boolean(document.querySelector('[data-row="Result"], [aria-label="Result"]')),
        rows: [...document.querySelectorAll('[data-seq-shot] [data-row]')].map((e) => e.getAttribute('data-row')),
        foot: save ? `${save.textContent.trim()}${save.disabled ? ':off' : ':on'}` : '',
        rallies: document.querySelectorAll('[data-rally-row], [data-rally-id]').length,
        pageScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight + 2 || window.scrollY > 0,
        bandScroll: band ? band.scrollHeight > band.clientHeight + 2 : false,
        footPast: footEl ? footEl.getBoundingClientRect().bottom > window.innerHeight + 1 : false,
        time: Number(root?.getAttribute('data-time') ?? 'NaN'),
        bug: document.querySelector('[role=status][aria-label^="Set "]')?.getAttribute('aria-label') ?? '',
      }
    })
  const fits = async (label) => {
    const s = await state()
    check(`${S} ${label}: nothing scrolls`, !s.pageScroll && !s.bandScroll && !s.footPast, JSON.stringify({ p: s.pageScroll, b: s.bandScroll, f: s.footPast }))
    await page.screenshot({ path: `${OUT}/${S}-${label}.png` })
    return s
  }
  const tapRally = async (n) => {
    const label = (await page.locator('[data-tag-zone="pad"]').getAttribute('aria-label')) ?? ''
    if (/play/i.test(label)) {
      await tapAt('[data-tag-zone="pad"]')
      await sleep(700)
    }
    for (let i = 0; i < n; i++) {
      await tapAt('[data-tag-zone="pad"]')
      await sleep(420)
    }
    await page.waitForSelector('[data-seq-shot], [data-row="Result"], [aria-label="Result"]', { timeout: 8000 })
    await sleep(1100)
  }
  const log = () => page.evaluate(() => JSON.parse(localStorage.getItem('proto-tag-timings') || '[]'))
  const saved = async () => (await log()).length

  // 1 shot: End first. Next is dark. Winner goes to Ready. Only Save saves.
  await tapRally(1)
  let s = await fits('r1-end')
  check(`${S} 1 shot opens on End`, s.title.startsWith('End'), s.title)
  const aceSwitch = ((await page.locator('[data-tag-switch]').first().textContent()) ?? '').replace(/\s+/g, ' ').trim()
  check(`${S} 1 shot offers the server switch`, aceSwitch.endsWith('serving') && s.title.includes(aceSwitch.replace(/ serving$/, '')), `${aceSwitch} / ${s.title}`)
  check(`${S} 1 shot foot is Next and dark`, s.foot === 'Next:off', s.foot)
  await foot()
  await foot()
  await sleep(300)
  check(`${S} 1 shot: Next presses save nothing`, (await saved()) === 0)
  await cell('Winner')
  await sleep(700)
  s = await fits('r1-ready')
  check(`${S} 1 shot Ready shows Save`, s.foot === 'Save:on', s.foot)
  await foot()
  await sleep(1200)
  check(`${S} 1 shot saved once`, (await saved()) === 1)

  // 2 shots: serve Depth moves on to End; the 600 ms guard swallows a quick press.
  await tapRally(2)
  s = await fits('r2-serve')
  check(`${S} 2 shot opens on the serve`, s.title.startsWith('1') && s.rows.includes('Depth'), `${s.title} ${s.rows}`)
  const serveSwitch = ((await page.locator('[data-tag-switch]').first().textContent()) ?? '').replace(/\s+/g, ' ').trim()
  const hold = await page.locator('[data-tag-mode]').getAttribute('data-loop-hold')
  check(`${S} serve offers the server switch`, serveSwitch.endsWith('serving') && s.title.includes(serveSwitch.replace(/ serving$/, '')), `${serveSwitch} / ${s.title}`)
  check(`${S} shot by shot holds the short pause`, hold === '0.3', hold ?? '')
  await cell('Short')
  await sleep(120)
  await cell('Long') // inside the guard, on End
  await sleep(200)
  s = await state()
  check(`${S} Depth moves on to End`, s.title.startsWith('End'), s.title)
  check(`${S} 600 ms guard swallowed the quick press`, s.title.startsWith('End') && s.foot === 'Next:off', `${s.title} ${s.foot}`)
  await sleep(500)
  await cell('Long')
  await sleep(800)
  s = await state()
  check(`${S} End then shot 2`, s.title.startsWith('2'), s.title)
  check(`${S} shot 2 Defensive lit`, (await page.locator('[data-seq-shot] [data-cell="Defensive"]').getAttribute('aria-pressed')) === 'true')
  s = await fits('r2-shot2')
  check(`${S} shot 2 Next dark until stroke and wing`, s.foot === 'Next:off', s.foot)
  await cell('Push')
  await sleep(150)
  await cell('BH')
  await sleep(800)
  s = await state()
  check(`${S} 2 shot details go to Ready`, s.foot === 'Save:on', `${s.title} ${s.foot}`)
  await foot()
  await sleep(1200)
  let lines = await log()
  check(`${S} 2 shot saved as No attack`, lines.length === 2 && lines[1].fa === null && lines[1].shots === 2, JSON.stringify(lines[1]))

  // 3 shots: Next, Next (Defensive) to End, Winner, then shot 3.
  await tapRally(3)
  const serveLoop = await page.locator('[data-tag-mode]').getAttribute('data-loop-a')
  await foot()
  await sleep(700)
  const laterLoop = await page.locator('[data-tag-mode]').getAttribute('data-loop-a')
  check(`${S} the loop window follows the open shot`, Boolean(serveLoop) && serveLoop !== laterLoop, `${serveLoop} then ${laterLoop}`)
  await sleep(700)
  s = await state()
  check(`${S} 3 shot Next on serve goes to 2`, s.title.startsWith('2'), s.title)
  await foot()
  await sleep(700)
  s = await state()
  check(`${S} Next before the last shot goes to End`, s.title.startsWith('End'), s.title)
  // The clip for the shot being asked (the last shot, while End is open) plays round.
  const t0 = await state()
  const seen = []
  for (let i = 0; i < 30; i++) {
    seen.push((await state()).time)
    await sleep(200)
  }
  const wrapped = seen.some((t, i) => i > 0 && t + 0.3 < seen[i - 1])
  check(`${S} the open shot loops`, wrapped, `${t0.time} .. ${seen.map((x) => x.toFixed(1)).join(' ')}`)
  await cell('Winner')
  await sleep(800)
  s = await state()
  check(`${S} End then the last shot`, s.title.startsWith('3'), s.title)
  await cell('Offensive')
  await sleep(400)
  s = await fits('r3-attack')
  check(`${S} first attack asks Intent`, s.rows.includes('Intent') && !s.rows.includes('Initiative'), s.rows.join(','))
  check(`${S} first attack Next dark`, s.foot === 'Next:off', s.foot)
  await cell('Loop')
  await sleep(150)
  await cell('FH')
  await sleep(150)
  await cell('Aggressive')
  await sleep(800)
  s = await state()
  check(`${S} answered attack goes to Ready`, s.foot === 'Save:on', `${s.title} ${s.foot}`)
  await foot()
  await sleep(1200)
  lines = await log()
  check(`${S} 3 shot saved with first attack 3`, lines.length === 3 && lines[2].fa === 3, JSON.stringify(lines[2]))

  // 6 shots: Next, 2 Def, 3 Offensive, 4 and 5 replies by Next, 6 Block, Winner.
  await tapRally(6)
  await foot()
  await sleep(700)
  await cell('Defensive')
  await sleep(700)
  await cell('Offensive')
  await sleep(400)
  await cell('Flick')
  await sleep(150)
  await cell('FH')
  await sleep(150)
  await foot() // Next skips Intent
  await sleep(700)
  s = await fits('r6-reply')
  check(`${S} reply 4 asks Initiative`, s.title.startsWith('4') && s.rows.includes('Initiative'), `${s.title} ${s.rows}`)
  await foot()
  await sleep(700)
  s = await state()
  check(`${S} reply 5`, s.title.startsWith('5'), s.title)
  await foot()
  await sleep(700)
  s = await fits('r6-end')
  check(`${S} shot 5 goes to End before shot 6`, s.title.startsWith('End'), s.title)
  for (let i = 0; i < 3; i++) await foot()
  check(`${S} Next presses on End save nothing`, (await saved()) === 3)
  await cell('Winner')
  await sleep(800)
  s = await fits('r6-last')
  check(`${S} End then last shot 6`, s.title.startsWith('6'), s.title)
  // Reopen shot 2 from the rail and come back.
  await tapAt('[aria-label="Shot 2"]')
  await sleep(500)
  s = await state()
  check(`${S} passed shot 2 reopens`, s.title.startsWith('2'), s.title)
  await tapAt('[aria-label="Shot 2"]')
  await sleep(700)
  s = await state()
  check(`${S} second press goes back to 6`, s.title.startsWith('6'), s.title)
  await cell('Block')
  await sleep(150)
  await cell('BH')
  await sleep(800)
  s = await state()
  check(`${S} shot 6 details go to Ready`, s.foot === 'Save:on', `${s.title} ${s.foot}`)
  s = await fits('r6-ready')
  check(`${S} Ready Save lit`, s.foot === 'Save:on', s.foot)
  await foot()
  await sleep(1200)
  lines = await log()
  check(`${S} 6 shot saved fa 3`, lines.length === 4 && lines[3].fa === 3 && lines[3].mode === 'sequential', JSON.stringify(lines[3]))

  // 3 shots, Defensive already lit: Push then BH goes straight to Save.
  await tapRally(3)
  await foot()
  await sleep(700)
  await foot()
  await sleep(700)
  await cell('Winner')
  await sleep(800)
  await cell('Push')
  await sleep(200)
  await cell('BH')
  await sleep(800)
  s = await state()
  check(`${S} push on the last shot goes to Save`, s.foot === 'Save:on' && !s.title.startsWith('2'), `${s.title} ${s.foot}`)
  await foot()
  await sleep(1200)
  lines = await log()
  check(`${S} push rally saved as no attack`, lines.length === 5 && lines[4].fa === null && lines[4].shots === 3, JSON.stringify(lines[4]))

  // The toggle steps Shot by shot, End first, Current. Then the next rally is the current mode. Copy timings.
  await tapAt('[data-flow-toggle]')
  await sleep(400)
  check(`${S} toggle sets flow=endfirst`, page.url().includes('flow=endfirst'), page.url())
  check(`${S} toggle reads End first`, (await page.locator('[data-flow-toggle]').textContent())?.trim() === 'End first')
  await tapRally(1)
  s = await state()
  const endHold = await page.locator('[data-tag-mode]').getAttribute('data-loop-hold')
  check(`${S} end first opens on End`, s.flow === 'endfirst' && s.title.startsWith('End'), `${s.flow} ${s.title}`)
  const endFirstSwitch = ((await page.locator('[data-tag-switch]').first().textContent()) ?? '').replace(/\s+/g, ' ').trim()
  check(`${S} end first 1 shot offers the server switch`, endFirstSwitch.endsWith('serving') && s.title.includes(endFirstSwitch.replace(/ serving$/, '')), `${endFirstSwitch} / ${s.title}`)
  check(`${S} end first pauses one second`, endHold === '1', endHold ?? '')
  await cell('Winner')
  await sleep(700)
  await foot()
  await sleep(1200)
  lines = await log()
  check(`${S} end first rally logged`, lines.length === 6 && lines[5].mode === 'endfirst', JSON.stringify(lines[5]))
  await tapAt('[data-flow-toggle]')
  await sleep(400)
  check(`${S} toggle sets flow=current`, page.url().includes('flow=current'), page.url())
  s = await state()
  check(`${S} toggle off drops data-flow`, s.flow === '', s.flow)
  await tapRally(1)
  s = await state()
  check(`${S} current mode after toggle: no walk`, !(await page.locator('[data-seq-shot]').count()), s.title)
  await cell('Winner')
  await sleep(700)
  await foot()
  await sleep(1200)
  lines = await log()
  check(`${S} current rally logged as current`, lines.length === 7 && lines[6].mode === 'current', JSON.stringify(lines[6]))
  if (size.mobile) {
    const ral = page.getByRole('button', { name: /^Rallies \d+$/ }).first()
    if (await ral.count()) {
      await ral.tap()
      await sleep(500)
    }
  }
  await page.screenshot({ path: `${OUT}/${S}-rallies.png` })
  const copy = page.locator('[data-copy-timings]').filter({ visible: true })
  check(`${S} Copy timings shown`, (await copy.count()) > 0)
  if (await copy.count()) {
    await copy.first().scrollIntoViewIfNeeded()
    await copy.first().tap()
    await sleep(500)
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
    check(`${S} Copy timings copies the rows`, clip.trim().split('\n').length >= 8, clip.split('\n')[0])
  }
  if (await page.locator('[aria-label="Close rallies"]').count()) {
    await tapAt('[aria-label="Close rallies"]')
    await sleep(400)
  }
  // Current flow: Loop on the end shot must not offer No attack. Block still does.
  await tapRally(3)
  await cell('Winner')
  await sleep(800)
  await cell('Loop')
  await sleep(250)
  await cell('FH')
  await sleep(900)
  check(
    `${S} attacking end stroke hides No attack`,
    (await page.locator('[data-action="no-attack"]').count()) === 0 && (await page.locator('[data-tag-zone="fa"]').count()) === 1,
    `no-attack ${await page.locator('[data-action="no-attack"]').count()} zone ${await page.locator('[data-tag-zone="fa"]').count()}`
  )
  await page.keyboard.press('0')
  await sleep(300)
  check(
    `${S} key 0 leaves the attacking end stroke`,
    (await page.locator('[data-tag-zone="fa"]').count()) === 1 && (await page.locator('[data-action="no-attack"]').count()) === 0
  )
  await tapAt('[data-foot="discard"]')
  await sleep(1200)
  await tapRally(3)
  await cell('Winner')
  await sleep(800)
  await cell('Block')
  await sleep(250)
  await cell('BH')
  await sleep(900)
  check(
    `${S} a block on the end shot still offers No attack`,
    (await page.locator('[data-action="no-attack"]').count()) === 1 && (await page.locator('[data-tag-zone="fa"]').count()) === 1
  )
  await tapAt('[data-flow-toggle]').catch(() => {})
  check(`${S} no page errors`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await browser.close()
console.log(`\nsequence walk: ${checked - fails.length} of ${checked} passed`)
if (fails.length) {
  for (const f of fails) console.log('  FAILED ' + f)
  process.exit(1)
}
