/**
 * Item 14 — three button kinds for the whole proto. Heights live in CSS vars
 * (`--btn-kind-*` in index.css). Finger vs mouse uses `(pointer: coarse|fine)`,
 * not viewport width. Tap-pad on finger also uses `(min-height: 700px)` for 80 vs 64.
 *
 * | Kind        | Finger ≥700h | Finger <700h | Mouse |
 * |-------------|--------------|--------------|-------|
 * | tapPad      | 80           | 64           | 80    |
 * | main        | 48           | 48           | 44    |
 * | control     | 44           | 44           | 36    |
 */

export type ButtonKind = 'tapPad' | 'main' | 'control'

/** Tailwind utility classes — apply to `<Button kind="…">` or any interactive control. */
export const buttonKindClass: Record<ButtonKind, string> = {
  tapPad: 'btn-kind-tap-pad',
  main: 'btn-kind-main',
  control: 'btn-kind-control',
}

/** Square control targets (back, filter, icon-only). */
export const buttonKindControlSquare = 'btn-kind-control btn-kind-square'

/** Square tap-pad companion (e.g. Switch server beside the pad). */
export const buttonKindTapPadSquare = 'btn-kind-tap-pad btn-kind-tap-pad-square'

/** Selects, text inputs, score fields — same height as control. */
export const buttonKindField = 'btn-kind-field'

/** Text links: unchanged on mouse; finger gets control-high press target. */
export const buttonKindTextLink = 'btn-kind-text-link'