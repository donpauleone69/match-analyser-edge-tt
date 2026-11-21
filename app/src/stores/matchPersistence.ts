/**
 * The write queue for the match database. Writes run one at a time. A failed
 * write bumps the epoch so anything queued after it is dropped; the store
 * rolls itself back.
 */
import { stableJson } from '@/rules/dbRows'
import type { MatchRecord } from '@/types/match'
import type { Draft } from '@/types/rally'

let epoch = 0
let chain: Promise<void> = Promise.resolve()

export function writeEpoch(): number {
  return epoch
}

/** Later queued writes no-op. Used when the open database changes. */
export function invalidateWrites() {
  epoch += 1
}

/**
 * Runs `task` after the writes already queued. `task` returns false when the
 * write was refused; that drops every write queued behind it.
 */
export function afterWrite(epochAt: number, task: () => Promise<boolean>) {
  chain = chain
    .then(async () => {
      if (epochAt !== epoch) return
      const ok = await task()
      if (!ok) epoch += 1
    })
    .catch(() => {
      epoch += 1
    })
}

/** The one set whose draft changed, when nothing else on the match did. */
export function draftOnly(before: MatchRecord, after: MatchRecord): { setId: number; draft: Draft | null } | null {
  if (before.sets.length !== after.sets.length) return null
  const rest = (match: MatchRecord) => ({
    ...match,
    sets: match.sets.map((set) => ({ ...set, draft: null })),
  })
  if (stableJson(rest(before)) !== stableJson(rest(after))) return null
  const diffs = after.sets.filter((set, i) => stableJson(set.draft) !== stableJson(before.sets[i]?.draft ?? null))
  if (diffs.length !== 1) return null
  return { setId: diffs[0].setId, draft: diffs[0].draft }
}
