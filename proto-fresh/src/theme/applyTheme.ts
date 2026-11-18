import { THEMES, channels, themeOf, type Theme, type ThemeKey } from './themes'

const STORE = 'proto-fresh-theme'

export function applyTheme(t: Theme) {
  const root = document.documentElement
  for (const [k, hex] of Object.entries(t.color)) root.style.setProperty(`--c-${k}`, channels(hex).join(' '))
  root.style.setProperty('--font-sans', t.font.sans)
  root.style.setProperty('--font-mono', t.font.mono)
  root.style.setProperty('--font-display', t.font.display)
  root.style.setProperty('--title-weight', String(t.title.weight))
  root.style.setProperty('--title-tracking', t.title.tracking)
  root.style.setProperty('--r-btn', `${t.radius.btn}px`)
  root.style.setProperty('--r-cell', `${t.radius.cell}px`)
  root.style.setProperty('--r-card', `${t.radius.card}px`)
  root.style.colorScheme = t.light ? 'light' : 'dark'
  root.dataset.theme = t.key
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.color['ink-0'])
}

export function startTheme() {
  const fromUrl = new URLSearchParams(location.search).get('theme')
  const key = THEMES.some((t) => t.key === fromUrl) ? fromUrl : localStorage.getItem(STORE)
  applyTheme(themeOf(key))
}

export function setTheme(key: ThemeKey) {
  localStorage.setItem(STORE, key)
  applyTheme(themeOf(key))
}

export const currentTheme = () => themeOf(document.documentElement.dataset.theme)
