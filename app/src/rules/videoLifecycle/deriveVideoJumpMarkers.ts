/**
 * Jump markers + guided trim windows for tournament-capture video.
 * Pure — no React, no IO.
 *
 * Tags stay in source-video seconds. Markers only help the player jump past
 * intro / warm-up / gaps and suggest a safe trim window that still covers play.
 */

export interface JumpRallyInput {
  setNumber: number
  rallyIndex: number
  /** Source-seconds window around the rally; null when untimed */
  loop: { start: number; end: number } | null
}

export interface SetJumpMarkers {
  setNumber: number
  /** First timed rally serve / contact window start */
  firstServeS: number | null
  /** Last timed rally end in this set */
  lastActionS: number | null
  /** Gap after this set before the next set's first serve (when known) */
  gapToNextSetS: number | null
  /** Suggested trim start (first serve − lead, floored at 0) */
  suggestedTrimStartS: number | null
  /** Suggested trim end (last action + tail) */
  suggestedTrimEndS: number | null
}

export interface MatchJumpMarkers {
  sets: SetJumpMarkers[]
  /** Flat list for UI chips: first serve / set end / next set */
  chips: Array<{
    key: string
    label: string
    setNumber: number
    timeS: number
  }>
}

/** Hide Gap jump / marker when between-set dead air is shorter than this. */
export const BETWEEN_SET_GAP_JUMP_MIN_S = 15

/**
 * Before any current-set first-serve contact: skip this many seconds past the
 * previous set end into dead air toward a useful estimated start of play.
 */
export const BETWEEN_SET_GAP_PRE_CONTACT_LEAD_S = 10

/** Pass 1 Gap control: show when prev end known and gap unknown or ≥ threshold. */
export function shouldShowBetweenSetGapJump(
  prevSetEndS: number | null,
  firstServeS: number | null | undefined,
  minGapS: number = BETWEEN_SET_GAP_JUMP_MIN_S
): boolean {
  if (prevSetEndS == null) return false
  if (typeof firstServeS !== 'number' || !Number.isFinite(firstServeS)) return true
  return firstServeS - prevSetEndS >= minGapS
}

/**
 * Seek target for Pass 1 Gap (seek-only; does not change live-next / Done).
 * - No first serve yet: prevEnd + pre-contact lead (dead air → estimated start).
 * - First serve known and gap ≥ min: previous set end (start of known gap).
 * - Otherwise null (control should be hidden).
 */
export function betweenSetGapSeekS(
  prevSetEndS: number | null,
  firstServeS: number | null | undefined,
  durationS?: number | null,
  opts?: { minGapS?: number; preContactLeadS?: number }
): number | null {
  if (prevSetEndS == null || !Number.isFinite(prevSetEndS)) return null
  const minGap = opts?.minGapS ?? BETWEEN_SET_GAP_JUMP_MIN_S
  const lead = opts?.preContactLeadS ?? BETWEEN_SET_GAP_PRE_CONTACT_LEAD_S

  let target: number
  if (typeof firstServeS === 'number' && Number.isFinite(firstServeS)) {
    if (firstServeS - prevSetEndS < minGap) return null
    target = prevSetEndS
  } else {
    target = prevSetEndS + lead
  }

  if (typeof durationS === 'number' && Number.isFinite(durationS) && durationS > 0) {
    target = Math.min(target, Math.max(0, durationS - 0.05))
  }
  return Math.max(0, target)
}

const TRIM_LEAD_S = 2
const TRIM_TAIL_S = 3

export function deriveVideoJumpMarkers(
  rallies: readonly JumpRallyInput[],
  opts?: { trimLeadS?: number; trimTailS?: number }
): MatchJumpMarkers {
  const lead = opts?.trimLeadS ?? TRIM_LEAD_S
  const tail = opts?.trimTailS ?? TRIM_TAIL_S

  const bySet = new Map<number, JumpRallyInput[]>()
  for (const r of rallies) {
    const list = bySet.get(r.setNumber) ?? []
    list.push(r)
    bySet.set(r.setNumber, list)
  }

  const setNumbers = [...bySet.keys()].sort((a, b) => a - b)
  const sets: SetJumpMarkers[] = setNumbers.map((setNumber) => {
    const ordered = [...(bySet.get(setNumber) ?? [])].sort((a, b) => a.rallyIndex - b.rallyIndex)
    const timed = ordered.filter((r) => r.loop && Number.isFinite(r.loop.start) && Number.isFinite(r.loop.end))
    const firstServeS = timed[0]?.loop?.start ?? null
    const lastActionS = timed.length > 0 ? timed[timed.length - 1]!.loop!.end : null
    return {
      setNumber,
      firstServeS,
      lastActionS,
      gapToNextSetS: null,
      suggestedTrimStartS:
        firstServeS === null ? null : Math.max(0, Math.floor(firstServeS - lead)),
      suggestedTrimEndS:
        lastActionS === null ? null : Math.ceil(lastActionS + tail),
    }
  })

  for (let i = 0; i < sets.length - 1; i++) {
    const cur = sets[i]!
    const next = sets[i + 1]!
    if (cur.lastActionS !== null && next.firstServeS !== null && next.firstServeS > cur.lastActionS) {
      cur.gapToNextSetS = next.firstServeS - cur.lastActionS
    }
  }

  const chips: MatchJumpMarkers['chips'] = []
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]!
    if (s.firstServeS !== null) {
      chips.push({
        key: `set-${s.setNumber}-first-serve`,
        label: sets.length === 1 ? 'First serve' : `Set ${s.setNumber} · first serve`,
        setNumber: s.setNumber,
        timeS: s.firstServeS,
      })
    }
    if (s.lastActionS !== null) {
      chips.push({
        key: `set-${s.setNumber}-end`,
        label: sets.length === 1 ? 'Set end' : `Set ${s.setNumber} · end`,
        setNumber: s.setNumber,
        timeS: s.lastActionS,
      })
    }
    if (
      s.gapToNextSetS != null &&
      s.gapToNextSetS >= BETWEEN_SET_GAP_JUMP_MIN_S &&
      s.lastActionS !== null
    ) {
      const next = sets[i + 1]
      chips.push({
        key: `set-${s.setNumber}-gap`,
        label: next
          ? `Gap → set ${next.setNumber}`
          : `Gap after set ${s.setNumber}`,
        setNumber: s.setNumber,
        timeS: s.lastActionS,
      })
    }
  }

  return { sets, chips }
}
