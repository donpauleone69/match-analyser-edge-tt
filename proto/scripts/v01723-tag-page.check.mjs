/**
 * v0.17.23 Tag page. Two local files, then the confirms and the Details result row.
 * BASE=http://127.0.0.1:5174 node scripts/v01723-tag-page.check.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const VIEWS = [
  { width: 390, height: 844, label: '390x844' },
  { width: 734, height: 310, label: '734x310' },
]
const FILE_A = '/tmp/tag-a.mp4'
const FILE_B = '/tmp/tag-b.mp4'
const LENGTH = 700

const fails = []
const ok = (name, cond, detail = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` ${detail}` : ''}`
  console.log(line)
  if (!cond) fails.push(line)
}

const banned = (text) => {
  const hits = []
  if (/\bclip\b/i.test(text)) hits.push('clip')
  if (text.includes('—') || text.includes('–')) hits.push('long dash')
  if (text.includes('→') || text.includes('➔')) hits.push('arrow')
  return hits
}

function ensureFile(path, color) {
  if (existsSync(path)) return
  const run = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=64x64:d=${LENGTH}`,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-tune',
      'stillimage',
      '-t',
      String(LENGTH),
      path,
    ],
    { stdio: 'inherit' }
  )
  if (run.status !== 0) throw new Error(`ffmpeg failed for ${path}`)
}

async function boot(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
}

async function uncover(page) {
  await page.addStyleTag({
    content: '.tag-preview{position:relative !important;top:auto !important}',
  })
}

async function clickBar(page, card, fraction) {
  const bar = card.locator('[data-card-time]')
  await bar.scrollIntoViewIfNeeded()
  const box = await bar.boundingBox()
  if (!box) throw new Error('bar has no box')
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2)
}

async function vid(page) {
  return page.locator('video').getAttribute('data-vid')
}

async function run(page, label) {
  await boot(page)
  await page.goto(`${BASE}/matches/m-new/tag`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=file]').setInputFiles(FILE_A)
  await page.waitForSelector('[data-video-block]', { timeout: 15000 })
  await page.locator('input[type=file]').setInputFiles(FILE_B)
  await page.waitForFunction(() => document.querySelectorAll('[data-video-block]').length >= 2, null, { timeout: 15000 })
  await uncover(page)

  const cards = page.locator('[data-video-block]')
  const id1 = await cards.nth(0).getAttribute('data-video-block')
  const id2 = await cards.nth(1).getAttribute('data-video-block')
  await cards.nth(0).getByRole('button', { name: 'Add set' }).click()
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id1)
  const wing = cards.nth(0).locator('[data-wing="end"]')
  const bar = cards.nth(0).locator('[data-card-time]')
  await wing.scrollIntoViewIfNeeded()
  const wingBox = await wing.boundingBox()
  const barBox = await bar.boundingBox()
  if (!wingBox || !barBox) throw new Error('end handle has no box')
  await page.mouse.move(wingBox.x + wingBox.width / 2, wingBox.y + wingBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(barBox.x + barBox.width + 8, wingBox.y + wingBox.height / 2, { steps: 12 })
  await page.waitForSelector('[data-video-hint]')
  const endHint = await page.locator('[data-video-hint]').innerText()
  ok(`${label} end hint`, endHint === 'Stops at the video end', endHint)
  const endTime = await page.locator('video').evaluate((el) => el.currentTime)
  ok(`${label} end stays inside`, endTime > LENGTH - 2 && endTime < LENGTH, endTime.toFixed(2))
  ok(`${label} end stays on video 1`, (await vid(page)) === id1)
  await page.mouse.up()
  ok(`${label} end stays after release`, (await vid(page)) === id1)
  await clickBar(page, cards.nth(0), 0.95)
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id1)

  await cards.nth(1).getByRole('button', { name: 'Add set' }).click()
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id2, { timeout: 8000 })
  ok(`${label} add set plays video 2`, (await vid(page)) === id2)

  const row = cards.nth(1).locator('[data-set-line]').first()
  if ((await row.getAttribute('data-set-selected')) !== null) {
    await row.locator('[data-set-label]').click()
  }
  await clickBar(page, cards.nth(0), 0.95)
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id1)
  await row.locator('[data-set-label]').click()
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id2)
  ok(`${label} row plays video 2`, (await vid(page)) === id2)

  await clickBar(page, cards.nth(0), 0.95)
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id1)
  await clickBar(page, cards.nth(1), 0.2)
  await page.waitForFunction(
    ({ id, near }) => {
      const v = document.querySelector('video')
      return v?.dataset.vid === id && Math.abs(v.currentTime - near) < 25
    },
    { id: id2, near: LENGTH * 0.2 },
    { timeout: 8000 }
  )
  const spanTime = await page.locator('video').evaluate((el) => el.currentTime)
  ok(`${label} span plays video 2`, (await vid(page)) === id2)
  ok(`${label} span stays at the touch`, Math.abs(spanTime - LENGTH * 0.2) < 25, `time ${spanTime.toFixed(1)}`)

  await clickBar(page, cards.nth(0), 0.95)
  await page.waitForFunction((id) => document.querySelector('video')?.dataset.vid === id, id1)
  await clickBar(page, cards.nth(1), 0.95)
  await page.waitForFunction(
    ({ id, near }) => {
      const v = document.querySelector('video')
      return v?.dataset.vid === id && Math.abs(v.currentTime - near) < 25
    },
    { id: id2, near: LENGTH * 0.95 },
    { timeout: 8000 }
  )
  ok(`${label} bar plays video 2`, (await vid(page)) === id2)

  const before = await page.locator('video').evaluate((el) => el.currentTime)
  await page.getByRole('button', { name: 'Play video' }).click()
  await page.waitForFunction((t) => (document.querySelector('video')?.currentTime ?? 0) > t + 0.2, before, { timeout: 8000 })
  ok(`${label} play moves forward`, true)

  if ((await row.getAttribute('data-set-selected')) === null) await row.locator('[data-set-label]').click()
  await row.getByRole('button', { name: 'Delete' }).click()
  const plain = row.getByRole('alertdialog')
  const plainText = await plain.innerText()
  ok(`${label} delete set confirm`, /Delete set \d+\?/.test(plainText) && !plainText.includes('only its tags'))
  ok(`${label} delete button`, (await plain.getByRole('button', { name: 'Delete', exact: true }).count()) === 1)
  ok(`${label} delete confirm in the card`, (await plain.locator('xpath=ancestor::*[@data-video-block]').count()) > 0)
  await plain.getByRole('button', { name: 'Cancel' }).click()

  await page.goto(`${BASE}/matches/m-partial/tag`, { waitUntil: 'domcontentloaded' })
  await uncover(page)
  const body = await page.locator('body').innerText()
  const gone = ['Menu', 'Undo', 'Part filmed', '-1 s'].filter((word) => body.includes(word))
  ok(`${label} old controls gone`, gone.length === 0, gone.join(', '))
  ok(`${label} copy`, banned(body).length === 0, banned(body).join(', '))
  const between = await page.evaluate(() => {
    const cards = document.querySelector('.tag-cards')
    const first = cards?.querySelector('[data-video-block]')
    const texts = []
    let node = cards?.firstElementChild ?? null
    while (node && node !== first) {
      texts.push((node.textContent || '').replace(/\s+/g, ' ').trim())
      node = node.nextElementSibling
    }
    return texts
  })
  ok(`${label} only the note`, between.length === 1 && between[0] === 'Only complete sets are tagged.', between.join(' | '))

  const tagged = page.locator('[data-set-line="2"]')
  await tagged.locator('[data-set-label]').click()
  await tagged.getByRole('button', { name: 'Delete' }).click()
  const both = tagged.getByRole('alertdialog')
  const bothText = await both.innerText()
  ok(`${label} tagged delete confirm`, bothText.includes('Delete set 2 or only its tags?'))
  ok(`${label} tagged confirm in the card`, (await both.locator('xpath=ancestor::*[@data-video-block]').count()) > 0)
  await both.getByRole('button', { name: 'Cancel' }).click()

  const card = page.locator('[data-video-block]').first()
  await card.getByRole('button', { name: 'Remove', exact: true }).click()
  const remove = card.getByRole('alertdialog')
  const removeText = await remove.innerText()
  ok(`${label} remove confirm`, removeText.includes('Remove video 1?') && removeText.includes('Its tags stay but will not play'))
  ok(`${label} remove confirm in the card`, (await remove.locator('xpath=ancestor::*[@data-video-block]').count()) > 0)
  await remove.getByRole('button', { name: 'Cancel' }).click()

  await page.goto(`${BASE}/matches/m-complete/details`, { waitUntil: 'domcontentloaded' })
  await page.locator('select[aria-label="Result"]').selectOption('')
  const change = page.getByRole('alertdialog', { name: 'Change result' })
  if ((await change.count()) > 0) await change.getByRole('button', { name: /^Change to/ }).click()
  await page.waitForFunction(() => document.querySelector('select[aria-label="Result"]')?.value === '')
  const details = await page.locator('body').innerText()
  ok(`${label} use tagged result`, details.includes('Tagged sets give') && details.includes('Use tagged result'))
  ok(`${label} no finish on details`, !details.includes('Finish match') && !details.includes('Reopen match'))
}

ensureFile(FILE_A, 'blue')
ensureFile(FILE_B, 'green')

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

for (const view of VIEWS) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await run(page, view.label)
  } catch (err) {
    ok(`${view.label} run`, false, err instanceof Error ? err.message : String(err))
  }
  await context.close()
}

await browser.close()
if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
