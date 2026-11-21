/** Proto-only flipable visual directions for Paul to pick. */
export const THEME_PACKS = [
  {
    id: 'slate-teal',
    label: 'Slate Teal',
    blurb: 'Default. Cool slate + teal.',
  },
  {
    id: 'ink-lime',
    label: 'Ink Lime',
    blurb: 'Paper gray + court lime.',
  },
  {
    id: 'harbor',
    label: 'Harbor',
    blurb: 'Blue-gray + deep cyan.',
  },
  {
    id: 'neon-night',
    label: 'Neon Night',
    blurb: 'Dark + electric cyan.',
  },
] as const

export type ThemeId = (typeof THEME_PACKS)[number]['id']

export const DEFAULT_THEME: ThemeId = 'slate-teal'
export const THEME_STORAGE_KEY = 'proto-theme'
