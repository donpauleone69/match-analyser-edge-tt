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
  R6: 'storage-place',
  R7: 'thin-pages',
  R8: 'presentational',
  R9: 'data-layer',
  R10: 'store-layer',
  R11: 'types-layer',
  R12: 'no-persist',
  R13: 'ui-folders',
  R14: 'file-names',
  R15: 'rules-tested',
  R16: 'alias-imports',
  R17: 'raw-button',
  R18: 'import-type',
  R19: 'one-confirm',
  R20: 'kind-tokens',
  R21: 'zone-paint',
  R22: 'one-badge',
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
const RULES_REL_DIRS = ['stores', 'data', 'features', 'pages', 'layout', 'ui-mine', 'components']

function rulesImport(spec) {
  if (spec === 'react' || spec === 'react-dom' || spec === 'zustand' || spec === 'dexie') return spec
  if (spec === 'react-router' || spec.startsWith('react-router/') || spec.startsWith('react-router-')) return spec
  for (const base of RULES_ROOTS) {
    if (spec === base || spec.startsWith(`${base}/`)) return spec
  }
  return null
}

/** A relative import from src/rules that lands in a forbidden app directory. Null when it stays in rules or leaves toward something else. */
function rulesRelativeEscape(file, spec) {
  if (!spec.startsWith('.')) return null
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
  if (resolved === 'src/rules' || resolved.startsWith('src/rules/')) return null
  for (const dir of RULES_REL_DIRS) {
    const base = `src/${dir}`
    if (resolved === base || resolved.startsWith(`${base}/`)) return spec
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

function resolveRel(file, spec) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
}

function under(resolved, base) {
  return resolved === base || resolved.startsWith(`${base}/`)
}

function isRouter(spec) {
  return spec === 'react-router' || spec.startsWith('react-router/') || spec.startsWith('react-router-')
}

/** True when spec names one of the `src/<dir>` folders, by alias or by a relative path from file. */
function importsDir(file, spec, dirs) {
  for (const dir of dirs) {
    if (spec === `@/${dir}` || spec.startsWith(`@/${dir}/`)) return true
    if (spec.startsWith('.') && under(resolveRel(file, spec), `src/${dir}`)) return true
  }
  return false
}

const DATA_BANNED_DIRS = ['stores', 'features', 'pages', 'layout', 'ui-mine', 'components', 'theme']
const STORE_BANNED_DIRS = ['features', 'pages', 'layout', 'ui-mine', 'components', 'theme']
const TYPES_BANNED_DIRS = ['stores', 'data', 'features', 'pages', 'layout', 'ui-mine', 'components', 'theme']

/** The folder a relative import may stay inside: one feature, or one top-level folder. Null for files at the src root. */
function importUnit(file) {
  const parts = file.split('/')
  if (parts.length < 3) return null
  if (parts[1] === 'features' && parts.length >= 4) return parts.slice(0, 3).join('/')
  return parts.slice(0, 2).join('/')
}

const NAME_RULES = [
  { re: /^src\/pages\/[^/]+\.tsx$/, ok: /^[A-Z]\w*Page\.tsx$/, want: '<Thing>Page.tsx' },
  { re: /^src\/features\/[^/]+\/composers\/.+\.tsx$/, ok: /^[A-Z]\w*Composer\.tsx$/, want: '<Thing>Composer.tsx' },
  { re: /^src\/features\/[^/]+\/sections\/.+\.tsx$/, ok: /^[A-Z]\w*Section\.tsx$/, want: '<Thing>Section.tsx' },
  { re: /^src\/features\/[^/]+\/blocks\/.+\.tsx$/, ok: /^[A-Z]\w*Block\.tsx$/, want: '<Thing>Block.tsx' },
  { re: /^src\/features\/[^/]+\/derive\/.+$/, ok: /^derive[A-Z]\w*\.ts$/, want: 'derive<Thing>.ts' },
  { re: /^src\/features\/[^/]+\/hooks\/.+$/, ok: /^use[A-Z]\w*\.ts$/, want: 'use<Thing>.ts' },
]

function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Each src/rules module needs tests/rules/<same dirs>/<name>.test.ts, camelCase or kebab-case. */
function rulesTested(file) {
  if (!file.startsWith('src/rules/') || !file.endsWith('.ts') || file.endsWith('.d.ts')) return []
  const sub = file.slice('src/rules/'.length, -'.ts'.length)
  const dir = path.posix.dirname(sub)
  const base = path.posix.basename(sub)
  if (base === 'index') return []
  const names = [...new Set([base, kebab(base)])].map((name) => path.posix.join('tests/rules', dir, `${name}.test.ts`))
  if (names.some((name) => fs.existsSync(path.join(rootAbs, name)))) return []
  return [{ rule: RULES.R15, file, line: 1, text: `no ${names.join(' or ')}` }]
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
      const spec = rulesImport(hit.spec) || rulesRelativeEscape(file, hit.spec)
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

  if (inSrc) scanLayers(file, src, findings)
  scanImportType(file, src, findings)
  if (inSrc) scanOneConfirm(file, src, findings)
  scanKindTokens(file, src, findings)
  scanZonePaint(file, src, findings)
  scanOneBadge(file, src, findings)

  return findings
}

function scanLayers(file, src, findings) {
  const inStores = file.startsWith('src/stores/')
  const inData = file.startsWith('src/data/')
  const inTypes = file.startsWith('src/types/')
  const tsx = file.endsWith('.tsx')
  const found = imports(src)

  if (!inStores && !inData) {
    const storageRe = /\b(localStorage|sessionStorage|indexedDB)\b/g
    let hit
    while ((hit = storageRe.exec(src))) push(findings, RULES.R6, file, src, hit.index, hit[0])
  }

  if (file.startsWith('src/pages/')) {
    for (const item of found) {
      if (importsDir(file, item.spec, ['stores', 'data'])) push(findings, RULES.R7, file, src, item.index, `import '${item.spec}'`)
    }
  }

  if (/^src\/features\/[^/]+\/(blocks|sections)\//.test(file)) {
    for (const item of found) {
      if (importsDir(file, item.spec, ['stores', 'data'])) push(findings, RULES.R8, file, src, item.index, `import '${item.spec}'`)
    }
  }

  if (inData) {
    if (tsx) push(findings, RULES.R9, file, src, 0, 'tsx file')
    for (const item of found) {
      const spec = item.spec
      const framework = spec === 'react' || spec === 'react-dom' || spec.startsWith('react-dom/') || isRouter(spec) || spec === 'zustand' || spec.startsWith('zustand/')
      if (framework || importsDir(file, spec, DATA_BANNED_DIRS)) push(findings, RULES.R9, file, src, item.index, `import '${spec}'`)
    }
  }

  if (inStores) {
    if (tsx) push(findings, RULES.R10, file, src, 0, 'tsx file')
    for (const item of found) {
      if (isRouter(item.spec) || importsDir(file, item.spec, STORE_BANNED_DIRS)) push(findings, RULES.R10, file, src, item.index, `import '${item.spec}'`)
    }
  }

  if (inTypes) {
    if (tsx) push(findings, RULES.R11, file, src, 0, 'tsx file')
    for (const item of found) {
      const spec = item.spec
      const framework = rulesImport(spec) && !spec.startsWith('@/')
      if (framework || importsDir(file, spec, TYPES_BANNED_DIRS)) push(findings, RULES.R11, file, src, item.index, `import '${spec}'`)
    }
    const fnRe = /\bexport\s+(?:default\s+)?(?:async\s+)?function\b|\bexport\s+(?:const|let|var)\s+\w+\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|\w+\s*=>)/g
    let hit
    while ((hit = fnRe.exec(src))) push(findings, RULES.R11, file, src, hit.index, hit[0].replace(/\s+/g, ' ').slice(0, 60))
  }

  const persistRe = /\bimport\s+([^;'"]*?)\s*from\s*['"]zustand\/middleware['"]|\bimport\s*\(\s*['"]zustand\/middleware['"]\s*\)/g
  let persistHit
  while ((persistHit = persistRe.exec(src))) {
    const clause = persistHit[1]
    if (clause === undefined || /\b(persist|createJSONStorage)\b/.test(clause)) {
      push(findings, RULES.R12, file, src, persistHit.index, 'zustand persist middleware')
    }
  }

  if (/^src\/ui-mine\/[^/]+\.tsx$/.test(file)) push(findings, RULES.R13, file, src, 0, 'component outside its folder')

  const base = path.posix.basename(file)
  for (const name of NAME_RULES) {
    if (name.re.test(file) && !name.ok.test(base)) push(findings, RULES.R14, file, src, 0, `name ${base}, want ${name.want}`)
  }

  findings.push(...rulesTested(file))

  const unit = importUnit(file)
  if (unit) {
    for (const item of found) {
      if (!item.spec.startsWith('.')) continue
      const resolved = resolveRel(file, item.spec)
      if (!under(resolved, unit)) push(findings, RULES.R16, file, src, item.index, `import '${item.spec}' leaves ${unit}, use @/`)
    }
  }

  if (tsx && (file.startsWith('src/features/') || file.startsWith('src/pages/'))) {
    const rawButtonRe = /<button\b/g
    let rawHit
    while ((rawHit = rawButtonRe.exec(src))) push(findings, RULES.R17, file, src, rawHit.index, '<button')
  }

}

/** An import whose bindings are all types must be `import type`, not `import { type … }`. */
function scanImportType(file, src, findings) {
  const re = /\bimport\s+([\s\S]*?)\s+from\s*['"][^'"]+['"]/g
  let hit
  while ((hit = re.exec(src))) {
    if (!inlineImportAllTypes(hit[1])) continue
    push(findings, RULES.R18, file, src, hit.index, 'import { type … }')
  }
}

/**
 * The warning badge pair `border-warning bg-warning/15` together with the badge
 * treatment (`uppercase`) only in WfBadge.tsx. Confirm flags use the colours
 * without that treatment and stay put.
 */
function scanOneBadge(file, src, findings) {
  if (file === 'src/ui-mine/WfBadge/WfBadge.tsx') return
  const re = /border-warning bg-warning\/15/g
  let hit
  while ((hit = re.exec(src))) {
    const start = src.lastIndexOf('\n', hit.index) + 1
    const end = src.indexOf('\n', hit.index)
    const line = src.slice(start, end === -1 ? src.length : end)
    if (!line.includes('uppercase')) continue
    push(findings, RULES.R22, file, src, hit.index, 'border-warning bg-warning/15')
  }
}

/** `function restStyle` is banned. Review chips use zonePressed and zoneRest. */
function scanZonePaint(file, src, findings) {
  const re = /\bfunction\s+restStyle\b/g
  let hit
  while ((hit = re.exec(src))) push(findings, RULES.R21, file, src, hit.index, 'function restStyle')
}

/** The kind-token literals live only in buttonKinds.ts. Call sites use the constants. */
function scanKindTokens(file, src, findings) {
  if (file === 'src/ui-mine/buttonKinds.ts') return
  const re = /btn-kind-control btn-kind-square|btn-kind-field/g
  let hit
  while ((hit = re.exec(src))) push(findings, RULES.R20, file, src, hit.index, hit[0])
}

/** `function ConfirmBox` is banned. `role="alertdialog"` only in ConfirmBlock.tsx. */
function scanOneConfirm(file, src, findings) {
  const fnRe = /\bfunction\s+ConfirmBox\b/g
  let hit
  while ((hit = fnRe.exec(src))) push(findings, RULES.R19, file, src, hit.index, 'function ConfirmBox')
  if (file.endsWith('/ConfirmBlock.tsx')) return
  const roleRe = /role=(["'])alertdialog\1/g
  while ((hit = roleRe.exec(src))) push(findings, RULES.R19, file, src, hit.index, 'role="alertdialog"')
}

function inlineImportAllTypes(clause) {
  const trimmed = clause.trim()
  if (/^type\b/.test(trimmed)) return false
  if (!trimmed.startsWith('{')) return false
  const brace = trimmed.match(/^\{([^}]*)\}/)
  if (!brace) return false
  const parts = brace[1].split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return false
  return parts.every((part) => /^type\s+[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?$/.test(part))
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
