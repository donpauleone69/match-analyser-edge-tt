import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const srcRoot = path.join(appRoot, 'src')

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walkTs(full))
    else if (/\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

/** Every src file, joined. No test names a source path, so a later split still scans. */
const joined = walkTs(srcRoot)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

/**
 * Calls of `name(`, skipping a line that defines the function.
 * The definition text contains the same characters, so a plain includes() cannot fail.
 */
function callsOutsideDefinition(src: string, name: string): number {
  let count = 0
  for (const line of src.split('\n')) {
    if (line.includes(`function ${name}(`) || line.includes(`export function ${name}`)) continue
    let from = 0
    const needle = `${name}(`
    while (from < line.length) {
      const at = line.indexOf(needle, from)
      if (at < 0) break
      count += 1
      from = at + needle.length
    }
  }
  return count
}

it('setOverOnRule( present outside its definition', () => {
  expect(callsOutsideDefinition(joined, 'setOverOnRule') >= 1).toBe(true)
})
it('reachedEntered absent from src', () => {
  expect(!joined.includes('reachedEntered')).toBe(true)
})
it('atEntered absent from src', () => {
  expect(!joined.includes('atEntered')).toBe(true)
})
it('isSetWon(entered) absent from src', () => {
  expect(!joined.includes('isSetWon(entered)')).toBe(true)
})
it('saveOn: readyToFinish present', () => {
  expect(joined.includes('saveOn: readyToFinish')).toBe(true)
})
it('saveEarly clause absent', () => {
  expect(!joined.includes('|| !saveEarly')).toBe(true)
})
it('src uses the rule', () => {
  expect(callsOutsideDefinition(joined, 'setOverOnRule') >= 1).toBe(true)
})
it('details clause is gone', () => {
  expect(!joined.includes('reachedEntered') && !joined.includes('atEntered') && !joined.includes('isSetWon(entered)')).toBe(true)
})
