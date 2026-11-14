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
      '--color-border',
      '--color-border-strong',
      '--color-callout-warning',
      '--color-callout-warning-bg',
      '--color-callout-warning-border',
      '--color-callout-danger',
      '--color-callout-danger-bg',
      '--color-callout-info',
      '--color-callout-info-bg',
      '--color-no-attack',
      '--color-video-scrim',
      '--color-video-scrim-strong',
      '--color-video-scrim-soft',
      '--color-video-scrim-border',
      '--color-video-scrim-edge',
      '--color-video-scrim-wash',
      '--color-video-scrim-wash-strong',
      '--color-video-scrim-wash-muted',
      '--color-modal-scrim',
      '--color-modal-scrim-strong',
      '--color-panel-scrim',
      '--control-gap',
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
      './features/match-review/blocks/TabBarBlock.tsx',
      './features/match-review/blocks/RallyRowBlock.tsx',
      './features/match-review/blocks/TakeawaysBlock.tsx',
      './features/match-review/blocks/MatchContextBlock.tsx',
      './features/match-review/blocks/MatchStorageBlock.tsx',
      './features/match-review/sections/OverviewSection.tsx',
      './features/clips/blocks/ClipStageBlock.tsx',
      './features/clips/blocks/ClipQueueBlock.tsx',
      './features/clips/blocks/ClipPresetListBlock.tsx',
      './features/clips/blocks/ReelListBlock.tsx',
      './features/match-review/blocks/EvidenceDrawerBlock.tsx',
      './features/match-review/blocks/SummaryCategoryPlaylistBlock.tsx',
      './features/clips/composers/ClipsComposer.tsx',
      './ui-mine/VideoPlayer/TransportCluster.tsx',
      './features/shot-tagging-engine/composers/Pass1FocusComposer.tsx',
      './features/shot-tagging-engine/composers/SimpleTaggingComposer.tsx',
      './features/shot-tagging-engine/composers/RallyEditComposer.tsx',
      './features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx',
      './features/shot-tagging-engine/blocks/SimpleTaggingMatrixBlock.tsx',
      './ui-mine/BrowseDisclosure/BrowseDisclosure.tsx',
      './features/clips/blocks/PlaylistBrowseShellBlock.tsx',
      './features/shot-tagging-engine/blocks/Pass1LeaveDraftChoiceBlock.tsx',
      './features/shot-tagging-engine/blocks/Pass1ChromeProtoBlock.tsx',
      './features/match-review/sections/ServeReceiveDataSection.tsx',
      './features/shot-tagging-engine/blocks/CompletionModal.tsx',
      './features/match-management/sections/MatchResultEntryModal.tsx',
      './components/ui/dialog.tsx',
      './components/ui/alert-dialog.tsx',
      './ui-mine/VideoPlayer/VideoPlayer.tsx',
      './ui-mine/VideoPlayer/MatchScoreHud.tsx',
      './features/shot-tagging-engine/blocks/Pass1ContactCaptureBlock.tsx',
      './pages/DataViewer.tsx',
      './pages/DataViewerAudit.tsx',
      './features/shot-tagging-engine/blocks/RallyCard.tsx',
      './features/shot-tagging-engine/blocks/ShotListItem.tsx',
      './features/data-audit/blocks/RallyGroupBlock.tsx',
      './features/data-audit/composers/Phase1AuditComposer.tsx',
      './features/data-audit/sections/TaggingPhaseSection.tsx',
      './features/data-audit/sections/SetupPhaseSection.tsx',
      './features/data-audit/sections/SchemaReferenceSection.tsx',
    ]

    for (const path of reviewedSurfaces) {
      expect(
        source(path),
        `${path} bypasses semantic outcome/review/callout tokens`
      ).not.toMatch(
        /\b(?:emerald|rose|amber|sky|cyan|violet|purple|indigo|teal|yellow|orange|red|green|blue)-\d/
      )
      expect(
        source(path),
        `${path} uses raw overlay scrim instead of video-scrim tokens`
      ).not.toMatch(/bg-black\/70|border-white\/2[05]/)
      expect(
        source(path),
        `${path} uses raw border-neutral-700 instead of border-border`
      ).not.toMatch(/\bborder-neutral-700\b/)
      expect(
        source(path),
        `${path} uses raw modal/panel black scrim`
      ).not.toMatch(/bg-black\/(?:20|30|50|55|60|80|90|95)\b/)
      expect(
        source(path),
        `${path} uses raw white HUD edge/wash instead of video-scrim-*`
      ).not.toMatch(
        /border-white\/15|divide-white\/10|bg-white\/(?:10|20|25)\b/
      )
      if (path.endsWith('VideoPlayer.tsx')) {
        expect(
          source(path),
          `${path} uses raw neutral empty/load paint instead of elevated/muted tokens`
        ).not.toMatch(/\bbg-neutral-\d+\b|\btext-neutral-\d+\b|\bborder-neutral-\d+\b|hover:bg-black\b/)
      }
    }
  })

  it('avoids purple-on-white AI-default brand drift in core tokens', () => {
    const brand = css.match(/--color-brand-primary:\s*([^;]+);/)?.[1]?.trim() ?? ''
    expect(brand.toLowerCase()).not.toMatch(/#(7c3aed|8b5cf6|a855f7|6366f1|4f46e5)\b/i)
    expect(css).toContain('--color-brand-primary: #14b8a6')
  })
})
