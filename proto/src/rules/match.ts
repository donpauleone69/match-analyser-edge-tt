/** Match and set state worked out from what was tagged and entered. Pure. */

import { formatTodayDate } from './format'
import { countPoints, firstServerForSet, deriveLeader, calculateScoreAtSetEnd } from './score'
import { deriveMarkState, migrateSetMark, isIncomplete } from './marks'
import type { EnteredScore, MatchPhase, MatchRecord, Score, SetData, SetState } from '@/types/match'

/** Counted from the saved rallies; null until the set has one. A set that was won, then tagged past that rally, counts the score at the win. */
export function calculateTaggedScore(s: SetData): Score | null {
  if (s.rallies.length === 0) return null
  const winners = s.rallies.map((r) => r.winner)
  return calculateScoreAtSetEnd(winners) ?? countPoints(winners)
}

export function hasTagProgress(s: SetData): boolean {
  return s.rallies.length > 0 || s.draft !== null || s.finished
}

export function deriveSetState(s: SetData): SetState {
  if (s.skipped) return 'skipped'
  if (s.finished) return 'finished'
  return hasTagProgress(s) ? 'progress' : 'none'
}

/** Number of sets the result dictates (3 - 2 means 5), or null if not entered. */
export function calculateResultSetCount(match: MatchRecord): number | null {
  const { me, them } = match.result
  if (me === null || them === null) return null
  const total = me + them
  return total > 0 ? total : null
}

function lastSetId(sets: SetData[], test: (s: SetData) => boolean): number {
  return sets.reduce((max, s) => (test(s) ? Math.max(max, s.setId) : max), 0)
}

/** Highest set with tagging in it. Never dropped, even if the result says fewer. */
export function deriveLastTaggedSetId(match: MatchRecord): number {
  return lastSetId(match.sets, hasTagProgress)
}

export function emptySet(setId: number): SetData {
  return {
    setId,
    entered: { me: '', them: '' },
    skipped: false,
    finished: false,
    firstServer: firstServerForSet('me', setId),
    rallies: [],
    draft: null,
    mark: null,
  }
}

/**
 * The result dictates the set list. With no result, list every set that is
 * tagged, not filmed or has an entered score, then one spare set to start
 * next. An older tagDone flag drops the spare, and only holds while every
 * set that is left is finished or not filmed.
 */
export function normalizeMatch(match: MatchRecord): MatchRecord {
  const fromResult = calculateResultSetCount(match)
  const used = Math.max(
    lastSetId(match.sets, (s) => hasTagProgress(s) || s.skipped || s.mark !== null),
    lastSetId(match.sets, (s) => s.entered.me !== '' || s.entered.them !== '')
  )
  const loose = match.sets.some((s) => s.setId <= used && !isSettled(s))
  const tagDone = match.tagDone && !loose && match.sets.some((s) => deriveSetState(s) === 'finished')
  const count =
    fromResult !== null
      ? Math.max(fromResult, deriveLastTaggedSetId(match))
      : Math.max(1, tagDone ? used : used + 1)
  const listed =
    count === match.sets.length
      ? match.sets
      : Array.from(
          { length: count },
          (_, i) => match.sets.find((s) => s.setId === i + 1) ?? emptySet(i + 1)
        )
  const sets = listed.map((s) => migrateSetMark(match.videos, s))
  const sameSets = sets.length === match.sets.length && sets.every((s, i) => s === match.sets[i])
  return sameSets && tagDone === match.tagDone ? match : { ...match, sets, tagDone }
}

/** With no result the last listed set is a spare: it can be started, not skipped. */
export function isSpareSet(match: MatchRecord, s: SetData): boolean {
  return (
    calculateResultSetCount(match) === null &&
    s.setId === match.sets.length &&
    s.mark === null &&
    deriveSetState(s) === 'none' &&
    s.entered.me === '' &&
    s.entered.them === ''
  )
}

/**
 * Saved and won, or unmarked / incomplete once Details has a score.
 * A legacy not-filmed flag still counts. Ready and tagging do not.
 */
export function isSettled(s: SetData): boolean {
  if (isIncomplete(s)) return parseEntered(s.entered) !== null
  if (s.finished || s.skipped) return true
  if (deriveMarkState(s) === 'off') return parseEntered(s.entered) !== null
  return false
}

/** A won set uses its tagged score. Incomplete, skipped and unmarked sets use Details. */
function calculateCountedScore(s: SetData): Score | null {
  if (isIncomplete(s)) return parseEntered(s.entered)
  if (s.finished) {
    const atEnd = calculateScoreAtSetEnd(s.rallies.map((r) => r.winner))
    return atEnd ?? calculateTaggedScore(s)
  }
  if (s.skipped || deriveMarkState(s) === 'off') return parseEntered(s.entered)
  return null
}

/**
 * The one sets count, used wherever the app says "sets X - Y". A saved set
 * counts from its tagged score. Skipped and unmarked sets count from the
 * Details score. A set still to tag counts for nobody.
 */
export function calculateMatchSetsWon(match: MatchRecord): Score {
  const won = { me: 0, them: 0 }
  for (const s of match.sets) {
    const score = calculateCountedScore(s)
    const side = score ? deriveLeader(score) : null
    if (side) won[side] += 1
  }
  return won
}

/**
 * Tagged comes from tagging. With a result entered, every set it lists is
 * saved or counted from Details. With no result, only an older tagDone flag
 * counts. Never while a set is still being tagged.
 */
export function isMatchTagged(match: MatchRecord): boolean {
  if (match.sets.some((s) => deriveSetState(s) === 'progress')) return false
  if (!match.sets.some((s) => s.finished)) return false
  const count = calculateResultSetCount(match)
  if (count === null) return match.tagDone
  return match.sets.filter((s) => s.setId <= count).every(isSettled)
}

export function derivePhase(match: MatchRecord): MatchPhase {
  const tagged = match.sets.some((s) => !s.skipped && hasTagProgress(s))
  if (!tagged) return match.videos.length === 0 ? 'new' : 'ready'
  return isMatchTagged(match) ? 'complete' : 'partial'
}

export function deriveDefaultMatchTab(
  phase: MatchPhase
): 'insights' | 'details' | 'tag' {
  if (phase === 'new') return 'tag'
  if (phase === 'ready' || phase === 'partial') return 'tag'
  return 'insights'
}

export function deriveTaggedSetIds(match: MatchRecord): number[] {
  return match.sets
    .filter((s) => !s.skipped && hasTagProgress(s))
    .map((s) => s.setId)
}

export function hasTaggedRallies(match: MatchRecord): boolean {
  return match.sets.some((s) => !s.skipped && s.rallies.length > 0)
}

export function parseEntered(entered: EnteredScore): Score | null {
  if (entered.me === '' || entered.them === '') return null
  return { me: Number(entered.me), them: Number(entered.them) }
}

/** Entered and tagged scores are only compared once the set is finished. */
export function hasDifferingScores(s: SetData): boolean {
  const entered = parseEntered(s.entered)
  const tagged = calculateTaggedScore(s)
  if (!entered || !tagged || s.skipped || !s.finished) return false
  return entered.me !== tagged.me || entered.them !== tagged.them
}

/**
 * calculateMatchSetsWon, but only once every listed set gives a winner. Null while a
 * set is still to tag, or is not on video with no Details score.
 */
export function deriveTaggedResult(match: MatchRecord): Score | null {
  const won = { me: 0, them: 0 }
  for (const s of match.sets) {
    if (isSpareSet(match, s)) continue
    const side = deriveLeader(calculateCountedScore(s) ?? { me: 0, them: 0 })
    if (!side) return null
    won[side] += 1
  }
  return won.me + won.them > 0 ? won : null
}

/** The entered result disagrees with the set winners from tagging. */
export function resultDiffers(match: MatchRecord): boolean {
  const { me, them } = match.result
  if (me === null || them === null || !isMatchTagged(match)) return false
  const tagged = deriveTaggedResult(match)
  return tagged !== null && (tagged.me !== me || tagged.them !== them)
}

/**
 * An archive keeps only the tagged rallies, so once any video is the archived
 * copy the match cannot be tagged further.
 */
export function isArchived(match: MatchRecord): boolean {
  return match.videos.some((v) => v.archived)
}

/** Removed videos that saved or open rallies still point at, in set order. */
export function deriveMissingVideoIds(match: MatchRecord): string[] {
  const have = new Set(match.videos.map((v) => v.id))
  const out: string[] = []
  for (const s of match.sets) {
    const ids = s.rallies.map((r) => r.videoId)
    if (s.draft) ids.push(s.draft.videoId)
    for (const id of ids) if (!have.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

/** How many of a set's rallies (saved or open) sit on a removed video. */
export function calculateSetRalliesWithoutVideo(match: MatchRecord, s: SetData): number {
  const have = new Set(match.videos.map((v) => v.id))
  return (
    s.rallies.filter((r) => !have.has(r.videoId)).length +
    (s.draft && !have.has(s.draft.videoId) ? 1 : 0)
  )
}

/** A new match nobody has put anything into. Discarded when left. */
export function isUntouched(match: MatchRecord): boolean {
  return (
    !match.opponent.trim() &&
    !match.event.trim() &&
    // The date a new match starts with does not count as put in.
    (!match.date.trim() || match.date === formatTodayDate()) &&
    match.result.me === null &&
    match.result.them === null &&
    match.videos.length === 0 &&
    match.sets.every(
      (s) =>
        !s.mark &&
        !s.skipped &&
        !hasTagProgress(s) &&
        s.entered.me === '' &&
        s.entered.them === ''
    )
  )
}

/** The seed with deleted ones dropped and changed ones swapped in, then the created ones. */
export function mergeMatches(seed: MatchRecord[], extra: MatchRecord[], deleted: string[]): MatchRecord[] {
  const seedIds = new Set(seed.map((s) => s.id))
  const overrides = new Map(extra.map((m) => [m.id, m]))
  const merged = seed.filter((s) => !deleted.includes(s.id)).map(
    (s) => overrides.get(s.id) ?? s
  )
  const onlyExtra = extra.filter((m) => !seedIds.has(m.id))
  return [...merged, ...onlyExtra].map(normalizeMatch)
}

/**
 * Newest first, with no date sorting as newest. On the same date a created
 * match comes before a seed, and the latest created comes first.
 */
export function sortNewestFirst(list: MatchRecord[], seedIds: ReadonlySet<string>): MatchRecord[] {
  const at = new Map(list.map((m, i) => [m.id, i]))
  const index = (m: MatchRecord) => at.get(m.id) ?? 0
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      if (!a.date || !b.date) return a.date ? 1 : -1
      return b.date.localeCompare(a.date)
    }
    const created = !seedIds.has(a.id) || !seedIds.has(b.id)
    return created ? index(b) - index(a) : index(a) - index(b)
  })
}
