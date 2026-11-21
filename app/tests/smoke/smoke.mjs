/**
 * Page smoke. Builds, serves itself on 127.0.0.1:4318, shots every route and
 * the six-rally run, runs the three page scripts, then compares pixels.
 *
 *   npm run smoke
 *   npm run smoke -- --write-baseline
 *   SMOKE_BASELINE=/path npm run smoke
 */
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { assertFont, fontStats, installFontCache } from './fonts.mjs'
import { URL_ASSERTIONS, VIEWPORTS, assertUrls, captureRoutes, contextOptions } from './routes.mjs'
import { runTagging } from './tagging-run.mjs'
import { compareShots } from './compare.mjs'

const NOW = new Date('2026-11-21T12:00:00Z')
const PAUSE_AT = new Date(NOW.getTime() + 1000)
const CHROME = '/usr/local/bin/google-chrome'
const PORT = 4318
const BASE = `http://127.0.0.1:${PORT}`
const DEFAULT_BASELINE = '/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/refactor/before'
const PAGE_SCRIPTS = [
  'checks/v01723-tag-page.check.mjs',
  'checks/v01725-matches-page.check.mjs',
  'checks/v01726-insights-page.check.mjs',
]

const smokeDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(smokeDir, '../..')
const outDir = path.join(smokeDir, 'out')
const cacheDir = path.join(smokeDir, '.cache', 'fonts')
const baselineDir = process.env.SMOKE_BASELINE || DEFAULT_BASELINE
const writeBaseline = process.argv.includes('--write-baseline')
const force = process.argv.includes('--force')

const STILL = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}'
    document.head.appendChild(style)
  })
}

let preview = null
let browser = null
const started = Date.now()
const report = { pass: false, chrome: '', shots: [], checks: [], ms: 0 }

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

function stopPreviewSync() {
  killGroup(preview, 'SIGTERM')
}

async function stopPreview() {
  const child = preview
  if (!child) return
  if (child.exitCode !== null) {
    preview = null
    return
  }
  const exited = new Promise((resolve) => child.once('exit', resolve))
  killGroup(child, 'SIGTERM')
  const killer = setTimeout(() => killGroup(child, 'SIGKILL'), 2000)
  await exited
  clearTimeout(killer)
  if (preview === child) preview = null
}

function onSignal(sig) {
  console.error(`smoke: ${sig}`)
  stopPreviewSync()
  process.exit(sig === 'SIGINT' ? 130 : 143)
}
process.on('SIGINT', () => onSignal('SIGINT'))
process.on('SIGTERM', () => onSignal('SIGTERM'))

function directoryEmpty(dir) {
  if (!existsSync(dir)) return true
  return readdirSync(dir).length === 0
}

function gitCommit() {
  const run = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: appDir, encoding: 'utf8' })
  if (run.status !== 0) throw new Error('git rev-parse HEAD failed')
  return run.stdout.trim()
}

async function waitForPreview() {
  const deadline = Date.now() + 20000
  let last = 'no response'
  while (Date.now() < deadline) {
    if (preview && preview.exitCode !== null) throw new Error(`vite preview exited ${preview.exitCode}`)
    try {
      const res = await fetch(BASE)
      if (res.status === 200) return
      last = `status ${res.status}`
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`preview did not return 200 within 20s (${last})`)
}

async function installClock(page) {
  await page.clock.install({ time: NOW })
  await page.clock.pauseAt(PAUSE_AT)
  page.setDefaultTimeout(15000)
}

async function prepare(page) {
  await assertFont(page)
}

async function shoot(page, name) {
  await page.mouse.move(0, 0)
  const file = path.join(outDir, name)
  mkdirSync(path.dirname(file), { recursive: true })
  const shot = { animations: 'disabled', caret: 'hide' }
  // The clock is paused, so the first capture can land before the
  // animation-disable style has painted. That frame is not stable across
  // launches. The next capture is, and it stays that way.
  await page.screenshot(shot)
  await page.screenshot({ ...shot, path: file })
}

async function openContext(vp) {
  const context = await browser.newContext(contextOptions(vp))
  await installFontCache(context, cacheDir)
  await context.addInitScript(STILL)
  return context
}

function runPageScript(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(smokeDir, script)], {
      cwd: appDir,
      env: { ...process.env, BASE },
      stdio: 'inherit',
    })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
    }, 300000)
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      if (signal) resolve(1)
      else resolve(code ?? 1)
    })
  })
}

function publishBaseline(names) {
  mkdirSync(baselineDir, { recursive: true })
  for (const vp of VIEWPORTS) {
    const from = path.join(outDir, vp.name)
    const to = path.join(baselineDir, vp.name)
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true })
  }
  const manifest = {
    chrome: report.chrome,
    commit: gitCommit(),
    viewports: VIEWPORTS.map((vp) => ({ name: vp.name, width: vp.width, height: vp.height })),
    shots: names,
  }
  writeFileSync(path.join(baselineDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function readManifest() {
  const file = path.join(baselineDir, 'manifest.json')
  if (!existsSync(file)) throw new Error(`baseline manifest missing: ${file}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function main() {
  if (!existsSync(CHROME)) throw new Error(`chrome missing at ${CHROME}`)
  if (writeBaseline) {
    if (!directoryEmpty(baselineDir) && !force) {
      throw new Error(`baseline is not empty: ${baselineDir} (pass --force to replace)`)
    }
    mkdirSync(baselineDir, { recursive: true })
  }

  console.log('vite build')
  const build = spawnSync(path.join(appDir, 'node_modules', '.bin', 'vite'), ['build'], {
    cwd: appDir,
    stdio: 'inherit',
  })
  if (build.status !== 0) throw new Error(`vite build exited ${build.status}`)

  preview = spawn(path.join(appDir, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: appDir,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
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
      // A 6px circle that sits on a quarter pixel (the server dot) and a card
      // corner were rastered differently on each launch while threaded. One
      // raster thread makes those edges identical. No pixel tolerance.
      '--num-raster-threads=1',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling',
      '--disable-checker-imaging',
      '--disable-partial-raster',
    ],
  })
  report.chrome = browser.version()
  console.log(`chrome ${report.chrome}`)

  const manifestPath = path.join(baselineDir, 'manifest.json')
  if (existsSync(manifestPath)) {
    const existing = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (existing.chrome !== report.chrome) {
      throw new Error(`chrome ${report.chrome} differs from baseline manifest ${existing.chrome}`)
    }
  } else if (!writeBaseline) {
    throw new Error(`baseline manifest missing: ${manifestPath}`)
  }

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const taken = []
  for (const vp of VIEWPORTS) {
    const context = await openContext(vp)
    const page = await context.newPage()
    await installClock(page)
    taken.push(...(await captureRoutes(page, BASE, vp, prepare, (name) => shoot(page, name))))
    if (vp === VIEWPORTS[0]) {
      await assertUrls(page, BASE)
      console.log(`urls ${URL_ASSERTIONS.length}`)
    }
    await page.close()

    const tagPage = await context.newPage()
    await installClock(tagPage)
    taken.push(...(await runTagging(tagPage, BASE, vp, prepare, (name) => shoot(tagPage, name))))
    await context.close()
  }

  for (const script of PAGE_SCRIPTS) {
    console.log(`check ${script}`)
    const exit = await runPageScript(script)
    report.checks.push({ script, exit })
    console.log(`check ${script} exit ${exit}`)
  }

  let manifest = null
  if (writeBaseline) {
    manifest = publishBaseline(taken)
    console.log(`baseline ${baselineDir} commit ${manifest.commit} shots ${manifest.shots.length}`)
  } else {
    manifest = readManifest()
  }

  const expected = new Set(manifest.shots)
  const actual = new Set(taken)
  const union = [...manifest.shots]
  for (const name of taken) {
    if (!expected.has(name)) union.push(name)
  }
  const missing = manifest.shots.filter((name) => !actual.has(name))
  const extra = taken.filter((name) => !expected.has(name))
  if (missing.length || extra.length) {
    console.error(`shot set missing=${missing.length} extra=${extra.length}`)
    for (const name of missing) console.error(`missing ${name}`)
    for (const name of extra) console.error(`extra ${name}`)
  }

  const comparePage = await browser.newPage()
  await comparePage.goto('about:blank')
  const compared = await compareShots(comparePage, { outDir, baselineDir, names: union })
  await comparePage.close()
  report.shots = compared.shots

  const checksPass = report.checks.every((check) => check.exit === 0)
  const setPass = missing.length === 0 && extra.length === 0
  report.pass = compared.pass && checksPass && setPass
  const diffs = report.shots.reduce((sum, shot) => sum + (shot.diffPixels > 0 ? shot.diffPixels : 0), 0)
  const fonts = fontStats()
  console.log(`fonts fetched ${fonts.fetched} reused ${fonts.reused}`)
  console.log(`${report.pass ? 'pass' : 'fail'} shots ${report.shots.length} diffPixels ${diffs}`)
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.stack || err.message : err)
  report.pass = false
} finally {
  report.ms = Date.now() - started
  if (browser) await browser.close().catch(() => {})
  await stopPreview()
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`report ${path.join(outDir, 'report.json')} ${report.ms}ms`)
}

process.exit(report.pass ? 0 : 1)
