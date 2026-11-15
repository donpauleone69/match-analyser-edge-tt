import { isArchived, type MatchRecord } from '@/data/demoStore'
import { useArchiveStep } from '@/features/match/archiveJobs'

/**
 * An archive keeps only the tagged rallies. While one runs, and once it is
 * made, sets cannot be reopened or tagged further. Saved rallies still play.
 */
export type TagLock = 'archiving' | 'archived' | null

export function useTagLock(matchId: string, match: MatchRecord | undefined): TagLock {
  const running = useArchiveStep(matchId) !== null
  if (running) return 'archiving'
  return match && isArchived(match) ? 'archived' : null
}

export const TAG_LOCK_LINE: Record<Exclude<TagLock, null>, string> = {
  archiving: 'Archive running. Sets cannot be reopened or tagged further.',
  archived: 'Archived. Only the tagged rallies are kept, so sets cannot be reopened or tagged further.',
}
