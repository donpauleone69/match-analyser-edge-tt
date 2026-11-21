/**
 * v0.17.25 Matches page at 390x844 and 734x310.
 * BASE=http://127.0.0.1:5174 node scripts/v01725-matches-page.check.mjs
 */
import { chromium } from 'playwright-core'
import { waitForApp } from '../routes.mjs'

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

const banned = (text) => {
  const hits = []
  if (/\bclip\b/i.test(text)) hits.push('clip')
  if (text.includes('—') || text.includes('–')) hits.push('long dash')
  if (text.includes('→') || text.includes('➔')) hits.push('arrow')
  return hits
}

async function boot(page, mode) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.evaluate((next) => {
    localStorage.setItem('proto-demo-mode', next)
    sessionStorage.removeItem('proto-matches-filters')
  }, mode)
  await page.goto(`${BASE}/matches`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
}

async function rowText(page, id) {
  return page.locator(`[data-match-row="${id}"]`).innerText()
}

async function run(page, label) {
  await boot(page, 'filled')
  await page.locator('[data-match-row="m-new"]').waitFor()

  const ids = await page.locator('[data-match-row]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-match-row'))
  )
  ok(`${label} order`, ids.join(',') === 'm-new,m-ready,m-partial,m-complete,m-h1,m-h2,m-h3,m-h4,m-h5,m-h6,m-h7,m-h8,m-h9,m-h10', ids.join(','))

  const lee = await rowText(page, 'm-new')
  ok(`${label} Lee`, lee.includes('vs Lee') && lee.includes('Open trial') && lee.includes('No video'))
  ok(
    `${label} Lee opens Tag`,
    (await page.locator('[data-match-row="m-new"] a').getAttribute('href')) === '/matches/m-new/tag'
  )

  const today = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateLabel = (days) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
    const text = `${d.getDate()} ${months[d.getMonth()]}`
    return d.getFullYear() === today.getFullYear() ? text : `${text} ${d.getFullYear()}`
  }
  const kim = await rowText(page, 'm-ready')
  ok(`${label} Kim`, kim.includes('vs Kim') && kim.includes(dateLabel(3)) && kim.includes('County open') && kim.includes('Not tagged'))
  ok(`${label} Kim has no year`, !kim.includes(String(today.getFullYear())) || dateLabel(3).includes(String(today.getFullYear())))

  const sam = await rowText(page, 'm-partial')
  ok(
    `${label} Sam`,
    sam.includes('vs Sam') && sam.includes(dateLabel(6)) && sam.includes('Won 3 - 1') && sam.includes('Club night') && sam.includes('Continue set 2')
  )
  ok(
    `${label} Sam row opens Tag`,
    (await page.locator('[data-match-row="m-partial"] a').getAttribute('href')) === '/matches/m-partial/tag'
  )

  const pat = await rowText(page, 'm-complete')
  ok(
    `${label} Pat`,
    pat.includes('vs Pat') && pat.includes(dateLabel(12)) && pat.includes('Won 3 - 2') && pat.includes('League final') && pat.includes('Tagged')
  )
  const patYear = dateLabel(12).includes(String(today.getFullYear() - 1)) || dateLabel(12).includes(String(today.getFullYear()))
  ok(`${label} Pat year only when it is not this year`, patYear ? pat.includes(dateLabel(12)) : !pat.includes(String(today.getFullYear())))
  ok(
    `${label} Pat opens Insights`,
    (await page.locator('[data-match-row="m-complete"] a').getAttribute('href')) === '/matches/m-complete/insights'
  )
  ok(`${label} no differs on the row`, !pat.includes('Differs'))

  const list = await page.locator('body').innerText()
  ok(`${label} old copy is gone`, !list.includes('No date') && !list.includes('Ready to tag') && !list.includes('Create a match'))
  const hits = banned(list)
  ok(`${label} copy`, hits.length === 0, hits.join(', '))

  await page.locator('[data-continue-set="2"]').click()
  await page.waitForURL(/\/matches\/m-partial\/tag\/2/)
  ok(`${label} continue opens set 2`, page.url().includes('/matches/m-partial/tag/2'))

  await page.goto(`${BASE}/matches`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await sheet.waitFor()
  const sheetText = await sheet.innerText()
  ok(`${label} filter pickers`, sheetText.includes('Opponent') && sheetText.includes('Event') && sheetText.includes('Status'))
  ok(`${label} no dates picker`, !sheetText.includes('Dates') && !sheetText.includes('Tournament'))

  await sheet.locator('label', { hasText: 'Status' }).locator('select').selectOption('Part tagged')
  await sheet.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.locator('[data-match-row="m-partial"]').waitFor()
  const filtered = await page.locator('[data-match-row]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-match-row'))
  )
  ok(`${label} part tagged is Club night`, filtered.join(',') === 'm-partial', filtered.join(','))
  ok(`${label} status chip`, (await page.getByRole('button', { name: 'Remove Status: Part tagged' }).count()) === 1)

  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const again = page.getByRole('dialog', { name: 'Filters' })
  await again.locator('label', { hasText: 'Opponent' }).locator('select').selectOption('Max')
  await again.locator('label', { hasText: 'Status' }).locator('select').selectOption('Not tagged')
  await again.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByText('Nothing fits this filter').waitFor()
  ok(`${label} nothing fits`, (await page.locator('[data-match-row]').count()) === 0)
  await page.getByRole('button', { name: 'Clear filter', exact: true }).click()
  await page.locator('[data-match-row="m-new"]').waitFor()
  ok(`${label} clear filter`, (await page.locator('[data-match-row]').count()) === 14)

  await page.goto(`${BASE}/matches/m-complete/details`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  const details = await page.locator('body').innerText()
  ok(`${label} no open insights button`, !details.includes('Open match Insights'))
  ok(`${label} delete stays`, details.includes('Delete match'))
  ok(`${label} top row name`, (await page.locator('.top-row-name').innerText()).trim() === 'vs Pat')

  await page.locator('select[aria-label="Result"]').selectOption('')
  const change = page.getByRole('alertdialog', { name: 'Change result' })
  if ((await change.count()) > 0) await change.getByRole('button', { name: /^Change to/ }).click()
  await page.waitForFunction(() => document.querySelector('select[aria-label="Result"]')?.value === '')
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  const noResult = page.locator('[data-match-row="m-complete"]')
  await noResult.waitFor()
  ok(`${label} no result row`, (await noResult.innerText()).includes('No result'))
  await noResult.locator('a').click()
  await page.waitForURL(/\/matches\/m-complete\/details#result/)
  await page.locator('#result select[aria-label="Result"]').waitFor()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const picker = await page.evaluate(() => {
    const el = document.querySelector('#result select[aria-label="Result"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const chrome = document.querySelector('[data-sticky-chrome]')
    const sticky = chrome && getComputedStyle(chrome).position === 'sticky'
    const topLimit = sticky ? chrome.getBoundingClientRect().bottom : 0
    return { top: r.top, bottom: r.bottom, topLimit, vh: window.innerHeight }
  })
  ok(
    `${label} result picker on screen`,
    picker !== null && picker.top >= picker.topLimit - 1 && picker.bottom <= picker.vh + 1,
    picker ? `top ${picker.top.toFixed(0)} bottom ${picker.bottom.toFixed(0)} limit ${picker.topLimit.toFixed(0)} vh ${picker.vh}` : 'missing'
  )

  await boot(page, 'empty')
  await page.getByText('No matches yet').waitFor()
  const empty = await page.locator('body').innerText()
  ok(`${label} empty title`, empty.includes('No matches yet') && !empty.includes('Prototype'))
  ok(`${label} no filter when empty`, (await page.getByRole('button', { name: 'Filter', exact: true }).count()) === 0)
  ok(`${label} new match`, (await page.getByRole('button', { name: 'New match', exact: true }).count()) === 1)

  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
  await page.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const insights = page.getByRole('dialog', { name: 'Filters' })
  await insights.waitFor()
  const insightsText = await insights.innerText()
  ok(`${label} insights filter is Event`, insightsText.includes('Event') && insightsText.includes('Dates') && !insightsText.includes('Tournament'))
  ok(`${label} insights has no status`, !insightsText.includes('Status'))
}

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
