/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 0: v('ink-0'), 1: v('ink-1'), 2: v('ink-2'), 3: v('ink-3'), 4: v('ink-4') },
        chalk: { DEFAULT: v('chalk'), mute: v('chalk-mute'), faint: v('chalk-faint') },
        you: { DEFAULT: v('you'), ink: v('you-ink') },
        kim: { DEFAULT: v('kim'), ink: v('kim-ink') },
        ball: { DEFAULT: v('ball'), ink: v('ball-ink') },
        flag: { DEFAULT: v('flag'), ink: v('flag-ink') },
        alert: { DEFAULT: v('alert'), ink: v('alert-ink') },
        vid: { bg: v('vid-bg'), table: v('vid-table'), line: v('vid-line') },
        page: v('page'),
        scrim: v('scrim'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      fontSize: {
        cap: ['10px', { lineHeight: '12px', letterSpacing: '0.08em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '20px' }],
        num: ['28px', { lineHeight: '30px' }],
      },
      borderRadius: { btn: 'var(--r-btn)', cell: 'var(--r-cell)', card: 'var(--r-card)' },
    },
  },
  plugins: [],
}
