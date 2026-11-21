/**
 * v0.17.26 Match Insights page at 390x844 and 734x310.
 * BASE=http://127.0.0.1:5174 node scripts/v01726-insights-page.check.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const VIEWS = [
  { width: 390, height: 844, label: '390x844' },
  { width: 734, height: 310, label: '734x310' },
]

const fails = []
const ok = (name, cond, detail = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` ${detail}` : ''}`
  console.log(line)
  if (!cond) fails.push(line)
}

const bannedHits = (text) => {
  const hits = []
  if (/\bclip\b/i.test(text)) hits.push('clip')
  if (/\breel\b/i.test(text)) hits.push('reel')
  if (text.includes('—') || text.includes('–')) hits.push('long dash')
  if (text.includes('→') || text.includes('➔')) hits.push('arrow')
  return hits
}

async function boot(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
}

async function openMatch(page, id) {
  await page.goto(`${BASE}/matches/${id}/insights`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-insight="phases"], button:has-text("Go to Tag")').first().waitFor()
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

for (const view of VIEWS) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height }, hasTouch: true })
  await boot(page)
  await openMatch(page, 'm-complete')
  const text = await page.locator('body').innerText()
  const hits = bannedHits(text)
  ok(`${view.label} no banned copy`, hits.length === 0, hits.join(', '))
  ok(`${view.label} no opponent prompt`, !text.includes('Who did you play'))
  ok(`${view.label} no download all`, !/download all/i.test(text))
  ok(`${view.label} no sample numbers`, !text.includes('Sample numbers'))
  for (const title of ['Phases', 'Serve', 'Receive', 'Attack', 'End']) {
    ok(`${view.label} card ${title}`, await page.locator(`[data-insight] h3:text-is("${title}")`).count().then((n) => n > 0))
  }
  ok(`${view.label} coverage`, (await page.locator('[data-coverage]').innerText()) === 'Sets 1 to 5')
  const receiveCompare = await page.locator('[data-insight="receive"] p').nth(1).innerText()
  ok(`${view.label} receive shows Usual`, receiveCompare.includes('Usual'), receiveCompare)
  const downloads = page.locator('button[aria-label="Download"]')
  const downloadCount = await downloads.count()
  ok(`${view.label} downloads`, downloadCount >= 4, String(downloadCount))
  ok(`${view.label} download disabled`, await downloads.first().isDisabled())
  const about = page.locator('button[aria-label="About Phases"]')
  const beforeH = (await page.locator('[data-insight="phases"]').boundingBox()).height
  await about.click()
  await page.waitForTimeout(120)
  const mid = await page.locator('[data-insight="phases"] .insight-flip-inner').evaluate((el) => {
    const t = getComputedStyle(el).transform
    const m = t.match(/matrix3d\(([^)]+)\)/)
    return m ? Number(m[1].split(',')[0]) : 1
  })
  const midH = (await page.locator('[data-insight="phases"]').boundingBox()).height
  ok(`${view.label} flip shows the front first`, mid < 0.999 && mid > 0, String(mid))
  ok(`${view.label} flip keeps its height`, Math.abs(beforeH - midH) < 2, `${beforeH} ${midH}`)
  await page.locator('[data-insight="phases"][data-insight-face="back"]').waitFor()
  const back = await page.locator('[data-insight="phases"]').innerText()
  ok(`${view.label} flip names Zhang`, back.includes('Zhang 2004'))
  await page.locator('[data-insight="phases"] .insight-back p').first().click()
  await page.locator('[data-insight="phases"][data-insight-face="front"]').waitFor()
  ok(`${view.label} flip back`, true)
  await page.locator('button[aria-label="About Attack"]').click()
  const attack = await page.locator('[data-insight="attack"]').innerText()
  ok(`${view.label} attack back`, attack.includes('Fuchs and Lames 2021') && attack.includes('blocked fast serve'))
  await page.locator('button[aria-label="Back to Attack"]').click()
  await page.locator('[data-insight="attack"][data-insight-face="front"]').waitFor()
  await page.locator('button[aria-label^="Play "]').filter({ visible: true }).first().click()
  await page.locator('[data-playlist-caption]').waitFor()
  const caption = await page.locator('[data-playlist-caption]').innerText()
  ok(`${view.label} playlist bar`, /^\d+ of \d+/.test(caption), caption)
  const next = page.locator('button[aria-label="Next"]')
  if (await next.isEnabled()) {
    await next.click()
    const stepped = await page.locator('[data-playlist-caption]').innerText()
    ok(`${view.label} playlist steps`, stepped !== caption, stepped)
  } else {
    ok(`${view.label} playlist steps`, true, 'one item')
  }
  await page.locator('button[aria-label="Close"]').click()
  ok(`${view.label} playlist closes`, (await page.locator('[data-playlist-caption]').count()) === 0)
  await page.close()
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
await boot(phone)
await phone.emulateMedia({ reducedMotion: 'reduce' })
await openMatch(phone, 'm-partial')
const club = await phone.locator('[data-coverage]').innerText()
ok('club part of set 2', club.includes('part of set 2'), club)
const dur = await phone.locator('.insight-flip-inner').first().evaluate((el) => getComputedStyle(el).transitionDuration)
ok('reduced motion instant', dur === '0s', dur)
await phone.locator('button[aria-label="About Serve"]').click()
ok('reduced motion still flips', (await phone.locator('[data-insight="serve"]').innerText()).includes('Djokic 2020'))
await openMatch(phone, 'm-ready')
ok('nothing tagged', (await phone.locator('body').innerText()).includes('Nothing tagged yet'))
ok('go to tag', (await phone.locator('button:has-text("Go to Tag")').count()) === 1)
await phone.goto(`${BASE}/insights/summary`, { waitUntil: 'domcontentloaded' })
await phone.locator('[data-insight="phases"]').waitFor()
ok('old summary route is the global page', !((await phone.locator('body').innerText()).includes('Summary')))
ok('global page has the five cards', (await phone.locator('[data-insight="phases"]').count()) === 1)
await phone.locator('button[aria-label="Filter"]').click()
const filters = await phone.locator('[role="dialog"][aria-label="Filters"]').innerText()
ok('global filters are Dates and Event', filters.includes('Event') && filters.includes('Dates') && !filters.includes('Tournament'), filters.slice(0, 80))
await phone.locator('[role="dialog"] label', { hasText: 'Opponent' }).locator('select').selectOption('Pat')
await phone.locator('[role="dialog"]').getByRole('button', { name: 'Apply', exact: true }).click()
await phone.locator('[data-insight="serve"]').waitFor()
const compare = phone.locator('[data-insight="serve"] p').nth(1)
const compareText = await compare.innerText()
ok('Pat serve compare has Usual', compareText.includes('Usual') && compareText.includes('Elite'), compareText)
const fit = await compare.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
ok('compare fits on one line', fit, compareText)
await phone.locator('button[aria-label="Filter"]').click()
const range = phone.locator('[role="dialog"]')
await range.locator('label', { hasText: 'Dates' }).locator('select').selectOption('From and to')
await range.locator('input[aria-label="From"]').waitFor()
await range.locator('input[aria-label="From"]').fill('2099-01-01')
await range.getByRole('button', { name: 'Apply', exact: true }).click()
ok('filter that keeps nothing', (await phone.locator('body').innerText()).includes('Nothing fits this filter'))
ok('chips stay', (await phone.getByRole('button', { name: /^Remove Dates:/ }).count()) === 1)
await phone.getByRole('button', { name: 'Clear filter', exact: true }).click()
await phone.locator('[data-insight="phases"]').waitFor()
ok('clear filter restores the cards', true)
await phone.goto(`${BASE}/insights/serve`, { waitUntil: 'domcontentloaded' })
await phone.locator('[data-insight="phases"]').waitFor()
ok('old serve route redirects', !phone.url().includes('/serve'))

const narrow = await browser.newPage({ viewport: { width: 393, height: 660 }, hasTouch: true })
await boot(narrow)
await narrow.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' })
await narrow.locator('button[aria-label^="Play "]').filter({ visible: true }).first().click()
await narrow.locator('[data-playlist-caption]').waitFor()
const firstCaption = await narrow.locator('[data-playlist-caption]').innerText()
let crossed = false
let last = firstCaption
for (let i = 0; i < 40; i++) {
  const next = narrow.locator('button[aria-label="Next"]')
  if (!(await next.isEnabled())) break
  await next.click()
  last = await narrow.locator('[data-playlist-caption]').innerText()
  const firstVs = firstCaption.split('·')[1]
  const nextVs = last.split('·')[1]
  if (firstVs && nextVs && firstVs.trim() !== nextVs.trim()) {
    crossed = true
    break
  }
}
ok('playlist steps across matches', crossed, `${firstCaption} -> ${last}`)
await narrow.close()
await phone.close()
await browser.close()

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nAll insights page checks passed')
