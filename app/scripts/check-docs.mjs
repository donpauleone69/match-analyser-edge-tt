/**
 * Docs path and length check. No dependencies.
 *   node scripts/check-docs.mjs
 *
 * Scans AGENTS.md, .cursorrules, docs/*.md, and app/README.md.
 * A backticked or linked repo path that is not on disk fails.
 * A scanned file over 200 lines fails.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_LINES = 200
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const ROOT_FILES = new Set(['.cursorrules', 'AGENTS.md', '.gitignore'])

function lineCount(text) {
  if (text.length === 0) return 0
  const parts = text.split('\n')
  return text.endsWith('\n') ? parts.length - 1 : parts.length
}

function scannedFiles() {
  const docsDir = path.join(repoRoot, 'docs')
  const names = [
    path.join(repoRoot, 'AGENTS.md'),
    path.join(repoRoot, '.cursorrules'),
    path.join(repoRoot, 'app/README.md'),
  ]
  if (!existsSync(docsDir)) return { names, missingDir: true }
  const docs = readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => path.join(docsDir, name))
  return { names: [...names, ...docs], missingDir: false }
}

/** Repo-relative path, or a relative link. Absolute and URL strings are not repo paths. */
function repoPathOf(raw) {
  let s = raw.trim()
  if (!s || /\s/.test(s)) return null
  s = s.replace(/[.,:;]+$/, '')
  s = s.split('#')[0].split('?')[0]
  if (!s) return null
  if (/^(https?:|mailto:)/i.test(s)) return null
  if (s.startsWith('/')) return null
  if (ROOT_FILES.has(s) || s.startsWith('app/') || s.startsWith('docs/') || s.startsWith('./') || s.startsWith('../')) {
    return s
  }
  return null
}

function citations(text) {
  const found = []
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      const cited = repoPathOf(match[1])
      if (cited) found.push({ line: index + 1, cited, kind: 'tick' })
    }
    for (const match of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const cited = repoPathOf(match[1])
      if (cited) found.push({ line: index + 1, cited, kind: 'link' })
      else if (match[1] && !/^(https?:|mailto:|#)/i.test(match[1])) {
        const bare = match[1].split('#')[0].split('?')[0]
        if (bare && !bare.startsWith('/')) found.push({ line: index + 1, cited: bare, kind: 'link' })
      }
    }
  })
  return found
}

function resolveCited(cited, filePath) {
  if (ROOT_FILES.has(cited) || cited.startsWith('app/') || cited.startsWith('docs/')) {
    return path.resolve(repoRoot, cited)
  }
  return path.resolve(path.dirname(filePath), cited)
}

function main() {
  const problems = []
  const { names, missingDir } = scannedFiles()
  if (missingDir) problems.push('missing docs/')
  const counts = []

  for (const filePath of names) {
    const rel = path.relative(repoRoot, filePath)
    if (!existsSync(filePath)) {
      problems.push(`${rel}: scanned file is missing`)
      continue
    }
    const text = readFileSync(filePath, 'utf8')
    const lines = lineCount(text)
    counts.push({ rel, lines })
    if (lines > MAX_LINES) problems.push(`${rel}: ${lines} lines (max ${MAX_LINES})`)
    for (const cite of citations(text)) {
      const target = resolveCited(cite.cited, filePath)
      if (!existsSync(target)) {
        problems.push(`${rel}:${cite.line}: missing ${cite.cited}`)
      } else if (!statSync(target).isFile() && !statSync(target).isDirectory()) {
        problems.push(`${rel}:${cite.line}: not a file ${cite.cited}`)
      }
    }
  }

  if (problems.length) {
    console.error('check:docs failed')
    for (const problem of problems) console.error(problem)
    process.exit(1)
  }
  console.log(`check:docs ok (${counts.length} files)`)
  for (const item of counts) console.log(`${item.lines}\t${item.rel}`)
}

main()
