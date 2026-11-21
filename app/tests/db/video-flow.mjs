/**
 * The on-device video copy, through the app in Chrome (part of `npm run check:db`).
 * Empty mode, so the user database. Add a file, the copy lands with identical
 * bytes; reload plays from the copy; a lost copy shows Find video; a file that
 * differs asks once; the same file is taken without asking; Remove and Delete
 * match delete the copy; a failed copy says so and still plays.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { waitForApp } from '../smoke/routes.mjs'

const FILE_A = '/tmp/opfs-check-a.mp4'
const FILE_B = '/tmp/opfs-check-b.mp4'
const DIR = 'edge-tt-videos'
const DB = 'edge-tt-matches'

function ensureFile(path, color) {
  if (existsSync(path)) return
  const run = spawnSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=64x64:d=20`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '20', path],
    { stdio: 'ignore' },
  )
  if (run.status !== 0) throw new Error(`ffmpeg failed for ${path}`)
}

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

async function videoRows(page) {
  return page.evaluate(async (dbName) => {
    const open = indexedDB.open(dbName)
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    const req = db.transaction('videos', 'readonly').objectStore('videos').getAll()
    const rows = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return rows.map(({ demoScript, ...row }) => row)
  }, DB)
}

/** sha-256 of the copy in the user folder, or null when it is not there. */
async function copyHash(page, videoId) {
  return page.evaluate(
    async ({ dir, id }) => {
      try {
        const root = await navigator.storage.getDirectory()
        const user = await (await root.getDirectoryHandle(dir)).getDirectoryHandle('user')
        const file = await (await user.getFileHandle(id)).getFile()
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
      } catch {
        return null
      }
    },
    { dir: DIR, id: videoId },
  )
}

async function userCopies(page) {
  return page.evaluate(async (dir) => {
    try {
      const root = await navigator.storage.getDirectory()
      const user = await (await root.getDirectoryHandle(dir)).getDirectoryHandle('user')
      const names = []
      for await (const name of user.keys()) names.push(name)
      return names
    } catch {
      return []
    }
  }, DIR)
}

async function dropCopy(page, videoId) {
  await page.evaluate(
    async ({ dir, id }) => {
      const root = await navigator.storage.getDirectory()
      const user = await (await root.getDirectoryHandle(dir)).getDirectoryHandle('user')
      await user.removeEntry(id)
    },
    { dir: DIR, id: videoId },
  )
}

/** sha-256 of what the <video> element plays, fetched from its blob URL. */
async function playing(page) {
  return page.evaluate(async () => {
    const el = document.querySelector('video')
    if (!el) return null
    const src = el.getAttribute('src') ?? ''
    const res = await fetch(src)
    const digest = await crypto.subtle.digest('SHA-256', await res.arrayBuffer())
    return { src, vid: el.dataset.vid, hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') }
  })
}

async function waitFor(fn, what, ms = 15000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const got = await fn()
    if (got) return got
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`timed out waiting for ${what}`)
}

async function newMatchOnTag(page, base) {
  await page.goto(`${base}/matches`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.waitForURL(/\/matches\/[^/]+\/details$/)
  const matchId = page.url().split('/').at(-2)
  await page.getByRole('link', { name: 'Tag', exact: true }).click()
  await page.waitForURL(/\/tag$/)
  return matchId
}

async function openTag(page, base, matchId) {
  await page.goto(`${base}/matches/${matchId}/tag`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.waitForSelector('[data-video-block]')
}

async function emptyMode(context, base) {
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', (err) => console.error(`app page error: ${err.message}`))
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await waitForApp(page)
  await page.evaluate(() => localStorage.setItem('proto-demo-mode', 'empty'))
  return page
}

export async function runVideoFlow(browser, base) {
  ensureFile(FILE_A, 'blue')
  ensureFile(FILE_B, 'red')
  const hashA = sha(FILE_A)
  const hashB = sha(FILE_B)
  const checks = []
  const ok = (name, cond, detail = '') => checks.push({ name, ok: Boolean(cond), problems: cond ? [] : [detail || 'failed'] })

  const context = await browser.newContext({ viewport: { width: 393, height: 660 } })
  try {
    const page = await emptyMode(context, base)
    const matchId = await newMatchOnTag(page, base)

    await page.locator('input[type=file]').setInputFiles(FILE_A)
    await page.waitForSelector('[data-video-block]')
    const videoId = await page.locator('[data-video-block]').first().getAttribute('data-video-block')
    const row = await waitFor(async () => (await videoRows(page)).find((r) => r.id === videoId && r.storedOnDevice), 'storedOnDevice')
    const stat = statSync(FILE_A)
    ok(
      'add: the row stores the flag, exact size, last modified and a fingerprint',
      row.sizeBytes === stat.size && row.lastModifiedMs === Math.floor(stat.mtimeMs) && /^[0-9a-f]{64}$/.test(row.fingerprint ?? '') && row.matchId === matchId,
      JSON.stringify(row),
    )
    ok('add: the copy has the same bytes as the file', (await copyHash(page, videoId)) === hashA)
    const first = await playing(page)
    ok('add: the picked file plays at once', first?.hash === hashA && first.vid === videoId, JSON.stringify(first))

    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
    await openTag(page, base, matchId)
    const reloaded = await waitFor(() => playing(page), 'a video after reload')
    ok('reload: plays from the copy (new blob URL, same bytes)', reloaded.hash === hashA && reloaded.src.startsWith('blob:') && reloaded.src !== first.src, JSON.stringify(reloaded))
    await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 1)
    ok('reload: the copy loads as a video', true)
    ok('reload: no Find video', (await page.locator('[data-video-missing]').count()) === 0)

    await dropCopy(page, videoId)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
    await openTag(page, base, matchId)
    const card = page.locator(`[data-video-block="${videoId}"]`)
    ok('missing: the card offers Find video', (await card.getByRole('button', { name: 'Find video' }).count()) === 1)
    ok('missing: the picture says so and has no video', (await page.locator('.tag-picture [data-video-missing]').innerText()) === 'Video not on this device' && (await page.locator('video').count()) === 0)

    await card.locator('[data-video-missing] input[type=file]').setInputFiles(FILE_B)
    const ask = card.getByRole('alertdialog')
    await ask.waitFor()
    ok('re-pick: a file that differs asks once', (await ask.innerText()).includes('That file does not match video 1. Use it anyway?'))
    await ask.getByRole('button', { name: 'Cancel' }).click()
    const afterCancel = (await videoRows(page)).find((r) => r.id === videoId)
    ok('re-pick: Cancel changes nothing', afterCancel.fingerprint === row.fingerprint && (await page.locator('video').count()) === 0 && (await copyHash(page, videoId)) === null, JSON.stringify(afterCancel))

    await card.locator('[data-video-missing] input[type=file]').setInputFiles(FILE_A)
    const back = await waitFor(() => playing(page), 'the re-picked video')
    ok('re-pick: the same file is taken without asking and plays', back.hash === hashA && (await ask.count()) === 0)
    await waitFor(async () => (await copyHash(page, videoId)) === hashA && (await videoRows(page)).find((r) => r.id === videoId)?.storedOnDevice, 'the re-picked copy')
    ok('re-pick: copied again with the same bytes', true)

    await dropCopy(page, videoId)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)
    await openTag(page, base, matchId)
    await card.locator('[data-video-missing] input[type=file]').setInputFiles(FILE_B)
    await ask.waitFor()
    await ask.getByRole('button', { name: 'Use it' }).click()
    const used = await waitFor(() => playing(page), 'the file used anyway')
    const usedRow = await waitFor(async () => {
      const r = (await videoRows(page)).find((x) => x.id === videoId)
      return r?.storedOnDevice && r.fingerprint !== row.fingerprint ? r : null
    }, 'the row of the file used anyway')
    ok('use anyway: plays the new file, copies it and stores its facts', used.hash === hashB && (await copyHash(page, videoId)) === hashB && usedRow.sizeBytes === statSync(FILE_B).size, JSON.stringify(usedRow))

    await card.getByRole('button', { name: 'Remove', exact: true }).click()
    await card.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click()
    await waitFor(async () => (await videoRows(page)).every((r) => r.id !== videoId), 'the row to go')
    await waitFor(async () => (await copyHash(page, videoId)) === null, 'the copy to go', 5000).catch(() => null)
    ok('remove: the copy is deleted', (await copyHash(page, videoId)) === null && (await userCopies(page)).length === 0, (await userCopies(page)).join(','))

    await page.locator('input[type=file]').setInputFiles(FILE_A)
    await page.waitForSelector('[data-video-block]')
    const second = await page.locator('[data-video-block]').first().getAttribute('data-video-block')
    await waitFor(async () => (await copyHash(page, second)) === hashA, 'the second copy')
    await page.getByRole('link', { name: 'Details', exact: true }).click()
    await page.getByRole('button', { name: 'Delete match' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete match' })
    if ((await confirm.count()) > 0) await confirm.getByRole('button', { name: 'Delete', exact: true }).click()
    await waitFor(async () => (await videoRows(page)).every((r) => r.matchId !== matchId), 'the match rows to go')
    await waitFor(async () => (await userCopies(page)).length === 0, 'the copies to go', 5000).catch(() => null)
    ok('delete match: its copies are deleted', (await userCopies(page)).length === 0, (await userCopies(page)).join(','))

    const demoCopies = await page.evaluate(async (dir) => {
      try {
        const root = await navigator.storage.getDirectory()
        const demo = await (await root.getDirectoryHandle(dir)).getDirectoryHandle('demo')
        const names = []
        for await (const name of demo.keys()) names.push(name)
        return names
      } catch {
        return []
      }
    }, DIR)
    ok('demo: the demo folder holds nothing', demoCopies.length === 0, demoCopies.join(','))
    await page.close()
  } finally {
    await context.close()
  }

  const failing = await browser.newContext({ viewport: { width: 393, height: 660 } })
  try {
    await failing.addInitScript(() => {
      navigator.storage.getDirectory = () => Promise.reject(new DOMException('no file system', 'SecurityError'))
    })
    const page = await emptyMode(failing, base)
    await newMatchOnTag(page, base)
    await page.locator('input[type=file]').setInputFiles(FILE_A)
    await page.waitForSelector('[data-video-block]')
    const videoId = await page.locator('[data-video-block]').first().getAttribute('data-video-block')
    const toast = page.getByRole('status').filter({ hasText: 'Video not copied to this device' })
    await toast.waitFor()
    const row = await waitFor(async () => (await videoRows(page)).find((r) => r.id === videoId && r.fingerprint), 'the row after a failed copy')
    const plays = await playing(page)
    ok('failed copy: one short notice, storedOnDevice false, still plays', row.storedOnDevice === false && plays?.hash === hashA && (await toast.count()) === 1, JSON.stringify(row))
    await page.close()
  } finally {
    await failing.close()
  }
  return checks
}
