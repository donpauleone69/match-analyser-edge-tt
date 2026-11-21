/**
 * Reviewer's serve-order cases, plus P3 and P4.
 * Run from proto/: node scripts/slice-a-review.mjs
 */
import * as esbuild from 'esbuild'
import { pathToFileURL } from 'url'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const proto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outfile = path.join(os.tmpdir(), 'slice-a-review.mjs')

await esbuild.build({
  entryPoints: [path.join(proto, 'scripts/slice-a-review-cases.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
  alias: { '@': path.join(proto, 'src') },
})

const mod = await import(pathToFileURL(outfile).href)
const r = mod.report()
console.log(r.text)
console.log(
  `\nreviewer ${r.reviewerChecks - r.reviewerFails}/${r.reviewerChecks}` +
    `  own ${r.ownChecks - r.ownFails}/${r.ownChecks}` +
    `  ${r.fails} failed`
)
if (r.fails) process.exitCode = 1
