import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

function round(value: number): number {
  if (!Number.isFinite(value)) return value
  const next = Math.round(value * 1e6) / 1e6
  return Object.is(next, -0) ? 0 : next
}

/** Sorted keys, array order kept, undefined dropped, numbers rounded to 1e-6. */
export function normalize(value: unknown): unknown {
  if (typeof value === 'number') return round(value)
  if (Array.isArray(value)) return value.map((item) => normalize(item))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key]
      if (item === undefined) continue
      out[key] = normalize(item)
    }
    return out
  }
  return value
}

export function serialize(value: unknown): string {
  return `${JSON.stringify(normalize(value), null, 2)}\n`
}

/** Write when UPDATE_GOLDEN=1, then return the parsed actual and the file. A missing file throws. */
export function syncGolden(rel: string, value: unknown): { actual: unknown; saved: unknown } {
  const file = path.join(root, rel)
  const text = serialize(value)
  const actual = JSON.parse(text) as unknown
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, text)
    console.warn(`GOLDEN WRITTEN ${rel}`)
  }
  if (!existsSync(file)) throw new Error(`missing golden file ${rel}`)
  return { actual, saved: JSON.parse(readFileSync(file, 'utf8')) as unknown }
}
