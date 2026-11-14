/** Proto-only flipable visual directions for Paul to pick — not product migration. */
export const THEME_PACKS = [
  {
    id: 'slate-teal',
    label: 'Slate Teal',
    blurb: 'Current proto default — cool slate + teal accent.',
  },
  {
    id: 'ink-lime',
    label: 'Ink Lime',
    blurb: 'Paper gray surfaces + court lime accent.',
  },
  {
    id: 'harbor',
    label: 'Harbor',
    blurb: 'Blue-gray chrome + deep cyan accent.',
  },
] as const

export type ThemeId = (typeof THEME_PACKS)[number]['id']

export const DEFAULT_THEME: ThemeId = 'slate-teal'
export const THEME_STORAGE_KEY = 'proto-theme'
