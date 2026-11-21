import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const proto = fileURLToPath(new URL('../..', import.meta.url))

function run(args: string[]): { status: number; out: string } {
  try {
    const out = execFileSync(process.execPath, ['scripts/check-rules.mjs', ...args], {
      cwd: proto,
      encoding: 'utf8',
    })
    return { status: 0, out }
  } catch (error) {
    const failed = error as { status?: number; stdout?: string }
    return { status: failed.status ?? 1, out: failed.stdout ?? '' }
  }
}

it('bad fixtures fire every rule', () => {
  const { status, out } = run(['--root', 'tests/rules-check/fixtures/bad', '--allowlist', 'none', '--json'])
  expect(status).not.toBe(0)
  const json = JSON.parse(out) as { findings: { rule: string; file: string; text: string }[] }
  const hit = (rule: string, file: string) => json.findings.some((f) => f.rule === rule && f.file === file)
  expect(hit('rules-pure', 'src/rules/a.ts')).toBe(true)
  expect(hit('rules-pure', 'src/rules/b.tsx')).toBe(true)
  expect(json.findings.some((f) => f.file === 'src/rules/a.ts' && f.text.includes('react'))).toBe(true)
  expect(json.findings.some((f) => f.file === 'src/rules/a.ts' && f.text.includes('localStorage'))).toBe(true)
  expect(hit('rules-pure', 'src/rules/rel.ts')).toBe(true)
  expect(json.findings.some((f) => f.file === 'src/rules/rel.ts' && f.text.includes('../stores/useMatch'))).toBe(true)
  expect(hit('ui-imports', 'src/features/x/X.tsx')).toBe(true)
  expect(hit('types-in-tsx', 'src/features/x/X.tsx')).toBe(true)
  expect(hit('store-writes', 'src/features/y.ts')).toBe(true)
  expect(hit('store-writes', 'src/features/z.ts')).toBe(true)
  expect(hit('test-imports', 'tests/leak.ts')).toBe(true)
  expect(json.findings.some((f) => f.file === 'tests/leak.ts' && f.text.includes('../src/'))).toBe(true)
})

it('bad fixtures fire every layer rule', () => {
  const { status, out } = run(['--root', 'tests/rules-check/fixtures/bad', '--allowlist', 'none', '--json'])
  expect(status).not.toBe(0)
  const json = JSON.parse(out) as { findings: { rule: string; file: string; text: string }[] }
  const hit = (rule: string, file: string, text = '') =>
    json.findings.some((f) => f.rule === rule && f.file === file && f.text.includes(text))
  expect(hit('storage-place', 'src/features/w.ts', 'sessionStorage')).toBe(true)
  expect(hit('storage-place', 'src/rules/a.ts', 'localStorage')).toBe(true)
  expect(hit('thin-pages', 'src/pages/Home.tsx', '@/stores/matchStore')).toBe(true)
  expect(hit('thin-pages', 'src/pages/Home.tsx', '../data/seed')).toBe(true)
  expect(hit('presentational', 'src/features/x/blocks/RowBlock.tsx', '@/stores/matchStore')).toBe(true)
  expect(hit('presentational', 'src/features/x/sections/ListSection.tsx', '../../../data/seed')).toBe(true)
  expect(hit('data-layer', 'src/data/Seed.tsx', 'tsx file')).toBe(true)
  expect(hit('data-layer', 'src/data/Seed.tsx', "'react'")).toBe(true)
  expect(hit('data-layer', 'src/data/Seed.tsx', '@/features/x/X')).toBe(true)
  expect(hit('store-layer', 'src/stores/Panel.tsx', 'tsx file')).toBe(true)
  expect(hit('store-layer', 'src/stores/Panel.tsx', 'react-router-dom')).toBe(true)
  expect(hit('store-layer', 'src/stores/Panel.tsx', '@/ui-mine')).toBe(true)
  expect(hit('types-layer', 'src/types/match.ts', '@/stores/matchStore')).toBe(true)
  expect(hit('types-layer', 'src/types/match.ts', 'export function')).toBe(true)
  expect(hit('types-layer', 'src/types/match.ts', 'export const flip')).toBe(true)
  expect(hit('no-persist', 'src/stores/persisted.ts')).toBe(true)
  expect(hit('ui-folders', 'src/ui-mine/Loose.tsx')).toBe(true)
  expect(hit('file-names', 'src/pages/Home.tsx', 'Page.tsx')).toBe(true)
  expect(hit('file-names', 'src/features/x/composers/Tagging.tsx', 'Composer.tsx')).toBe(true)
  expect(hit('file-names', 'src/features/x/derive/rallyView.ts', 'derive<Thing>.ts')).toBe(true)
  expect(hit('file-names', 'src/features/x/hooks/player.ts', 'use<Thing>.ts')).toBe(true)
  expect(hit('rules-tested', 'src/rules/a.ts', 'tests/rules/a.test.ts')).toBe(true)
  expect(hit('alias-imports', 'src/features/x/sections/ListSection.tsx', 'leaves src/features/x')).toBe(true)
  expect(hit('alias-imports', 'src/rules/rel.ts', 'leaves src/rules')).toBe(true)
  expect(hit('raw-button', 'src/features/raw/RawButtonSection.tsx', '<button')).toBe(true)
  expect(hit('import-type', 'src/helpers/typed.ts', 'import { type')).toBe(true)
  expect(hit('one-confirm', 'src/features/x/sections/ConfirmSection.tsx', 'function ConfirmBox')).toBe(true)
  expect(hit('one-confirm', 'src/features/x/sections/ConfirmSection.tsx', 'role="alertdialog"')).toBe(true)
  expect(hit('kind-tokens', 'src/features/x/blocks/KindBlock.tsx', 'btn-kind-control ' + 'btn-kind-square')).toBe(true)
  expect(hit('kind-tokens', 'src/features/x/blocks/KindBlock.tsx', 'btn-kind-' + 'field')).toBe(true)
  expect(hit('zone-paint', 'src/features/x/rest.ts', 'function ' + 'restStyle')).toBe(true)
  expect(hit('one-badge', 'src/ui-mine/OtherBadge/OtherBadge.tsx', 'border-warning ' + 'bg-warning/15')).toBe(true)
  expect(hit('card-head', 'src/features/x/sections/BothSection.tsx', '<CardTitle and <Icon')).toBe(true)
  expect(hit('format-home', 'src/rules/formatAway.ts', 'export function ' + 'formatAway')).toBe(true)
  for (const name of [
    'setHasTagProgress',
    'setSettled',
    'setScoresDiffer',
    'setIncomplete',
    'setInProgress',
    'setLineLabel',
    'videoStatus',
    'markState',
  ]) {
    expect(hit('old-predicates', 'src/rules/oldPred.ts', 'function ' + name)).toBe(true)
  }
})

it('good fixtures are clean', () => {
  const { status, out } = run(['--root', 'tests/rules-check/fixtures/good', '--allowlist', 'none', '--json'])
  expect(status, out).toBe(0)
  const json = JSON.parse(out) as { ok: boolean; findings: unknown[]; allowlisted: number }
  expect(json.ok).toBe(true)
  expect(json.findings).toEqual([])
  expect(json.allowlisted).toBe(0)
})

it('a stale allowlist entry fails', () => {
  const { status, out } = run([
    '--root',
    'tests/rules-check/fixtures/good',
    '--allowlist',
    'tests/rules-check/fixtures/stale-allowlist.json',
  ])
  expect(status).not.toBe(0)
  expect(out).toContain('STALE types-in-tsx src/features/nope.tsx: remove it')
})
