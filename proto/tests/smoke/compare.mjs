/**
 * Pixel compare inside the already-open Chrome. Pass is 0 differing pixels
 * and equal size. A miss writes out/diff/<vp>/<file>.png: differing pixels
 * magenta, the rest dimmed to 30%.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

async function comparePair(page, actualPath, baselinePath) {
  const actual = readFileSync(actualPath).toString('base64')
  const baseline = readFileSync(baselinePath).toString('base64')
  return page.evaluate(async ({ actual, baseline }) => {
    const load = async (src) => {
      const img = new Image()
      img.src = `data:image/png;base64,${src}`
      await img.decode()
      return img
    }
    const [ia, ib] = await Promise.all([load(actual), load(baseline)])
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return { diffPixels: -1, size: [ia.width, ia.height, ib.width, ib.height] }
    }
    const canvas = new OffscreenCanvas(ia.width, ia.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(ia, 0, 0)
    const da = ctx.getImageData(0, 0, ia.width, ia.height).data
    ctx.clearRect(0, 0, ia.width, ia.height)
    ctx.drawImage(ib, 0, 0)
    const db = ctx.getImageData(0, 0, ia.width, ia.height).data
    let n = 0
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) n += 1
    }
    if (n === 0) return { diffPixels: 0 }
    const out = ctx.getImageData(0, 0, ia.width, ia.height)
    const o = out.data
    for (let i = 0; i < da.length; i += 4) {
      const differ = da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]
      o[i] = differ ? 255 : da[i] * 0.3
      o[i + 1] = differ ? 0 : da[i + 1] * 0.3
      o[i + 2] = differ ? 255 : da[i + 2] * 0.3
      o[i + 3] = 255
    }
    ctx.putImageData(out, 0, 0)
    const blob = await canvas.convertToBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return { diffPixels: n, diff: btoa(bin) }
  }, { actual, baseline })
}

export async function compareShots(page, { outDir, baselineDir, names }) {
  const shots = []
  let pass = true
  for (const name of names) {
    const actualPath = path.join(outDir, name)
    const baselinePath = path.join(baselineDir, name)
    if (!existsSync(actualPath) || !existsSync(baselinePath)) {
      shots.push({ name, diffPixels: -1 })
      pass = false
      console.error(`missing shot ${name} actual=${existsSync(actualPath)} baseline=${existsSync(baselinePath)}`)
      continue
    }
    const result = await comparePair(page, actualPath, baselinePath)
    shots.push({ name, diffPixels: result.diffPixels })
    if (result.diffPixels !== 0) {
      pass = false
      if (result.size) console.error(`size ${name} ${result.size[0]}x${result.size[1]} vs ${result.size[2]}x${result.size[3]}`)
      else console.error(`diff ${name} ${result.diffPixels} pixels`)
      if (result.diff) {
        const diffPath = path.join(outDir, 'diff', name)
        mkdirSync(path.dirname(diffPath), { recursive: true })
        writeFileSync(diffPath, Buffer.from(result.diff, 'base64'))
      }
    }
  }
  return { pass, shots }
}
