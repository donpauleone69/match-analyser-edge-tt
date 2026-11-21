import { useMatchStore } from '@/stores/matchStore'

export type Side = 'me' | 'them'

export function otherSide(s: Side): Side {
  return s === 'me' ? 'them' : 'me'
}

export const flip = (s: Side): Side => otherSide(s)

export const store = useMatchStore
