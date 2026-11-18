import { asksRally, isMis, nOf, rallyPage, type Draft } from './rally.ts'

export type Loop = { from: number; to: number; rate: number; label: string }

const tOf = (d: Draft, k: number) => d.contacts[k - 1]?.t ?? 0

/** What the video loops for the open question. */
export function loopOf(d: Draft): Loop {
  const n = nOf(d)
  const first = tOf(d, 1)
  const last = tOf(d, n)
  const around = (k: number, rate: number, label: string): Loop => ({ from: tOf(d, k) - 0.7, to: tOf(d, k) + 0.5, rate, label })
  if (d.add) return { from: first - 0.8, to: last + 1.2, rate: 1, label: 'From the serve' }
  if (d.check) return { from: first - 0.6, to: last + 0.8, rate: 0.5, label: 'Every contact, half speed' }
  if (isMis(d) && n >= 2) return { from: tOf(d, n - 1) - 0.6, to: last + 0.6, rate: 0.75, label: `Shots ${n - 1} and ${n}, 0.75x` }
  if (d.q === 'end' || d.q === null) return around(n, 0.75, n === 1 ? 'The serve, 0.75x' : `Shot ${n}, 0.75x`)
  if (d.q === 'serve') return around(1, 1, 'The serve')
  const k = d.q
  if (asksRally(d) && rallyPage(d, k)) return { from: tOf(d, 5) - 0.5, to: tOf(d, k) + 0.5, rate: 1, label: `Shots 5 to ${k}` }
  return around(k, 0.75, `Shot ${k}, 0.75x`)
}
