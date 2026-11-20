/**
 * v0.17.9 Tag page at phone portrait and landscape.
 * Statuses and buttons on club night, then into the Set Tagger and back.
 * BASE=http://127.0.0.1:5174 node scripts/v0179-tag-page.check.mjs
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

const banned = (text) => {
  const hits = []
  if (/\bclip\b/i.test(text)) hits.push('clip')
  if (text.includes('—') || text.includes('–')) hits.push('long dash')
  if (text.includes('→') || text.includes('➔')) hits.push('arrow')
  return hits
}

async function boot(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'filled'))
}

/** Keeps the sticky player from covering the control under test. The sticky position is checked first. */
async function uncover(page) {
  await page.addStyleTag({
    content: '.tag-preview{position:relative !important;top:auto !important}',
  })
}

async function text(page) {
  return page.locator('#shell-scroll').innerText()
}

async function status(page, videoId) {
  return (await page.locator(`[data-video-status="${videoId}"]`).innerText()).trim()
}

async function row(page, setId) {
  const line = page.locator(`[data-set-line="${setId}"]`)
  const action = line.locator('[data-set-action]')
  const part = line.locator('[data-part-filmed]')
  const label = line.locator('[data-set-label]')
  return {
    label: ((await label.count()) ? await label.innerText() : '').replace(/\s+/g, ' ').trim(),
    state: await line.getAttribute('data-set-state'),
    action: (await action.count()) ? (await action.innerText()).trim() : '',
    part: (await part.count()) ? (await part.innerText()).trim() : '',
    menu: await line.locator('[data-set-menu-button]').count(),
  }
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
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  await boot(page)

  await page.goto(`${BASE}/matches/m-partial/tag`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-video-status="v-club-1"]').waitFor()
  const stuck = await page.locator('[data-preview-player]').evaluate((el) => getComputedStyle(el).position)
  ok(`${tag} player sticks`, stuck === 'sticky', stuck)
  await uncover(page)
  let body = await text(page)
  ok(`${tag} no opponent prompt`, !body.includes('Who did you play?'))
  ok(`${tag} no lead`, !body.includes('Mark sets') && !body.includes('Continue set') && !body.includes('Tag set'))
  ok(`${tag} no old mark label`, !body.includes('Mark a set'))
  ok(`${tag} copy`, banned(body).length === 0, banned(body).join(', '))
  ok(`${tag} video 1 tagging`, (await status(page, 'v-club-1')) === 'Tagging')
  ok(`${tag} video 2 empty`, (await status(page, 'v-club-2')) === 'No sets yet')
  const set1 = await row(page, 1)
  const set2 = await row(page, 2)
  ok(`${tag} set 1`, set1.label === 'Set 1 · 11 - 7' && set1.action === 'Open' && set1.state === 'saved', JSON.stringify(set1))
  ok(`${tag} set 2`, set2.label === 'Set 2 · 4 - 3' && set2.action === 'Continue' && set2.state === 'tagging', JSON.stringify(set2))
  ok(`${tag} banner`, body.includes('The match is tagged when set 2 is saved.'))
  const off3 = (await page.locator('[data-off-set="3"]').innerText()).replace(/\s+/g, ' ')
  const off4 = (await page.locator('[data-off-set="4"]').innerText()).replace(/\s+/g, ' ')
  ok(`${tag} set 3 off video`, off3.includes('Set 3 · not on video · 11 - 8 from Details') && off3.includes('Add set'))
  ok(`${tag} set 4 off video`, off4.includes('Set 4 · not on video · 11 - 6 from Details') && off4.includes('Add set'))
  ok(`${tag} add set on video 2`, (await page.locator('[data-mark-set="v-club-2"]').count()) === 1)
  ok(`${tag} no add set on video 1`, (await page.locator('[data-mark-set="v-club-1"]').count()) === 0)
  ok(`${tag} preview player`, (await page.locator('[data-preview-player]').count()) === 1)
  ok(`${tag} video 1 playing`, (await page.locator('[data-video-block="v-club-1"][data-card-active]').count()) === 1)

  const over = await page.evaluate(() => {
    const el = document.getElementById('shell-scroll')
    return el ? el.scrollWidth - el.clientWidth : -1
  })
  ok(`${tag} no sideways scroll`, over <= 1, String(over))

  await page.locator('[data-set-menu-button="1"]').click()
  const menu1 = (await page.locator('[data-set-menu="1"] button').allInnerTexts()).map((t) => t.trim())
  ok(`${tag} saved menu`, menu1.length === 1 && menu1[0] === 'Delete tags', menu1.join('|'))
  await page.locator('[data-set-menu-button="1"]').click()

  await page.locator('[aria-label="Menu for video 1"]').click()
  const videoMenu = (await page.locator('[data-video-menu="v-club-1"] button').allInnerTexts()).map((t) => t.trim())
  ok(`${tag} video menu`, videoMenu.includes('Move up') && videoMenu.includes('Move down') && videoMenu.includes('Remove') && !videoMenu.includes('Archive'), videoMenu.join('|'))

  await page.locator('[data-set-line="2"] [data-set-action="Continue"]').click()
  await page.waitForURL(/\/matches\/m-partial\/tag\/2$/)
  await page.locator('.tag-set').waitFor()
  await page.getByRole('button', { name: 'Settings' }).click()
  const version = (await page.locator('[data-build-version]').innerText()).trim()
  ok(`${tag} version`, version === 'v0.17.11', version)
  await page.getByRole('link', { name: 'Back' }).click()
  await page.waitForURL(/\/matches\/m-partial\/tag(\?.*)?$/)
  await page.locator('[data-set-line="2"]').waitFor()
  ok(`${tag} back from continue`, (await row(page, 2)).action === 'Continue')
  await page.locator('[data-picked="2"]').waitFor()
  ok(`${tag} back shows the set`, (await page.locator('[data-picked="2"]').count()) === 1)

  await page.locator('[data-edit-done="2"]').click()
  await page.locator('[data-set-line="1"] [data-set-action="Open"]').click()
  await page.waitForURL(/\/matches\/m-partial\/tag\/1$/)
  await page.locator('.tag-set').waitFor()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.waitForURL(/\/matches\/m-partial\/tag(\?.*)?$/)
  ok(`${tag} back from open`, (await row(page, 1)).action === 'Open')

  await page.locator('[data-card-time="v-club-2"]').evaluate((el) => {
    const box = el.getBoundingClientRect()
    const at = { bubbles: true, clientX: box.left + 40, clientY: box.top + 22, pointerId: 1, pointerType: 'mouse' }
    el.dispatchEvent(new PointerEvent('pointerdown', at))
    el.dispatchEvent(new PointerEvent('pointerup', at))
  })
  await page.locator('[data-video-block="v-club-2"][data-card-active]').waitFor()
  ok(`${tag} seek on the card`, (await page.locator('[data-video-block="v-club-2"] [data-playhead]').count()) === 1)

  await page.locator('[data-mark-set="v-club-2"]').click()
  await page.locator('[data-picked="3"]').waitFor()
  ok(`${tag} add set stays`, !page.url().includes('/mark/') && (await page.locator('[data-wing="end"]').count()) === 1)
  await page.locator('[data-part-switch="3"]').click()
  const part = await row(page, 3)
  ok(`${tag} part filmed`, part.label === 'Set 3' && part.part === 'Part filmed' && part.action === '' && part.menu === 0, JSON.stringify(part))
  ok(`${tag} video 2 done`, (await status(page, 'v-club-2')) === 'Done')
  ok(`${tag} set 3 left the off list`, (await page.locator('[data-off-set="3"]').count()) === 0)
  await page.locator('[data-archive-video="v-club-2"]').click()
  ok(`${tag} archive video note`, (await text(page)).includes('Archive comes in a later build.'))
  await page.locator('[data-delete-set="3"]').click()
  ok(`${tag} delete set`, (await page.locator('[data-set-line="3"]').count()) === 0)
  await page.getByRole('button', { name: 'Undo' }).click()
  ok(`${tag} undo delete`, (await page.locator('[data-set-line="3"]').count()) === 1)

  await page.locator('[data-set-menu-button="2"]').click()
  await page.locator('[data-delete-tags="2"]').click()
  ok(`${tag} ready after delete tags`, (await status(page, 'v-club-1')) === 'Ready to tag')
  const ready = await row(page, 2)
  ok(`${tag} set 2 ready`, ready.label === 'Set 2' && ready.action === 'Tag' && ready.menu === 0, JSON.stringify(ready))
  await page.getByRole('button', { name: 'Undo' }).click()
  ok(`${tag} undo tagging`, (await status(page, 'v-club-1')) === 'Tagging' && (await row(page, 2)).action === 'Continue')

  await page.locator('[data-pick-set="2"]').click()
  const beforeEnd = (await page.locator('[data-nudge-time]').innerText()).trim()
  await page.locator('[data-nudge="-1"]').dispatchEvent('pointerdown')
  await page.locator('[data-nudge="-1"]').dispatchEvent('pointerup')
  const afterEnd = (await page.locator('[data-nudge-time]').innerText()).trim()
  ok(`${tag} nudge end`, beforeEnd !== afterEnd, `${beforeEnd} -> ${afterEnd}`)
  ok(`${tag} wing undo`, (await text(page)).includes('Set 2 end moved'))

  await page.goto(`${BASE}/matches/m-complete/tag`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-video-status="v-final"]').waitFor()
  await uncover(page)
  ok(`${tag} league done`, (await status(page, 'v-final')) === 'Done')
  const league = await text(page)
  ok(`${tag} match tagged`, league.includes('Match tagged'))
  ok(`${tag} no working archive`, !league.includes('Making archive') && !league.includes('This cannot be undone'))
  await page.locator('[data-archive-match]').click()
  ok(`${tag} archive match note`, (await text(page)).includes('Archive comes in a later build.'))
  ok(`${tag} league edit sets`, (await page.locator('[data-edit-sets="v-final"]').count()) === 1)
  ok(`${tag} league no wings yet`, (await page.locator('[data-wing]').count()) === 0)
  await page.locator('[data-set-line="1"] [data-set-action="Open"]').click()
  await page.waitForURL(/\/matches\/m-complete\/tag\/1$/)
  await page.getByRole('link', { name: 'Back' }).click()
  await page.waitForURL(/\/matches\/m-complete\/tag(\?.*)?$/)
  ok(`${tag} league back`, (await row(page, 1)).action === 'Open')
  await page.locator('[data-picked="1"]').waitFor()
  ok(`${tag} league card opens on return`, (await page.locator('[data-wing="end"]').count()) === 1)

  await page.goto(`${BASE}/matches/m-ready/tag`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-video-status="v-county"]').waitFor()
  await uncover(page)
  ok(`${tag} county empty`, (await status(page, 'v-county')) === 'No sets yet')
  ok(`${tag} county add set`, (await page.locator('[data-mark-set="v-county"]').count()) === 1)
  const county = await text(page)
  ok(`${tag} county no prompt`, !county.includes('Who did you play?'))

  await page.goto(`${BASE}/matches/m-partial/details`, { waitUntil: 'domcontentloaded' })
  await uncover(page)
  await page.getByPlaceholder('Who you played').fill('')
  const tabs = page.locator('nav[aria-label="Match sections"]')
  await tabs.getByRole('link', { name: 'Insights' }).click()
  await page.waitForURL(/\/insights\/summary$/)
  const prompt = page.getByText('Who did you play?')
  await prompt.waitFor()
  ok(`${tag} prompt stays on insights`, (await prompt.count()) === 1)
  await tabs.getByRole('link', { name: 'Tag' }).click()
  await page.waitForURL(/\/tag$/)
  await prompt.waitFor({ state: 'detached' })
  ok(`${tag} prompt stays off tag`, (await prompt.count()) === 0)

  await page.goto(`${BASE}/matches/m-partial/mark/v-club-1?set=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/matches\/m-partial\/tag\?/)
  await page.locator('[data-picked="1"]').waitFor()
  ok(`${tag} mark redirect`, page.url().includes('set=1') && !page.url().includes('/mark/'))
  ok(`${tag} redirected wings`, (await page.locator('[data-wing="start"]').count()) === 1)

  await page.goto(`${BASE}/matches/m-new/tag`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-no-video]').waitFor()
  ok(`${tag} no player without video`, (await page.locator('[data-preview-player]').count()) === 0)

  ok(`${tag} no page error`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}

await browser.close()
if (fails.length) {
  console.error(`v0.17.11 tag page: ${fails.length} failed`)
  process.exit(1)
}
console.log('v0.17.11 tag page: all passed')
