import { isArchived } from '@/rules/match'
import type { MatchRecord } from '@/types/match'
import type { TagLock } from '../models'

export function useTagLock(match: MatchRecord | undefined, archiveStep: number | null): TagLock {
  if (archiveStep !== null) return 'archiving'
  return match && isArchived(match) ? 'archived' : null
}

export const TAG_LOCK_LINE: Record<Exclude<TagLock, null>, string> = {
  archiving: 'Archive running. Sets cannot be reopened or tagged further.',
  archived: 'Archived. Only the tagged rallies are kept, so sets cannot be reopened or tagged further.',
}
