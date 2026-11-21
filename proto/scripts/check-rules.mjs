/**
 * Rules ratchet. No dependencies.
 *   node scripts/check-rules.mjs [--root <dir>] [--allowlist <file|none>] [--json]
 *
 * A finding not in the allowlist fails. An allowlist entry with no current
 * finding fails too, so the list can only shrink.
 */
import fs from 'node:fs'
import path from 'node:path'

const RULES = {
  R1: 'rules-pure',
  R2: 'ui-imports',
  R3: 'store-writes',
  R4: 'types-in-tsx',
  R5: 'test-imports',
}

const args = process.argv.slice(2)
let root = '.'
let allowlistPath = 'scripts/rules-allowlist.json'
let asJson = false
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--root') root = args[++i]
  else if (arg === '--allowlist') allowlistPath = args[++i]
  else if (arg === '--json') asJson = true
  else {
    console.error(`unknown argument ${arg}`)
    process.exit(2)
  }
}

const rootAbs = path.resolve(root)

function rel(file) {
  return path.relative(rootAbs, file).split(path.sep).join('/')
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(abs, out)
    else out.push(abs)
  }
  return out
}

/** Block comments, and // comments whose previous character is not : ' " ` or \. Newlines stay so line numbers hold. */
function stripComments(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const prev = i > 0 ? src[i - 1] : ''
    if (src[i] === '/' && src[i + 1] === '*' ) {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      out += src.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
      continue
    }
    if (src[i] === '/' && src[i + 1] === '/' && prev !== ':' && prev !== '"' && prev !== "'" && prev !== '`' && prev !== '\\') {
      let j = i
      while (j < src.length && src[j] !== '\n') j++
      out += ' '.repeat(j - i)
      i = j
      continue
    }
    out += src[i]
    i++
  }
  return out
}

function lineOf(src, index) {
  let line = 1
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++
  return line
}

function snippet(src, index) {
  const start = src.lastIndexOf('\n', index - 1) + 1
  const end = src.indexOf('\n', index)
  const text = src.slice(start, end === -1 ? src.length : end).trim()
  return text.length > 140 ? `${text.slice(0, 137)}...` : text
}

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g

function imports(src) {
  const found = []
  IMPORT_RE.lastIndex = 0
  let hit
  while ((hit = IMPORT_RE.exec(src))) found.push({ spec: hit[1], index: hit.index })
  return found
}

const RULES_ROOTS = ['@/stores', '@/data', '@/features', '@/pages', '@/layout', '@/ui-mine', '@/components']

function rulesImport(spec) {
  if (spec === 'react' || spec === 'react-dom' || spec === 'zustand' || spec === 'dexie') return spec
  if (spec === 'react-router' || spec.startsWith('react-router/') || spec.startsWith('react-router-')) return spec
  for (const base of RULES_ROOTS) {
    if (spec === base || spec.startsWith(`${base}/`)) return spec
  }
  return null
}

function uiSpec(spec) {
  if (spec === 'lucide-react' || spec.startsWith('lucide-react/')) return spec
  if (spec.includes('components/ui')) return spec
  return null
}

function intoSrc(file, spec) {
  if (spec.startsWith('@/')) return true
  if (!spec.startsWith('.')) return false
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
  return resolved === 'src' || resolved.startsWith('src/')
}

function push(findings, rule, file, src, index, text) {
  findings.push({ rule, file, line: lineOf(src, index), text })
}

function scanFile(file, src0) {
  const src = stripComments(src0)
  const findings = []
  const inRules = file.startsWith('src/rules/')
  const inSrc = file.startsWith('src/')
  const inUi = file.startsWith('src/ui-mine/')
  const inStores = file.startsWith('src/stores/')
  const inTests = file.startsWith('tests/') && file.endsWith('.ts') && !file.startsWith('tests/lib/')

  if (inRules && file.endsWith('.tsx')) push(findings, RULES.R1, file, src, 0, 'tsx file')

  if (inRules) {
    for (const hit of imports(src)) {
      const spec = rulesImport(hit.spec)
      if (spec) push(findings, RULES.R1, file, src, hit.index, `import '${spec}'`)
    }
    const globalRe = /\b(localStorage|sessionStorage|indexedDB|window|document|navigator)\b|\bfetch\(/g
    let hit
    while ((hit = globalRe.exec(src))) push(findings, RULES.R1, file, src, hit.index, hit[0])
  }

  if (inSrc && !inUi) {
    for (const hit of imports(src)) {
      const spec = uiSpec(hit.spec)
      if (spec) push(findings, RULES.R2, file, src, hit.index, `import '${spec}'`)
    }
  }

  if (inSrc) {
    const writeRe = /\b\w+Store\.setState\s*\(|\b\w+Store\.getState\(\)\.\w+\s*=[^=]/g
    let hit
    while ((hit = writeRe.exec(src))) push(findings, RULES.R3, file, src, hit.index, hit[0].trim())
    if (!inStores) {
      for (const item of imports(src)) {
        if (item.spec === 'zustand' || item.spec.startsWith('zustand/')) {
          push(findings, RULES.R3, file, src, item.index, `import '${item.spec}'`)
        }
      }
    }
  }

  if (inSrc && file.endsWith('.tsx')) {
    const typeRe = /\bexport\s+type\b|\bexport\s+interface\b|\bexport\s+enum\b|\bexport\s+declare\b|\bexport\s*\{[^}]*\btype\b[^}]*\}/g
    let hit
    while ((hit = typeRe.exec(src))) push(findings, RULES.R4, file, src, hit.index, hit[0].replace(/\s+/g, ' '))
  }

  if (inTests) {
    for (const hit of imports(src)) {
      if (intoSrc(file, hit.spec)) push(findings, RULES.R5, file, src, hit.index, `import '${hit.spec}'`)
    }
  }

  return findings
}

function scanned(file) {
  if (file.startsWith('tests/rules-check/fixtures/')) return false
  if (file.startsWith('src/') && (file.endsWith('.ts') || file.endsWith('.tsx'))) return true
  if (file.startsWith('tests/') && file.endsWith('.ts')) return true
  return false
}

const findings = []
for (const abs of [...walk(path.join(rootAbs, 'src'), []), ...walk(path.join(rootAbs, 'tests'), [])]) {
  const file = rel(abs)
  if (!scanned(file)) continue
  findings.push(...scanFile(file, fs.readFileSync(abs, 'utf8')))
}
findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.line - b.line)

let entries = []
if (allowlistPath !== 'none') {
  const file = path.resolve(allowlistPath)
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  entries = parsed.entries ?? []
}

const listed = (finding) => entries.some((entry) => entry.rule === finding.rule && entry.file === finding.file)
const unlisted = findings.filter((finding) => !listed(finding))
const stale = entries.filter((entry) => !findings.some((finding) => finding.rule === entry.rule && finding.file === entry.file))
const ok = unlisted.length === 0 && stale.length === 0
const allowlisted = ok ? entries.length : entries.length - stale.length

if (asJson) {
  console.log(JSON.stringify({ ok, allowlisted, findings, unlisted, stale }))
} else {
  for (const finding of unlisted) console.log(`${finding.rule} ${finding.file}:${finding.line} ${finding.text}`)
  for (const entry of stale) console.log(`STALE ${entry.rule} ${entry.file}: remove it`)
  if (ok) console.log(`ok: ${entries.length} allowlisted remain`)
}

process.exit(ok ? 0 : 1)
