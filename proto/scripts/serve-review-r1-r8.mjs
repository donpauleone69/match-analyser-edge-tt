/**
 * Item 9 fast check: Review serves cases R1 to R8.
 * Run from proto/: node scripts/serve-review-r1-r8.mjs
 */
import * as esbuild from 'esbuild'
import { pathToFileURL } from 'url'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const proto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outfile = path.join(os.tmpdir(), 'serve-review-r1-r8.mjs')

await esbuild.build({
  entryPoints: [path.join(proto, 'src/features/tagging/serveReviewCases.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
  alias: { '@': path.join(proto, 'src') },
})

const mod = await import(pathToFileURL(outfile).href)
const rows = mod.runServeReviewCases()
let failed = 0
for (const row of rows) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.id}${row.detail ? '  ' + row.detail : ''}`)
  if (!row.ok) failed++
}
if (failed) {
  console.log(`${failed} failed`)
  process.exitCode = 1
} else {
  console.log(`${rows.length} passed`)
}
