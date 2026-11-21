/**
 * Database check. Serves the test-only harness (tests/db/harness.html, not in
 * the build) with a Vite dev server on 127.0.0.1:4319, runs it in Chrome, then
 * the on-device video copy through the app on the same server
 * (tests/db/video-flow.mjs), then the invariants and golden outputs in node
 * over the rows Chrome read back.
 *
 *   npm run check:db
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'
import { runVideoFlow } from './video-flow.mjs'

const CHROME = '/usr/local/bin/google-chrome'
const PORT = 4319
const BASE = `http://127.0.0.1:${PORT}`

const dbDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(dbDir, '../..')
const outDir = path.join(dbDir, 'out')
const rowsFile = path.join(outDir, 'rows.json')

let server = null
let browser = null
let pass = false

async function main() {
  if (!existsSync(CHROME)) throw new Error(`chrome missing at ${CHROME}`)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  server = await createServer({
    root: appDir,
    configFile: path.join(appDir, 'vite.config.ts'),
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: PORT, strictPort: true, hmr: false },
    optimizeDeps: { entries: ['tests/db/harness.html', 'index.html'] },
  })
  await server.listen()
  console.log(`harness ${BASE}/tests/db/harness.html`)

  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  console.log(`chrome ${browser.version()}`)
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', (err) => console.error(`page error: ${err.message}`))
  page.on('response', (res) => {
    if (res.status() >= 400) console.error(`http ${res.status()} ${res.url()}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`console: ${msg.text()}`)
  })
  page.setDefaultTimeout(120000)
  await page.goto(`${BASE}/tests/db/harness.html`, { waitUntil: 'load' })
  await page.waitForFunction(() => Boolean(window.__dbCheck))
  const result = await page.evaluate(() => window.__dbCheck.run())
  await context.close()

  let browserPass = true
  for (const check of result.checks) {
    console.log(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}`)
    for (const problem of check.problems) console.log(`     ${problem}`)
    if (!check.ok) browserPass = false
  }
  console.log('video copy through the app')
  const flow = await runVideoFlow(browser, BASE)
  for (const check of flow) {
    console.log(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}`)
    for (const problem of check.problems) console.log(`     ${problem}`)
    if (!check.ok) browserPass = false
  }
  result.checks.push(...flow)
  console.log(`storage ${JSON.stringify(result.storage)}`)
  if (!result.rows) throw new Error('the harness returned no rows')
  writeFileSync(rowsFile, JSON.stringify(result.rows))
  const counts = Object.entries(result.rows).map(([table, rows]) => `${table} ${rows.length}`)
  console.log(`rows read back: ${counts.join(', ')}`)

  console.log('vitest over the rows read back')
  const vitest = spawnSync(
    path.join(appDir, 'node_modules', '.bin', 'vitest'),
    ['run', '--config', 'tests/db/vitest.config.ts'],
    { cwd: appDir, stdio: 'inherit', env: { ...process.env, TZ: 'UTC', DB_ROWS_FILE: rowsFile } },
  )
  const nodePass = vitest.status === 0
  console.log(`browser checks ${browserPass ? 'pass' : 'fail'} (${result.checks.length}), node checks ${nodePass ? 'pass' : 'fail'}`)
  pass = browserPass && nodePass
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.stack || err.message : err)
  pass = false
} finally {
  if (browser) await browser.close().catch(() => {})
  if (server) await server.close().catch(() => {})
}

console.log(pass ? 'check:db pass' : 'check:db fail')
process.exit(pass ? 0 : 1)
