/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 0: '#0C0E11', 1: '#14171C', 2: '#1D2128', 3: '#282D36', 4: '#353B46' },
        chalk: { DEFAULT: '#F3F1EC', mute: '#A3A9B3', faint: '#6A717C' },
        you: { DEFAULT: '#6FE3C1', ink: '#04241B' },
        kim: { DEFAULT: '#B9A6FF', ink: '#170F38' },
        ball: { DEFAULT: '#FF7A33', ink: '#2A1000' },
        flag: { DEFAULT: '#F4D35E', ink: '#2A2100' },
        alert: { DEFAULT: '#FF5D7D', ink: '#2E0410' },
      },
      fontFamily: {
        sans: ['"SF Pro Text"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', '"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        cap: ['10px', { lineHeight: '12px', letterSpacing: '0.08em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '20px' }],
        num: ['28px', { lineHeight: '30px' }],
      },
      borderRadius: { btn: '10px', cell: '8px', card: '14px' },
    },
  },
  plugins: [],
}
