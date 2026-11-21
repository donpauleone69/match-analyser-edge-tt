import { add } from '@/rules/pure'
import { ENDINGS, type Side } from '@/types/match'

export function openDb() {
  return indexedDB.open('edge-tt', 1)
}

export const seed: { side: Side; n: number; ending: string } = { side: 'me', n: add(1, 2), ending: ENDINGS[0] }
