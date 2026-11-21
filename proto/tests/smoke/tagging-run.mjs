/**
 * Six rallies across a set change and a finish. Twelve shots per viewport.
 * No second goto: a reload would reset the seed, which lives in memory.
 */

function fail(message) {
  throw new Error(message)
}

async function padLabel(page) {
  const pad = page.locator('[data-tap-pad]').first()
  await pad.waitFor({ state: 'visible' })
  return (await pad.innerText()).replace(/\s+/g, ' ').trim()
}

async function playRally(page, answers, hooks = {}) {
  const label = await padLabel(page)
  if (label === 'Play') {
    await page.locator('[data-tap-pad]').first().click()
    await page.clock.runFor(1500)
  }
  await page.locator('[data-tap-pad]').first().click()
  await page.clock.runFor(2300)
  if (hooks.beforeAnswers) await hooks.beforeAnswers()
  for (const name of answers) {
    const button = page.locator('[data-input-area]').getByRole('button', { name, exact: true })
    const count = await button.count()
    if (count !== 1) fail(`answer "${name}": ${count} buttons`)
    await button.click()
    await page.clock.runFor(400)
  }
  if (hooks.after) await hooks.after()
}

async function bestStep(page) {
  const steps = await page.locator('[data-best-step]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-best-step'))
  )
  return steps[0] ?? ''
}

async function hasEndPad(page) {
  return page.locator('[data-input-area]').evaluateAll((els) =>
    els.some((el) => el.hasAttribute('data-end-pad'))
  )
}

async function forwardToEnd(page, expected, where) {
  let presses = 0
  while (presses < 60) {
    if (await hasEndPad(page)) break
    const forward = page.getByRole('button', { name: 'Forward 10 seconds', exact: true })
    const count = await forward.count()
    if (count !== 1) fail(`${where}: ${count} Forward 10 seconds buttons`)
    await forward.click()
    await page.clock.runFor(200)
    presses += 1
  }
  if (!(await hasEndPad(page))) fail(`${where}: no end pad after ${presses} presses`)
  if (presses !== expected) fail(`${where}: end pad after ${presses} presses, expected ${expected}`)
}

async function saveLabel(page) {
  const button = page.locator('[data-input-area]').getByRole('button', { name: /^Save at / })
  const count = await button.count()
  if (count !== 1) fail(`Save at: ${count} buttons`)
  const label = await button.evaluate((el) => el.getAttribute('aria-label') || el.innerText)
  return { button, label: label.replace(/\s+/g, ' ').trim() }
}

function assertUrl(page, pathname, search) {
  const url = new URL(page.url())
  const got = `${url.pathname}${url.search}`
  const want = `${pathname}${search}`
  if (got !== want) fail(`url ${got}, expected ${want}`)
}

export async function runTagging(page, base, vp, prepare, shoot) {
  const name = (leaf) => `${vp.name}/${leaf}.png`
  const names = []
  const take = async (leaf) => {
    const shot = name(leaf)
    await prepare(page)
    await shoot(shot)
    names.push(shot)
  }

  await page.goto(`${base}/matches/m-partial/tag/2`, { waitUntil: 'load' })
  await prepare(page)
  await page.clock.runFor(1000)
  await take('t01-set2-start')

  await playRally(page, ['Winner'], {
    beforeAnswers: async () => {
      const step = await bestStep(page)
      if (step !== 'end') fail(`rally 8 end question: data-best-step=${step || 'missing'}`)
      await take('t02-end-question')
    },
    after: async () => {
      await take('t03-r8-saved')
    },
  })
  await playRally(page, ['In net'])
  await playRally(page, ['In net'], {
    after: async () => {
      await take('t04-r10-saved')
    },
  })

  await forwardToEnd(page, 13, 'set 2')
  const early = await saveLabel(page)
  if (early.label !== 'Save at 7 - 3') fail(`set 2 save label "${early.label}", expected "Save at 7 - 3"`)
  await take('t05-save-early-7-3')
  await early.button.click()
  await page.clock.runFor(1000)
  assertUrl(page, '/matches/m-partial/tag', '?from=2')
  await take('t06-checklist-set2-saved')

  const block = page.locator('[data-video-block="v-club-2"]')
  await block.getByRole('button', { name: 'Add set', exact: true }).click()
  await page.clock.runFor(800)
  const line = page.locator('[data-set-line="3"]')
  if ((await line.count()) !== 1) fail('set 3 line did not appear')
  await take('t07-set3-added')
  await line.getByRole('button', { name: 'Tag', exact: true }).click()
  await page.clock.runFor(800)
  assertUrl(page, '/matches/m-partial/tag/3', '')

  await playRally(page, ['You served', 'Winner'], {
    beforeAnswers: async () => {
      const step = await bestStep(page)
      if (step !== 'server') fail(`rally 1 server question: data-best-step=${step || 'missing'}`)
      await take('t08-server-question')
    },
  })
  await playRally(page, ['Winner'])
  await playRally(page, ['Winner'], {
    after: async () => {
      await take('t09-r3-saved')
    },
  })

  await forwardToEnd(page, 19, 'set 3')
  const finish = await saveLabel(page)
  if (finish.label !== 'Save at 2 - 1') fail(`set 3 save label "${finish.label}", expected "Save at 2 - 1"`)
  await take('t10-save-early-2-1')
  await finish.button.click()
  await page.clock.runFor(1000)
  await take('t11-checklist-finished')

  await page.locator('a[href="/matches"]').click()
  await page.clock.runFor(800)
  assertUrl(page, '/matches', '')
  const row = page.locator('[data-match-row="m-partial"]')
  if ((await row.count()) !== 1) fail('m-partial row missing')
  const text = (await row.innerText()).replace(/\s+/g, ' ').trim()
  if (!text.endsWith('Tagged')) fail(`m-partial row does not end Tagged: ${text}`)
  await take('t12-matches-tagged')

  if (names.length !== 12) fail(`${vp.name} tagging shots ${names.length}, expected 12`)
  console.log(`${vp.name} tagging 12 shots`)
  return names
}
