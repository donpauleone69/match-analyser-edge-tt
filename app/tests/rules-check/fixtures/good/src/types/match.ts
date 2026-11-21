export type Side = 'me' | 'them'

export const ENDINGS = ['Winner', 'Net', 'Long', 'Wide'] as const

export type Ending = (typeof ENDINGS)[number]

export type Flip = (s: Side) => Side

export interface RallyData {
  server: Side
  pick: (n: number) => number
}
