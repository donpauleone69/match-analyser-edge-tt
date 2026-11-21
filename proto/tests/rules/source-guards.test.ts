import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const protoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const srcRoot = path.join(protoRoot, 'src')

function walkTs(dir: string, skip = new Set<string>()): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (skip.has(full)) continue
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walkTs(full, skip))
    else if (/\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

const withoutScreen = walkTs(srcRoot, new Set([path.join(srcRoot, 'features/tagging/TagSetScreen.tsx')])).map((f) =>
  readFileSync(f, 'utf8'),
)
const joined = withoutScreen.join('\n')
const screen = readFileSync(path.join(srcRoot, 'features/tagging/TagSetScreen.tsx'), 'utf8')

it('setOverOnRule( present outside TagSetScreen', () => {
  expect(joined.includes('setOverOnRule(')).toBe(true)
})
it('reachedEntered absent from src except TagSetScreen scan', () => {
  expect(!joined.includes('reachedEntered')).toBe(true)
})
it('atEntered absent from src except TagSetScreen scan', () => {
  expect(!joined.includes('atEntered')).toBe(true)
})
it('isSetWon(entered) absent from src except TagSetScreen scan', () => {
  expect(!joined.includes('isSetWon(entered)')).toBe(true)
})
it('saveOn: readyToFinish present', () => {
  expect(screen.includes('saveOn: readyToFinish')).toBe(true)
})
it('saveEarly clause absent', () => {
  expect(!screen.includes('|| !saveEarly')).toBe(true)
})
it('screen uses the rule', () => {
  expect(screen.includes('setOverOnRule(')).toBe(true)
})
it('details clause is gone', () => {
  expect(!screen.includes('reachedEntered') && !screen.includes('atEntered') && !screen.includes('isSetWon(entered)')).toBe(true)
})