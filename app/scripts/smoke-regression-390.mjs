#!/usr/bin/env node
/**
 * Tip-of-main @390 regression smoke (MA-44 path, reusable).
 *
 * Covers: Home What’s left → Find → Tag (FA/End, Flag, 1st/Gap) → Done →
 * Summary incomplete → Work on → Clips Download → Rallies Incomplete →
 * Fix incomplete → Details markers/Trim → Account/Training.
 *
 * Requires a running Vite app and fixture `public/fixtures/smoke-set.mp4`.
 * See `scripts/README-smoke.md`.
 *
 * Env:
 *   SMOKE_BASE_URL   default http://127.0.0.1:5173
 *   SMOKE_FIXTURE    default <app>/public/fixtures/smoke-set.mp4
 *   SMOKE_OUT        default <app>/smoke-artifacts
 *   CHROME_PATH      Chromium/Chrome executable (playwright-core)
 */

import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run smoke:390

Prereqs:
  1. Fixture present: public/fixtures/smoke-set.mp4
  2. Dev server: npm run dev  (or SMOKE_BASE_URL pointing at a preview build)
  3. Chrome/Chromium on PATH or CHROME_PATH set
  4. playwright-core installed (npm install --legacy-peer-deps)

Env: SMOKE_BASE_URL, SMOKE_FIXTURE, SMOKE_OUT, CHROME_PATH
`)
  process.exit(0)
}

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '')
const FIXTURE =
  process.env.SMOKE_FIXTURE ||
  path.join(APP_ROOT, 'public/fixtures/smoke-set.mp4')
const OUT = process.env.SMOKE_OUT || path.join(APP_ROOT, 'smoke-artifacts')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROME,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

function resolveChrome() {
  for (const p of CHROME_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      /* ignore */
    }
  }
  return null
}

if (!fs.existsSync(FIXTURE)) {
  console.error(
    `Missing fixture: ${FIXTURE}\nExpected app/public/fixtures/smoke-set.mp4 (see scripts/README-smoke.md).`
  )
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })

const results = []
const pass = (name) => {
  results.push({ name, ok: true })
  console.log('PASS ' + name)
}
const fail = (name, detail = '') => {
  results.push({ name, ok: false, detail })
  console.log('FAIL ' + name + (detail ? ' — ' + detail : ''))
}
const info = (s) => console.log('INFO ' + s)

const chromePath = resolveChrome()
if (!chromePath) {
  console.error(
    'No Chrome/Chromium found. Set CHROME_PATH to a Chromium executable.'
  )
  process.exit(1)
}
info(`base=${BASE}`)
info(`fixture=${FIXTURE}`)
info(`chrome=${chromePath}`)
info(`out=${OUT}`)

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await (
  await browser.newContext({ viewport: { width: 390, height: 844 } })
).newPage()
page.on('dialog', (d) => d.accept())

const shot = async (n) => {
  await page.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: true })
  console.log('SHOT ' + n)
}

/** Done control — prefer finish-set aria (MA-46), fall back to label Done. */
function doneButton() {
  return page.getByRole('button', { name: /Done — finish this set|^Done$/i })
}

async function tagOnePoint({ flag = false, highlight = false } = {}) {
  const tap = page.getByRole('button', { name: /Tap contact/i })
  for (let i = 0; i < 3; i++) {
    await tap.click()
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(2400)
  const rails = page.locator('[aria-label="Shots in this rally"] button')
  await rails.nth(2).click()
  if (flag) {
    const f = page.getByRole('button', { name: /Flag for review/i })
    if (await f.count()) await f.click()
  }
  await page.getByRole('button', { name: /End point/i }).first().click()
  await page.waitForTimeout(150)
  const end = page.getByRole('button', { name: /End point/i }).first()
  if ((await end.getAttribute('aria-pressed')) !== 'true') await end.click()
  await page.getByRole('button', { name: /No attack/i }).first().click()
  await rails.nth(2).click()
  await page.getByRole('button', { name: /^Winner$/i }).first().click()
  if (highlight) {
    const hl = page.getByRole('button', { name: /Highlight/i }).first()
    if (await hl.count()) await hl.click()
  }
  await page.getByRole('button', { name: /Save rally/i }).click()
  await page.waitForTimeout(900)
}

async function markLatestIncomplete() {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('EdgeTTMatchAnalyser')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('rallies', 'readwrite')
    const store = tx.objectStore('rallies')
    const all = await new Promise((resolve, reject) => {
      const r = store.getAll()
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const latest = [...all].sort((a, b) =>
      (b.updated_at || '').localeCompare(a.updated_at || '')
    )[0]
    latest.framework_confirmed = false
    latest.point_ending = null
    latest.first_attack_index = null
    await new Promise((resolve, reject) => {
      const r = store.put(latest)
      r.onsuccess = () => resolve()
      r.onerror = () => reject(r.error)
    })
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return { id: latest.id, rally_index: latest.rally_index }
  })
}

try {
  // Probe server
  const probe = await fetch(BASE + '/').catch(() => null)
  if (!probe?.ok) {
    console.error(
      `App not reachable at ${BASE}. Start with: npm run dev\n(or set SMOKE_BASE_URL)`
    )
    process.exitCode = 1
    await browser.close()
    process.exit(1)
  }

  // —— Home ——
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const gate = page.getByRole('button', { name: /Continue on this device/i })
  if (await gate.count()) await gate.click()
  await page.waitForTimeout(500)
  await shot('01-home')
  const homeBody = await page.locator('body').innerText()
  if (/Find matches|New match|What's left|No matches yet/i.test(homeBody))
    pass('Home loads')
  else fail('Home loads', homeBody.slice(0, 120))

  // —— Find ——
  const findBtn = page
    .getByRole('button', { name: /Find matches/i })
    .or(page.getByRole('link', { name: /Find matches/i }))
  if (await findBtn.count()) {
    await findBtn.first().click()
  } else {
    await page.goto(BASE + '/matches', { waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(700)
  await shot('02-find')
  const findBody = await page.locator('body').innerText()
  if (/Find matches/i.test(findBody)) pass('Find matches screen')
  else fail('Find matches screen')
  if (/Opponent|Tournament|Match date|Date tagged|No matches to find|Filters/i.test(findBody)) {
    pass('Find filters or empty copy')
  } else fail('Find filters or empty copy')

  // —— Create + Tag set 1 ——
  await page.goto(BASE + '/matches/create', { waitUntil: 'networkidle' })
  await page.locator('button[type=submit]').click()
  await page.waitForURL(/\/tag/, { timeout: 20000 })
  await page.locator('input[type=file]').first().setInputFiles(FIXTURE)
  await page.waitForTimeout(1200)
  await tagOnePoint({ flag: true, highlight: true })
  await shot('03-pass1-saved')

  const jump1st = page.getByRole('button', { name: /Jump to first serve/i })
  if (await jump1st.count()) {
    await jump1st.click()
    await page.waitForTimeout(300)
    const done = doneButton()
    if (!(await done.isDisabled())) pass('1st jump keeps Done enabled')
    else fail('1st jump keeps Done enabled')
  } else fail('1st jump control present')

  await doneButton().click()
  await page.waitForURL(/\/matches\/[^/]+/, { timeout: 15000 })
  await page.waitForTimeout(1000)
  const matchId = page.url().match(/\/matches\/([^/?]+)/)?.[1]
  info('match ' + matchId)
  await shot('04-review')
  pass('Done → Match Review')

  // —— Multi-set Gap ——
  await page.goto(`${BASE}/matches/${matchId}?tab=details`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(700)
  const addSet = page.getByRole('button', { name: /Add Set 2/i })
  if (await addSet.count()) {
    await addSet.click()
    await page.waitForTimeout(800)
    pass('Add Set 2')
  } else fail('Add Set 2')

  await page.goto(`${BASE}/matches/${matchId}/tag?set=2&mode=pass1focus`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(1200)
  const file = page.locator('input[type=file]').first()
  if (await file.count()) {
    try {
      await file.setInputFiles(FIXTURE)
      await page.waitForTimeout(1000)
    } catch {
      /* video may already be linked */
    }
  }
  await shot('05-set2-gap')
  const gap = page.getByRole('button', { name: /Jump to previous set end/i })
  if (await gap.count()) {
    await gap.click()
    await page.waitForTimeout(300)
    pass('Gap jump on set 2')
  } else {
    // MA-45: Gap hidden when first serve already known and gap < 15s
    pass('Gap jump on set 2 (hidden or seek — set ≥2 path ok)')
  }

  await tagOnePoint()
  const done2 = doneButton()
  if (!(await done2.isDisabled())) {
    await done2.click()
    await page.waitForTimeout(1000)
    pass('Set 2 Done → Review')
  } else {
    const softLeave = page.getByRole('button', {
      name: /Leave tagging — resume later|^Leave$/i,
    })
    if (await softLeave.count()) {
      await softLeave.first().click()
      await page.waitForTimeout(1000)
      pass('Set 2 soft-leave → Review')
    } else fail('Set 2 leave Review')
  }

  // —— Home What’s left ——
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await shot('06-home-whats-left')
  const home2 = await page.locator('body').innerText()
  if (/What's left|Continue tagging|Fix incomplete|Find matches/i.test(home2))
    pass("Home What's left / Find")
  else fail("Home What's left / Find", home2.split('\n').slice(0, 15).join(' | '))

  // —— Seed incomplete + Summary callout + Rallies badge ——
  await page.goto(`${BASE}/matches/${matchId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const seeded = await markLatestIncomplete()
  info('seeded incomplete ' + JSON.stringify(seeded))
  await page.goto(`${BASE}/matches/${matchId}?tab=summary`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(900)
  await shot('07-summary-incomplete')
  const sum = await page.locator('body').innerText()
  if (/incomplete point/i.test(sum) && /out of stats/i.test(sum))
    pass('Summary incomplete callout')
  else
    fail(
      'Summary incomplete callout',
      sum
        .split('\n')
        .filter((l) => /incomplete|stats/i.test(l))
        .slice(0, 8)
        .join(' | ')
    )

  const ralliesTab = page.getByRole('tab', { name: /Rallies/i })
  const rText = (await ralliesTab.innerText()).replace(/\s+/g, '')
  if (
    /Rallies\d+/.test(rText) ||
    (await ralliesTab.getAttribute('aria-label') || '').includes('incomplete')
  ) {
    pass('Rallies Incomplete badge')
  } else fail('Rallies Incomplete badge', rText)

  // —— Work on ——
  await page.getByRole('tab', { name: /Work on/i }).click()
  await page.waitForTimeout(800)
  await shot('08-workon')
  const work = await page.locator('body').innerText()
  if (/Work on|flag|Clips|pattern|Technical|Nothing to work/i.test(work))
    pass('Work on tab')
  else fail('Work on tab')

  // —— Clips Download ——
  await page.getByRole('tab', { name: /^Clips$/i }).click()
  await page.waitForTimeout(1000)
  await shot('09-clips')
  const clips = await page.locator('body').innerText()
  const dl = page.getByRole('button', { name: /^Download$|^Download clip$/i })
  let visDl = 0
  for (let i = 0; i < (await dl.count()); i++) {
    if (await dl.nth(i).isVisible()) visDl++
  }
  if (visDl <= 1) pass('Clips ≤1 Download')
  else fail('Clips ≤1 Download', String(visDl))
  if (/Save as reel|Playlists/i.test(clips)) pass('Clips Save as reel / Playlists')
  else fail('Clips Save as reel / Playlists')

  // —— Rallies Incomplete filter ——
  await page.getByRole('tab', { name: /Summary/i }).click()
  await page.waitForTimeout(500)
  const callout2 = page.getByRole('button', { name: /incomplete point/i })
  if (await callout2.count()) {
    await callout2.click()
    await page.waitForTimeout(800)
  } else {
    await page.getByRole('tab', { name: /Rallies/i }).click()
    await page.waitForTimeout(500)
    const inc = page.getByRole('button', { name: /Incomplete/i })
    if (await inc.count()) await inc.first().click()
  }
  await shot('10-rallies-incomplete')
  if (/rf=incomplete|Incomplete/i.test(page.url() + (await page.locator('body').innerText()))) {
    pass('Rallies Incomplete filter')
  } else fail('Rallies Incomplete filter')

  // —— Fix incomplete ——
  const fixEdit = page
    .getByRole('button', { name: /Fix incomplete rally|Edit rally/i })
    .first()
  if (await fixEdit.count()) {
    await fixEdit.click()
    await page.waitForURL(/edit-rally/, { timeout: 15000 })
    await page.waitForTimeout(1000)
    await shot('11-edit-incomplete')
    const editBody = await page.locator('body').innerText()
    if (/Incomplete point|Save fix/i.test(editBody))
      pass('Edit incomplete banner / Save fix')
    else fail('Edit incomplete banner / Save fix')

    const rails = page.locator('[aria-label="Shots in this rally"] button')
    if (await rails.count())
      await rails.nth(Math.min(2, (await rails.count()) - 1)).click()
    const endBtn = page.getByRole('button', { name: /End point/i }).first()
    if (await endBtn.count()) {
      await endBtn.click()
      await page.waitForTimeout(100)
      if ((await endBtn.getAttribute('aria-pressed')) !== 'true') await endBtn.click()
    }
    const noAtk = page.getByRole('button', { name: /No attack/i }).first()
    if (await noAtk.count()) await noAtk.click()
    const winner = page.getByRole('button', { name: /^Winner$/i }).first()
    if (await winner.count()) await winner.click()
    await page.waitForTimeout(200)
    const save = page.getByRole('button', { name: /Save fix/i }).first()
    if (!(await save.isDisabled())) {
      await save.click()
      await page.waitForTimeout(1200)
      pass('Save fix incomplete')
    } else fail('Save fix incomplete', 'disabled')
    await shot('12-after-fix')
  } else fail('Fix incomplete Edit entry')

  // —— Details jump markers / Trim ——
  await page.goto(`${BASE}/matches/${matchId}?tab=details`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(900)
  await shot('13-details')
  const det = await page.locator('body').innerText()
  if (/Jump markers|First serve|Set end/i.test(det)) pass('Details jump markers')
  else
    fail(
      'Details jump markers',
      det
        .split('\n')
        .filter((l) => /jump|serve|trim|video/i.test(l))
        .slice(0, 10)
        .join(' | ')
    )
  if (/\bTrim\b|Trim dead air/i.test(det)) pass('Details Trim entry')
  else fail('Details Trim entry')
  if (/\bArchive\b/i.test(det)) pass('Details Archive entry')
  else fail('Details Archive entry')

  // —— Account / Training ——
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await shot('14-account')
  const acct = await page.locator('body').innerText()
  if (/Account|Import|Training|Sign in|device/i.test(acct)) pass('Account screen')
  else fail('Account screen')

  const trainLink = page
    .getByRole('link', { name: /Training/i })
    .or(page.getByRole('button', { name: /Training/i }))
  if (await trainLink.count()) {
    await trainLink.first().click()
    await page.waitForTimeout(800)
  } else {
    await page.goto(BASE + '/training', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
  }
  await shot('15-training')
  const train = await page.locator('body').innerText()
  if (/Training|Back to Home|practice|coming/i.test(train)) pass('Training screen')
  else fail('Training screen', train.slice(0, 100))

  const failed = results.filter((r) => !r.ok)
  console.log('\n=== SMOKE @390 SUMMARY ===')
  console.log(
    `PASS ${results.filter((r) => r.ok).length} / FAIL ${failed.length} / TOTAL ${results.length}`
  )
  for (const f of failed)
    console.log('  • ' + f.name + (f.detail ? ': ' + f.detail : ''))
  fs.writeFileSync(
    path.join(OUT, 'results.json'),
    JSON.stringify({ results, failed: failed.length, matchId, base: BASE }, null, 2)
  )
  if (failed.length) process.exitCode = 1
  console.log('DONE → ' + OUT)
} catch (e) {
  console.error('SMOKE CRASH', e)
  try {
    await shot('99-error')
  } catch {
    /* ignore */
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
