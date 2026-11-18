export type ColorToken =
  | 'ink-0'
  | 'ink-1'
  | 'ink-2'
  | 'ink-3'
  | 'ink-4'
  | 'chalk'
  | 'chalk-mute'
  | 'chalk-faint'
  | 'you'
  | 'you-ink'
  | 'kim'
  | 'kim-ink'
  | 'ball'
  | 'ball-ink'
  | 'flag'
  | 'flag-ink'
  | 'alert'
  | 'alert-ink'
  | 'vid-bg'
  | 'vid-table'
  | 'vid-line'
  | 'page'
  | 'scrim'

export type ThemeKey = 'courtside' | 'scorebook' | 'floodlight' | 'bluetable'

export type Theme = {
  key: ThemeKey
  name: string
  short: string
  line: string
  type: string
  light: boolean
  roles: { you: string; kim: string; ball: string; flag: string; alert: string }
  color: Record<ColorToken, string>
  font: { sans: string; mono: string; display: string }
  title: { weight: number; tracking: string }
  radius: { btn: number; cell: number; card: number }
}

const SYSTEM_SANS = '"SF Pro Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const SYSTEM_MONO = '"SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace'

export const THEMES: Theme[] = [
  {
    key: 'courtside',
    name: 'Courtside night',
    short: 'Courtside',
    line: 'Dark and quiet so the video leads, for a phone courtside beside a bright screen.',
    type: 'System sans for words, system mono for numbers.',
    light: false,
    roles: { you: 'Mint', kim: 'Lilac', ball: 'Orange', flag: 'Chalk yellow', alert: 'Rose' },
    color: {
      'ink-0': '#0C0E11',
      'ink-1': '#14171C',
      'ink-2': '#1D2128',
      'ink-3': '#282D36',
      'ink-4': '#353B46',
      chalk: '#F3F1EC',
      'chalk-mute': '#A3A9B3',
      'chalk-faint': '#6A717C',
      you: '#6FE3C1',
      'you-ink': '#04241B',
      kim: '#B9A6FF',
      'kim-ink': '#170F38',
      ball: '#FF7A33',
      'ball-ink': '#2A1000',
      flag: '#F4D35E',
      'flag-ink': '#2A2100',
      alert: '#FF5D7D',
      'alert-ink': '#2E0410',
      'vid-bg': '#08090B',
      'vid-table': '#18242C',
      'vid-line': '#F3F1EC',
      page: '#07080A',
      scrim: '#000000',
    },
    font: { sans: SYSTEM_SANS, mono: SYSTEM_MONO, display: SYSTEM_SANS },
    title: { weight: 600, tracking: '0em' },
    radius: { btn: 10, cell: 8, card: 14 },
  },
  {
    key: 'scorebook',
    name: 'Scorebook',
    short: 'Scorebook',
    line: 'Print light for bright halls and desk review, like a paper scoresheet marked in blue pen.',
    type: 'Serif titles, system sans for words, system mono for numbers.',
    light: true,
    roles: { you: 'Green', kim: 'Purple', ball: 'Burnt orange', flag: 'Pen blue', alert: 'Raspberry' },
    color: {
      'ink-0': '#F6F3EA',
      'ink-1': '#FFFFFF',
      'ink-2': '#ECE6D8',
      'ink-3': '#DDD5C2',
      'ink-4': '#C2B8A2',
      chalk: '#1B1A17',
      'chalk-mute': '#55514A',
      'chalk-faint': '#706B60',
      you: '#15803D',
      'you-ink': '#FFFFFF',
      kim: '#7E22CE',
      'kim-ink': '#FFFFFF',
      ball: '#C2410C',
      'ball-ink': '#FFFFFF',
      flag: '#1D4ED8',
      'flag-ink': '#FFFFFF',
      alert: '#BE185D',
      'alert-ink': '#FFFFFF',
      'vid-bg': '#0A0C0E',
      'vid-table': '#121A20',
      'vid-line': '#F6F3EA',
      page: '#E4DFD2',
      scrim: '#1B1A17',
    },
    font: {
      sans: SYSTEM_SANS,
      mono: SYSTEM_MONO,
      display: '"New York", "Iowan Old Style", Charter, "Noto Serif Display", "Noto Serif", Georgia, serif',
    },
    title: { weight: 600, tracking: '-0.01em' },
    radius: { btn: 8, cell: 6, card: 10 },
  },
  {
    key: 'floodlight',
    name: 'Floodlight',
    short: 'Floodlight',
    line: 'Pure black and full strength colour for glare, sports halls and OLED battery. The most legible of the four.',
    type: 'Inter for words with heavy titles, JetBrains Mono for numbers.',
    light: false,
    roles: { you: 'Cyan', kim: 'Magenta', ball: 'Lime', flag: 'Yellow', alert: 'Red' },
    color: {
      'ink-0': '#000000',
      'ink-1': '#101113',
      'ink-2': '#1F2125',
      'ink-3': '#33363C',
      'ink-4': '#5A5F69',
      chalk: '#FFFFFF',
      'chalk-mute': '#C8CCD3',
      'chalk-faint': '#979DA8',
      you: '#35DFFF',
      'you-ink': '#00222A',
      kim: '#FF6FD8',
      'kim-ink': '#2D0022',
      ball: '#B8FF2E',
      'ball-ink': '#142100',
      flag: '#FFE14A',
      'flag-ink': '#241D00',
      alert: '#FF4F42',
      'alert-ink': '#2B0300',
      'vid-bg': '#000000',
      'vid-table': '#14202A',
      'vid-line': '#FFFFFF',
      page: '#000000',
      scrim: '#000000',
    },
    font: {
      sans: 'Inter, "SF Pro Text", system-ui, sans-serif',
      mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
      display: 'Inter, "SF Pro Display", system-ui, sans-serif',
    },
    title: { weight: 800, tracking: '-0.02em' },
    radius: { btn: 6, cell: 4, card: 8 },
  },
  {
    key: 'bluetable',
    name: 'Blue table',
    short: 'Blue table',
    line: 'Mid tone navy, the colour of the table, so the app feels like the venue and stays soft on the eyes.',
    type: 'Cantarell for words, a friendly humanist face, Cascadia Mono for numbers.',
    light: false,
    roles: { you: 'Green', kim: 'Orchid', ball: 'Ball yellow', flag: 'Sky', alert: 'Coral red' },
    color: {
      'ink-0': '#0B1F3A',
      'ink-1': '#11294B',
      'ink-2': '#1A365F',
      'ink-3': '#244472',
      'ink-4': '#36598E',
      chalk: '#F4F7FB',
      'chalk-mute': '#B7C4D8',
      'chalk-faint': '#8C9DB7',
      you: '#5DE8A6',
      'you-ink': '#02261A',
      kim: '#D7A8FF',
      'kim-ink': '#25073F',
      ball: '#FFD84A',
      'ball-ink': '#2A2000',
      flag: '#8FDCFF',
      'flag-ink': '#002536',
      alert: '#FF6474',
      'alert-ink': '#33020A',
      'vid-bg': '#061426',
      'vid-table': '#1C4C86',
      'vid-line': '#F4F7FB',
      page: '#06152A',
      scrim: '#020A16',
    },
    font: {
      sans: 'Cantarell, "Avenir Next", "SF Pro Rounded", system-ui, sans-serif',
      mono: '"Cascadia Mono", "SF Mono", ui-monospace, monospace',
      display: 'Cantarell, "Avenir Next", "SF Pro Rounded", system-ui, sans-serif',
    },
    title: { weight: 700, tracking: '0em' },
    radius: { btn: 14, cell: 10, card: 18 },
  },
]

export const themeOf = (key: string | null | undefined): Theme => THEMES.find((t) => t.key === key) ?? THEMES[0]

export const channels = (hex: string) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

const lum = (hex: string) => {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
