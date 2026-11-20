/**
 * The four double taps from the v0.16.8 review, at phone portrait and landscape.
 * A second press within 250 ms of the button changing must not land.
 * BASE=http://127.0.0.1:5174 node scripts/guard-double-tap.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const VIEWS = [
  { width: 390, height: 844, label: '390x844' },
  { width: 734, height: 310, label: '734x310' },
  { width: 844, height: 390, label: '844x390' },
]

const fails = []
const ok = (name, cond, detail = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` ${detail}` : ''}`
  console.log(line)
  if (!cond) fails.push(line)
}

async function boot(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
}

async function pointOf(locator) {
  const el = locator.first()
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  if (!box) throw new Error('no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function clickAt(page, locator) {
  const p = await pointOf(locator)
  await page.mouse.click(p.x, p.y)
}

async function dbl(page, locator) {
  const p = await pointOf(locator)
  await page.mouse.click(p.x, p.y)
  await page.waitForTimeout(40)
  await page.mouse.click(p.x, p.y)
}

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

for (const view of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    hasTouch: true,
    isMobile: view.width < 500,
  })
  const page = await ctx.newPage()
  const tag = view.label
  await boot(page)

  await page.goto(BASE + '/matches/m-ready/tag/1', { waitUntil: 'domcontentloaded' })
  const you = page.getByRole('button', { name: 'You serve' })
  await you.first().waitFor()
  await dbl(page, you)
  await page.waitForTimeout(300)
  const afterServe = await page.locator('.tag-set').evaluate((el) => ({
    contacts: el.getAttribute('data-contacts') ?? '',
    mode: el.getAttribute('data-tag-mode') ?? '',
  }))
  ok(`${tag} You serve`, afterServe.contacts === '' && afterServe.mode !== 'tapping', JSON.stringify(afterServe))

  await page.goto(BASE + '/matches/m-partial/tag/2', { waitUntil: 'domcontentloaded' })
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await play.first().waitFor()
  await dbl(page, play)
  await page.waitForTimeout(300)
  const afterPlay = await page.locator('.tag-set').evaluate((el) => ({
    contacts: el.getAttribute('data-contacts') ?? '',
    mode: el.getAttribute('data-tag-mode') ?? '',
  }))
  ok(`${tag} Play`, afterPlay.contacts === '' && afterPlay.mode !== 'tapping', JSON.stringify(afterPlay))

  await page.goto(BASE + '/matches/m-partial/tag', { waitUntil: 'domcontentloaded' })
  const del = page.getByRole('button', { name: 'Delete', exact: true })
  await del.first().waitFor()
  await del.first().scrollIntoViewIfNeeded()
  const box = await del.first().boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(60)
  const confirm = page.locator('[data-delete-confirm]')
  if (await confirm.count()) await confirm.click()
  await page.waitForTimeout(200)
  const deleted = await page.getByText(/Set \d+ deleted/).count()
  ok(`${tag} Delete set`, deleted === 0, `toasts ${deleted}`)

  await page.goto(BASE + '/matches/m-ready/tag/1', { waitUntil: 'domcontentloaded' })
  await clickAt(page, page.getByRole('button', { name: 'You serve' }))
  await page.waitForTimeout(400)
  const pad = page.locator('[data-tag-zone="pad"], [data-tap-wing="left"]')
  await pad.first().waitFor()
  for (let i = 0; i < 3; i++) {
    await clickAt(page, pad)
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(2200)
  const serve = page.locator('[data-best-serve="BH Long"]')
  await serve.waitFor({ timeout: 4000 })
  await clickAt(page, serve)
  await page.waitForTimeout(400)
  await page.locator('[data-stroke="Attack"][data-wing="BH"]').waitFor({ timeout: 4000 })
  const stroke = page.locator('[data-stroke="Attack"][data-wing="BH"]')
  await dbl(page, stroke)
  await page.waitForTimeout(300)
  const shots = await page.evaluate(() => {
    const root = document.querySelector('[data-best-panel]')
    const chip = (n) => document.querySelector(`[data-best-chip="${n}"]`)?.getAttribute('data-best-stroke') ?? ''
    return {
      step: root?.getAttribute('data-best-step') ?? '',
      page: root?.getAttribute('data-best-page') ?? '',
      two: chip(2),
      three: chip(3),
    }
  })
  ok(
    `${tag} stroke`,
    shots.step === 'shots' && shots.page === '3' && shots.two === 'Attack' && shots.three === '',
    JSON.stringify(shots)
  )

  await ctx.close()
}

await browser.close()
if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
