import type { Side } from '@/types/match'
import { add } from './pure'

export function calculateSetEnd(side: Side) {
  return side === 'me' ? add(11, 0) : add(0, 11)
}
