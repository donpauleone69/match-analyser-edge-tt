import type { Side } from '@/types/match'
import { ENDINGS, type MatchStatus } from '@/types/filters'

export const typed = ENDINGS.length
export type Player = Side
void (null as unknown as MatchStatus)
