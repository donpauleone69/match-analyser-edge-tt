// Vitest runs in Node; the app tsconfig intentionally omits Node ambient types.
// @ts-expect-error Node's built-in module is available in the test runtime.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('shared match color tokens', () => {
  const css = source('./index.css')

  it('defines surfaces, text, player sides, shot roles, results, and states', () => {
    const required = [
      '--color-bg-app',
      '--color-bg-surface',
      '--color-text',
      '--color-text-muted',
      '--color-text-on-accent',
      '--control-height',
      '--control-px',
      '--control-text',
      '--color-neutral-50',
      '--color-neutral-300',
      '--color-player-1',
      '--color-player-1-bg',
      '--color-player-2',
      '--color-player-2-bg',
      '--color-shot-serve',
      '--color-shot-serve-bg',
      '--color-shot-receive',
      '--color-shot-first-attack',
      '--color-result-winner',
      '--color-result-error',
      '--color-result-air',
      '--color-shot-end',
      '--color-contact-live',
      '--color-contact-selected',
      '--color-review',
      '--color-pill-idle',
      '--color-pill-idle-border',
      '--color-pill-idle-text',
    ]

    for (const token of required) {
      expect(css, `missing ${token}`).toContain(`${token}:`)
    }
  })

  it('keeps player and role fill tokens opaque (no alpha rgba)', () => {
    const opaqueTokens = [
      '--color-player-1-bg',
      '--color-player-2-bg',
      '--color-shot-serve',
      '--color-shot-serve-bg',
      '--color-shot-receive',
      '--color-shot-receive-bg',
      '--color-shot-first-attack',
      '--color-result-winner',
      '--color-result-error',
      '--color-result-air',
      '--color-pill-idle',
      '--color-contact-selected-bg',
    ]

    for (const token of opaqueTokens) {
      const match = css.match(new RegExp(`${token}:\\s*([^;]+);`))
      expect(match, `missing ${token}`).toBeTruthy()
      const value = match?.[1] ?? ''
      expect(value, `${token} must be opaque`).not.toMatch(/\/\s*0?\.\d+/)
      expect(value, `${token} must be opaque`).not.toMatch(/\brgba?\([^)]+,\s*0?\.\d+\s*\)/)
    }
  })

  it('prefers a light app surface for tagging readability', () => {
    const app = css.match(/--color-bg-app:\s*([^;]+);/)?.[1]?.trim() ?? ''
    expect(app.toLowerCase()).toMatch(/^#[ef]/i)
    const ink = css.match(/--color-text:\s*([^;]+);/)?.[1]?.trim() ?? ''
    expect(ink.toLowerCase()).toMatch(/^#[0-3]/i)
  })

  it('keeps muted text as dark ink (not light grey on paper)', () => {
    const text = css.match(/--color-text:\s*([^;]+);/)?.[1]?.trim() ?? ''
    const muted = css.match(/--color-text-muted:\s*([^;]+);/)?.[1]?.trim() ?? ''
    expect(muted).toBe(text)
    const mid = css.match(/--color-neutral-600:\s*([^;]+);/)?.[1]?.trim() ?? ''
    expect(mid.toLowerCase()).toMatch(/^#[0-3]/i)
  })

  it('keeps Pass 1 paint free of raw hex colors', () => {
    const paintFiles = [
      './features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx',
      './features/shot-tagging-engine/composers/pass1FocusModel.ts',
      './features/shot-tagging-engine/composers/Pass1FocusComposer.tsx',
    ]

    for (const path of paintFiles) {
      expect(source(path), `${path} contains a raw hex color`).not.toMatch(
        /#[\da-f]{3,8}\b/i
      )
    }
  })

  it('keeps reviewed outcome and review surfaces on semantic tokens', () => {
    const reviewedSurfaces = [
      './features/match-review/blocks/SetPanelBlock.tsx',
      './features/match-review/blocks/RallyPlayerBlock.tsx',
      './features/match-review/blocks/CompareCardBlock.tsx',
      './features/match-review/sections/WorkOnSection.tsx',
      './features/match-review/blocks/ReviewPatternBlock.tsx',
      './features/shot-tagging-engine/composers/Pass1FocusComposer.tsx',
    ]

    for (const path of reviewedSurfaces) {
      expect(
        source(path),
        `${path} bypasses semantic outcome/review tokens`
      ).not.toMatch(/\b(?:emerald|rose|amber)-\d/)
    }
  })
})
