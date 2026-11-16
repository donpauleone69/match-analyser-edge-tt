/**
 * Badge clock time and the first-attack reaction allowance, at 390 x 844.
 * Run: node proto/scripts/slice-c-review.check.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5174'
const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })
const fails = []
const note = (ok, msg) => {
  console.log(`${ok ? 'ok' : 'FAIL'} ${msg}`)
  if (!ok) fails.push(msg)
}

async function setRate(page, want) {
  for (let i = 0; i < 8; i++) {
    const rate = await page.evaluate(() => document.querySelector('[data-tag-stage]')?.dataset.rate)
    if (rate === want) return
    await page.click('[aria-label^="Speed"]')
    await page.waitForTimeout(80)
  }
}

async function pressText(page, label) {
  const hit = await page.evaluate((name) => {
    const buttons = [...document.querySelectorAll('button')]
    const el = buttons.find((b) => b.textContent?.replace(/\s+/g, ' ').trim().startsWith(name))
    if (!el) return false
    el.click()
    return true
  }, label)
  note(hit, `press ${label}`)
  await page.waitForTimeout(150)
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/matches/m-partial/tag/2`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tag-stage]')
  await setRate(page, '0.75')
  // The open rally starts at the pick. No attack moves it on to the result, which loops the last shot.
  if ((await page.evaluate(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage)) === 'pickFa') {
    await page.click('[data-no-attack-row] button')
    await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'result', null, {
      timeout: 3000,
    })
  }
  const badge = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t0 = performance.now()
        let onAt = null
        let offAt = null
        let pos = null
        const step = () => {
          const el = document.querySelector('[data-shot-badge]')
          const now = performance.now()
          if (el && onAt === null) {
            onAt = now
            const br = el.getBoundingClientRect()
            const video = el.parentElement.getBoundingClientRect()
            pos = {
              left: Math.round(br.left - video.left),
              top: Math.round(br.top - video.top),
              width: Math.round(br.width),
              height: Math.round(br.height),
              videoW: Math.round(video.width),
              videoH: Math.round(video.height),
            }
          }
          if (!el && onAt !== null && offAt === null) offAt = now
          if ((offAt !== null && now - offAt > 40) || now - t0 > 8000) {
            const root = document.querySelector('[data-tag-stage]')
            resolve({
              dur: onAt !== null && offAt !== null ? (offAt - onAt) / 1000 : null,
              pos,
              rate: root?.dataset.rate,
              shot: el?.getAttribute('data-shot-badge') ?? null,
            })
          } else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
  )
  console.log('badge', JSON.stringify(badge))
  note(badge.rate === '0.75', `rate 0.75 while timing the badge (${badge.rate})`)
  note(badge.dur !== null && badge.dur >= 0.32 && badge.dur <= 0.48, `badge on the clock ${badge.dur?.toFixed(3)}s (want about 0.4, not 0.53)`)
  note(
    badge.pos && badge.pos.left < badge.pos.videoW * 0.35 && badge.pos.top < badge.pos.videoH * 0.45,
    `badge top left of the picture (${badge.pos?.left}, ${badge.pos?.top} in ${badge.pos?.videoW}x${badge.pos?.videoH})`
  )

  await page.goto(`${BASE}/matches/m-ready/tag/1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tap-pad]')
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(700)
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(450)
  await page.click('[data-tap-pad]')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'result', null, {
    timeout: 6000,
  })
  await page.waitForTimeout(700)
  await pressText(page, 'Winner')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot', null, {
    timeout: 4000,
  })
  await pressText(page, 'FH')
  await pressText(page, 'Block')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'ready', null, {
    timeout: 4000,
  })
  const two = await page.evaluate(() => {
    const row = document.querySelector('[data-fa-summary]')
    return {
      text: row?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
      change: Boolean(row?.querySelector('button')),
    }
  })
  console.log('two shot block', JSON.stringify(two))
  note(two.text === '2 shots · No attack' && !two.change, `two shots, Block: "${two.text}" change=${two.change}`)
  await page.screenshot({ path: `${OUT}/slice-c-two-shot-390.png` })

  await page.click('[data-tag-save]')
  await page.waitForTimeout(400)
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(500)
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(450)
  await page.click('[data-tap-pad]')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'result', null, {
    timeout: 6000,
  })
  await page.waitForTimeout(700)
  await pressText(page, 'Winner')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'endShot', null, {
    timeout: 4000,
  })
  await pressText(page, 'FH')
  await pressText(page, 'Loop')
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'ready', null, {
    timeout: 4000,
  })
  const twoLoop = await page.evaluate(() => {
    const row = document.querySelector('[data-fa-summary]')
    return {
      text: row?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
      change: Boolean(row?.querySelector('button')),
    }
  })
  console.log('two shot loop', JSON.stringify(twoLoop))
  note(
    twoLoop.text === '2 shots · First attack shot 2' && !twoLoop.change,
    `two shots, Loop: "${twoLoop.text}" change=${twoLoop.change}`
  )

  await page.click('[data-tag-save]')
  await page.waitForTimeout(400)
  await page.click('[data-tap-pad]')
  await page.waitForTimeout(500)
  for (let i = 0; i < 4; i++) {
    await page.click('[data-tap-pad]')
    await page.waitForTimeout(500)
  }
  // Five shots: the pick comes straight after the close, before the result.
  await page.waitForFunction(() => document.querySelector('[data-tag-stage]')?.dataset.tagStage === 'pickFa', null, {
    timeout: 6000,
  })
  await page.waitForTimeout(700)

  const serveLook = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t0 = performance.now()
        let serve = null
        let later = null
        const step = () => {
          const root = document.querySelector('[data-tag-stage]')
          const contacts = (root?.dataset.contacts ?? '').split(',').filter(Boolean).map(Number)
          const local = Number(root?.dataset.time)
          const reached = contacts.filter((c) => c <= local + 0.05).length
          const btn = document.querySelector('[data-tag-fa]')
          const sample = {
            reached,
            disabled: btn?.disabled ?? null,
            text: btn?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            h: btn ? Math.round(btn.getBoundingClientRect().height) : 0,
          }
          if (reached === 1 && !serve) serve = sample
          if (reached >= 2 && !later) later = sample
          if ((serve && later) || performance.now() - t0 > 6000) resolve({ serve, later })
          else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
  )
  console.log('serve look', JSON.stringify(serveLook))
  note(
    serveLook.serve?.disabled === true && serveLook.serve.text.startsWith('First attack'),
    `serve on screen: button disabled, still "First attack" (${serveLook.serve?.text}, h ${serveLook.serve?.h})`
  )
  note(
    serveLook.later?.disabled === false && serveLook.later.text.startsWith('First attack'),
    `later shot on screen: button normal (${serveLook.later?.text}, h ${serveLook.later?.h})`
  )
  note(serveLook.serve?.h === 80 && serveLook.later?.h === 80, 'button height stays 80')

  const picked = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t0 = performance.now()
        const step = () => {
          const root = document.querySelector('[data-tag-stage]')
          const contacts = (root?.dataset.contacts ?? '').split(',').filter(Boolean).map(Number)
          const local = Number(root?.dataset.time)
          const reached = contacts.filter((c) => c <= local + 0.05).length
          const lagged = contacts.filter((c) => c <= local - 0.3 + 0.05).length
          const into = reached > 0 ? local - contacts[reached - 1] : 99
          if (reached >= 3 && lagged >= 2 && lagged < reached && into >= 0.05 && into <= 0.2) {
            document.querySelector('[data-tag-fa]')?.click()
            resolve({ local, reached, lagged, into, contacts })
            return
          }
          if (performance.now() - t0 > 8000) resolve({ local, reached, lagged, into, contacts, missed: true })
          else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
  )
  await page.waitForTimeout(200)
  const fa = await page.evaluate(() => document.querySelector('[data-tag-stage]')?.dataset.fa ?? '')
  console.log('press', JSON.stringify(picked), 'fa', fa)
  note(!picked.missed && fa === String(picked.lagged) && fa !== String(picked.reached), `press picks the shot 0.3s earlier (on screen ${picked.reached}, 0.3s before ${picked.lagged}, picked ${fa})`)

  await browser.close()
  if (fails.length) {
    console.error(`FAILED ${fails.length}`)
    process.exit(1)
  }
  console.log('review check passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
