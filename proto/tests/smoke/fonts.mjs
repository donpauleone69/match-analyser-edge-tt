/**
 * Serves Google Fonts from tests/smoke/.cache/fonts/<sha1(url)>.
 * A miss calls route.fetch() and saves the body. A fetch failure with an
 * empty cache fails the smoke with a fonts message. Later runs stay offline.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const FONT_HOSTS = /https?:\/\/fonts\.(googleapis|gstatic)\.com\//
const KEPT_HEADERS = ['content-type', 'access-control-allow-origin', 'access-control-allow-credentials', 'timing-allow-origin']

let fontError = null
let fetched = 0
let reused = 0

export function fontFailure() {
  return fontError
}

export function fontStats() {
  return { fetched, reused }
}

function sha1(url) {
  return createHash('sha1').update(url).digest('hex')
}

function cacheEmpty(cacheDir) {
  if (!existsSync(cacheDir)) return true
  return readdirSync(cacheDir).every((name) => name.endsWith('.meta.json') || name.endsWith('.tmp'))
}

function keepHeaders(headers) {
  const out = {}
  for (const key of KEPT_HEADERS) {
    if (headers[key]) out[key] = headers[key]
  }
  return out
}

async function fulfillFromDisk(route, bodyPath, metaPath) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const body = readFileSync(bodyPath)
  await route.fulfill({ status: meta.status, headers: meta.headers, body })
}

export async function installFontCache(context, cacheDir) {
  mkdirSync(cacheDir, { recursive: true })
  const inflight = new Map()

  await context.route(FONT_HOSTS, async (route) => {
    const url = route.request().url()
    const hash = sha1(url)
    const bodyPath = path.join(cacheDir, hash)
    const metaPath = `${bodyPath}.meta.json`
    try {
      if (existsSync(bodyPath) && existsSync(metaPath)) {
        reused += 1
        await fulfillFromDisk(route, bodyPath, metaPath)
        return
      }

      let job = inflight.get(url)
      if (!job) {
        job = saveFont(route, url, bodyPath, metaPath, cacheDir)
        inflight.set(url, job)
        try {
          await job
        } finally {
          inflight.delete(url)
        }
        return
      }

      await job
      reused += 1
      await fulfillFromDisk(route, bodyPath, metaPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      fontError = message.startsWith('fonts:') ? message : `fonts: ${message}`
      throw new Error(fontError)
    }
  })
}

async function saveFont(route, url, bodyPath, metaPath, cacheDir) {
  let response
  try {
    response = await route.fetch()
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    if (cacheEmpty(cacheDir)) throw new Error(`fonts: cache is empty and fetch failed (${why})`)
    throw new Error(`fonts: fetch failed (${why})`)
  }
  const status = response.status()
  const body = await response.body()
  if (status !== 200 || body.length === 0) {
    const empty = cacheEmpty(cacheDir) ? ' cache is empty and' : ''
    throw new Error(`fonts:${empty} ${status} empty=${body.length === 0} for ${url}`)
  }
  const headers = keepHeaders(response.headers())
  if (!headers['content-type']) {
    headers['content-type'] = url.includes('css') ? 'text/css; charset=utf-8' : 'font/woff2'
  }
  const tmp = `${bodyPath}.tmp`
  writeFileSync(tmp, body)
  renameSync(tmp, bodyPath)
  writeFileSync(metaPath, `${JSON.stringify({ status, headers })}\n`)
  fetched += 1
  await route.fulfill({ status, headers, body })
}

/**
 * Wait until Plus Jakarta Sans is in, including the sizes the pages actually
 * draw, and force a reflow. Call this before the clock runs, so a font arriving
 * mid-runFor cannot change antialiasing between launches.
 */
export async function assertFont(page) {
  if (fontError) throw new Error(fontError)
  await page.evaluate(async () => {
    await document.fonts.ready
    const loads = []
    for (const weight of [400, 500, 600, 700]) {
      for (const size of [10, 11, 12, 14, 16, 22, 24]) {
        loads.push(document.fonts.load(`${weight} ${size}px "Plus Jakarta Sans"`))
      }
    }
    await Promise.all(loads)
    await document.fonts.ready
    document.body.offsetHeight
  })
  const loaded = await page.evaluate(() => document.fonts.check('600 16px "Plus Jakarta Sans"'))
  if (!loaded) throw new Error('fonts: Plus Jakarta Sans 600 16px is not loaded')
}
