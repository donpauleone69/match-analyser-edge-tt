/**
 * Persistence gate. Tags six rallies across a set change, exports every row,
 * reloads, and exports again. The two exports match, the matches page matches,
 * then the invariant catalog and the golden derivation run over those rows.
 *
 *   npm run check:persist
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { compareShots } from '../smoke/compare.mjs'
import { assertFont, installFontCache } from '../smoke/fonts.mjs'
import { VIEWPORTS, contextOptions, waitForApp } from '../smoke/routes.mjs'
import { runTagging } from '../smoke/tagging-run.mjs'

const NOW = new Date('2026-11-21T12:00:00Z')
const PAUSE_AT = new Date(NOW.getTime() + 1000)
const CHROME = '/usr/local/bin/google-chrome'
const PORT = 4320
const BASE = `http://127.0.0.1:${PORT}`
const DB_NAME = 'edge-tt-matches-demo'
const TABLES = ['opponents', 'events', 'matches', 'videos', 'sets', 'rallies', 'shots', 'drafts']
const SHOT = '393x660/persist-matches.png'

const here = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(here, '../..')
const outDir = path.join(here, 'out')
const beforeDir = path.join(outDir, 'before')
const afterDir = path.join(outDir, 'after')
const rowsFile = path.join(outDir, 'rows.json')
const cacheDir = path.join(appDir, 'tests/smoke/.cache/fonts')

const STILL = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}'
    document.head.appendChild(style)
  })
}

let preview = null
let browser = null
let pass = false

function killGroup(child, signal) {
  if (!child || child.exitCode !== null) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      /* already gone */
    }
  }
}

async function stopPreview() {
  const child = preview
  if (!child || child.exitCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  killGroup(child, 'SIGTERM')
  const killer = setTimeout(() => killGroup(child, 'SIGKILL'), 2000)
  await exited
  clearTimeout(killer)
}

async function waitForPreview() {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (preview && preview.exitCode !== null) throw new Error(`vite preview exited ${preview.exitCode}`)
    try {
      const res = await fetch(BASE)
      if (res.status === 200) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('preview did not return 200 within 20s')
}

function canon(rows) {
  const out = {}
  for (const table of TABLES) {
    const key = table === 'drafts' ? 'setId' : 'id'
    out[table] = [...(rows[table] ?? [])].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0))
  }
  return JSON.stringify(out)
}

async function dumpRows(page) {
  return page.evaluate(
    async ({ dbName, tables }) => {
      const open = indexedDB.open(dbName)
      const db = await new Promise((resolve, reject) => {
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
      const rows = {}
      for (const table of tables) {
        const request = db.transaction(table, 'readonly').objectStore(table).getAll()
        rows[table] = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      }
      db.close()
      return rows
    },
    { dbName: DB_NAME, tables: TABLES },
  )
}

async function shoot(page, file) {
  await assertFont(page)
  await page.mouse.move(0, 0)
  const shot = { animations: 'disabled', caret: 'hide' }
  await page.screenshot(shot)
  await page.screenshot({ ...shot, path: file })
}

async function main() {
  if (!existsSync(CHROME)) throw new Error(`chrome missing at ${CHROME}`)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(path.join(beforeDir, '393x660'), { recursive: true })
  mkdirSync(path.join(afterDir, '393x660'), { recursive: true })

  console.log('vite build')
  const build = spawnSync(path.join(appDir, 'node_modules', '.bin', 'vite'), ['build'], { cwd: appDir, stdio: 'inherit' })
  if (build.status !== 0) throw new Error(`vite build exited ${build.status}`)

  preview = spawn(
    path.join(appDir, 'node_modules', '.bin', 'vite'),
    ['preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: appDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  preview.stdout.on('data', (chunk) => process.stdout.write(chunk))
  preview.stderr.on('data', (chunk) => process.stderr.write(chunk))
  await waitForPreview()
  console.log(`preview ${BASE}`)

  browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--num-raster-threads=1',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling',
      '--disable-checker-imaging',
      '--disable-partial-raster',
    ],
  })
  console.log(`chrome ${browser.version()}`)

  const vp = VIEWPORTS[0]
  const context = await browser.newContext(contextOptions(vp))
  await installFontCache(context, cacheDir)
  await context.addInitScript(STILL)
  const page = await context.newPage()
  await page.clock.install({ time: NOW })
  await page.clock.pauseAt(PAUSE_AT)
  page.setDefaultTimeout(120000)
  page.on('pageerror', (err) => console.error(`page error: ${err.message}`))

  const tagDir = path.join(outDir, 'tagging')
  await runTagging(
    page,
    BASE,
    vp,
    async (current) => {
      await assertFont(current)
    },
    async (name) => {
      const file = path.join(tagDir, name)
      mkdirSync(path.dirname(file), { recursive: true })
      await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' })
    },
    waitForApp,
  )

  const before = await dumpRows(page)
  await page.clock.runFor(300)
  await shoot(page, path.join(beforeDir, SHOT))

  await page.reload({ waitUntil: 'load' })
  await waitForApp(page)
  await page.clock.runFor(1000)
  const after = await dumpRows(page)
  await shoot(page, path.join(afterDir, SHOT))
  await context.close()

  const sameRows = canon(before) === canon(after)
  console.log(`rows ${sameRows ? 'identical' : 'DIFFER'} after reload`)
  if (!sameRows) {
    writeFileSync(path.join(outDir, 'rows-before.json'), JSON.stringify(before))
    writeFileSync(path.join(outDir, 'rows-after.json'), JSON.stringify(after))
  }
  writeFileSync(rowsFile, JSON.stringify(after))

  const comparePage = await browser.newPage()
  await comparePage.goto('about:blank')
  const compared = await compareShots(comparePage, { outDir: afterDir, baselineDir: beforeDir, names: [SHOT] })
  await comparePage.close()
  const sameShot = compared.pass
  console.log(`screenshot ${sameShot ? 'identical' : 'DIFFERS'}`)

  console.log('vitest over the rows read back')
  const vitest = spawnSync(path.join(appDir, 'node_modules', '.bin', 'vitest'), ['run', '--config', 'tests/persist/vitest.config.ts'], {
    cwd: appDir,
    stdio: 'inherit',
    env: { ...process.env, TZ: 'UTC', PERSIST_ROWS_FILE: rowsFile },
  })
  const nodePass = vitest.status === 0
  console.log(`node checks ${nodePass ? 'pass' : 'fail'}`)
  pass = sameRows && sameShot && nodePass
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.stack || err.message : err)
  pass = false
} finally {
  if (browser) await browser.close().catch(() => {})
  await stopPreview()
}

console.log(pass ? 'check:persist pass' : 'check:persist fail')
process.exit(pass ? 0 : 1)
