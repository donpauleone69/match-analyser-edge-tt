/**
 * Shot by shot on the set screen. Walks one rally and checks that the band
 * and the page do not scroll at the three sizes, and that the foot stays
 * inside the screen. Current mode is not opened here.
 *
 * BASE=http://127.0.0.1:5174 node proto/scripts/sequence-screen.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { beforeResult } from './won-by.mjs'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const OUT = process.env.OUT || '/opt/cursor/artifacts/sequential'
mkdirSync(OUT, { recursive: true })

const SIZES = [
  { w: 393, h: 660, touch: true, name: '393x660' },
  { w: 393, h: 645, touch: true, name: '393x645' },
  { w: 1440, h: 912, touch: false, name: '1440x912' },
]

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

function fit() {
  const pageScroll = document.documentElement.scrollHeight > document.documentElement.clientHeight + 2
  const band = document.querySelector('[data-tag-body]')
  const foot = document.querySelector('[data-tag-slot]')
  const bandRect = band ? band.getBoundingClientRect() : null
  const footRect = foot ? foot.getBoundingClientRect() : null
  const bandScroll = band ? band.scrollHeight > band.clientHeight + 2 : false
  const footPast = footRect ? footRect.bottom > window.innerHeight + 1 : true
  const rows = [...document.querySelectorAll('[data-row]')].map((el) => el.getAttribute('data-row'))
  const title = document.querySelector('[data-shot-title]')?.textContent ?? ''
  const save = document.querySelector('[data-tag-save]')?.textContent?.trim() ?? ''
  const flow = document.querySelector('[data-flow]')?.getAttribute('data-flow') ?? ''
  const stage = document.querySelector('[data-tag-stage]')?.getAttribute('data-tag-stage') ?? ''
  const pressed = [...document.querySelectorAll('[data-row="Stroke"] [aria-pressed="true"]')].map((el) => el.textContent)
  return {
    pageScroll,
    bandScroll,
    footPast,
    footBottom: footRect ? Math.round(footRect.bottom) : null,
    bandTop: bandRect ? Math.round(bandRect.top) : null,
    viewH: window.innerHeight,
    rows,
    title,
    save,
    flow,
    stage,
    pressed,
    fa: document.querySelector('[data-fa]')?.getAttribute('data-fa') ?? '',
  }
}

const fails = []
const notes = []

for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
  await page.goto(`${BASE}/matches/m-ready/tag/1?flow=sequential`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tag-zone="pad"]')

  const shot = async (label) => {
    const info = await page.evaluate(fit)
    notes.push({ size: size.name, label, ...info, errors: errors.slice() })
    if (info.pageScroll || info.bandScroll || info.footPast) {
      fails.push(`${size.name} ${label}: scroll page=${info.pageScroll} band=${info.bandScroll} foot=${info.footPast} bottom=${info.footBottom} view=${info.viewH}`)
    }
    await page.screenshot({ path: `${OUT}/${size.name}-${label}.png` })
    return info
  }

  await shot('between')
  const zone = page.locator('[data-tag-zone="pad"]')
  await zone.click()
  await page.waitForTimeout(700)
  for (let i = 0; i < 6; i++) {
    await zone.click()
    await page.waitForTimeout(250)
  }
  await page.waitForSelector('[data-seq-shot]', { timeout: 8000 })
  await page.waitForTimeout(1100)
  const serve = await shot('serve')
  if (serve.flow !== 'sequential') fails.push(`${size.name} serve: data-flow is ${serve.flow}`)
  if (!serve.rows.includes('Depth')) fails.push(`${size.name} serve: rows ${serve.rows.join(',')}`)
  if (serve.save !== 'Next') fails.push(`${size.name} serve: foot says ${serve.save}`)

  await page.locator('[data-tag-save]').click()
  await page.waitForTimeout(700)
  const before = await shot('before')
  if (!before.pressed.includes('Defensive')) fails.push(`${size.name} before: pressed ${before.pressed.join(',')}`)
  if (before.rows.includes('Wing')) fails.push(`${size.name} before: wing showed early`)

  await page.locator('[data-cell="Offensive"]').click()
  await page.waitForTimeout(400)
  const attack = await shot('attack')
  if (attack.fa !== '2') fails.push(`${size.name} attack: fa is ${attack.fa}`)
  if (!attack.rows.includes('Wing') || !attack.rows.includes('Intent')) {
    fails.push(`${size.name} attack: rows ${attack.rows.join(',')}`)
  }
  const nextDisabled = await page.locator('[data-tag-save]').isDisabled()
  if (!nextDisabled) fails.push(`${size.name} attack: Next was lit before stroke and wing`)

  if (size.name === '393x660') {
    await page.locator('[data-cell="Flick"]').click()
    await page.locator('[data-cell="FH"]').click()
    await page.waitForTimeout(200)
    if (await page.locator('[data-tag-save]').isDisabled()) fails.push('393x660: Next stayed dark after stroke and wing')
    await page.locator('[data-tag-save]').click()
    await page.waitForTimeout(700)
    const reply = await shot('reply')
    if (!reply.title.startsWith('3')) fails.push(`393x660 reply opened ${reply.title}`)
    if (!reply.rows.includes('Initiative')) fails.push('393x660 reply has no initiative')
    await page.locator('[data-tag-save]').click()
    await page.waitForTimeout(700)
    await page.locator('[data-tag-save]').click()
    await page.waitForTimeout(700)
    const last = await shot('last')
    if (!last.title.startsWith('6')) fails.push(`393x660 last opened ${last.title}`)
    await page.locator('[data-cell="Block"]').click()
    await page.waitForTimeout(200)
    await page.locator('[data-cell="BH"]').click()
    await page.waitForTimeout(800)
    if ((await page.locator('[data-shot-title]').textContent()) !== null) {
      const still = await page.locator('[data-shot-title]').textContent()
      if (still && !still.startsWith('6') && !still.startsWith('End')) {
        fails.push(`393x660 left the last shot for ${still}`)
      }
    }
    const onLast = await page.locator('[data-shot-title]').textContent()
    if (onLast && onLast.startsWith('6')) {
      await page.locator('[data-tag-save]').click()
      await page.waitForTimeout(700)
    }
    await shot('end')
    await page.waitForTimeout(800)
    await beforeResult(page, 'Winner', (sel) => page.locator(sel).click())
    await page.locator('[data-cell="Winner"]').click()
    await page.waitForTimeout(800)
    const ready = await shot('ready')
    if (ready.save !== 'Save') fails.push(`393x660 ready foot says ${ready.save}`)
    await page.locator('[data-tag-save]').click()
    await page.waitForTimeout(1200)
    const after = await shot('saved')
    if (after.flow !== 'sequential') fails.push('flow dropped after save')
    if (!after.title && after.save) fails.push(`393x660 after save still answering: ${after.save}`)
  }
  await ctx.close()
}

await browser.close()
console.log(JSON.stringify({ fails, notes }, null, 2))
if (fails.length) process.exit(1)
