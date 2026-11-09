/**
 * Pass 1 Opening — answer model + visibility / save rules (UI test, in-memory)
 *
 * Sections: Serve → Opening → Shot (no Incoming).
 * 2nd-ball attacks live on Serve; Opening starts at 3rd ball.
 */

export type ServeSpin = 'underspin' | 'topspin' | 'nospin' | 'sidespin_mixed' | 'unclear'
export type ServeLength = 'short' | 'halflong' | 'long'

export type ReceiveOutcome =
  | 'passive_miss'
  | 'failed_attack'
  | 'push'
  | 'returned'
  | 'attacked_in_play'

/** Includes receiver_2nd for serve-path locks; Opening UI excludes it */
export type FosTiming =
  | 'receiver_2nd'
  | 'server_3rd'
  | 'receiver_4th'
  | 'server_later'
  | 'receiver_later'
  | 'no_fos'

/** Balls that can be marked as passed-up (no "none" sentinel — empty array = none) */
export type PassedUpTiming =
  | 'receiver_2nd'
  | 'server_3rd'
  | 'receiver_4th'
  | 'server_later'
  | 'receiver_later'

export type IncomingSpin = 'underspin' | 'topspin' | 'nospin' | 'mixed' | 'unclear'
export type IncomingLength = 'short' | 'halflong' | 'long'

/** Optional ball/serve attributes — empty = normal */
export type BallFlag = 'high' | 'weak' | 'attackable'
export const BALL_FLAG_OPTIONS: BallFlag[] = ['high', 'weak', 'attackable']

export type Wing = 'fh' | 'bh'
export type FosStroke = 'topspin_loop' | 'drive' | 'flick' | 'smash'

export type ExecutionQuality = 'excellent' | 'good' | 'normal' | 'weak' | 'missed'
export type MissType = 'forced' | 'ue_net' | 'ue_long'

export type FosImmediateEffect =
  | 'direct_winner'
  | 'forced_error'
  | 'clear_opportunity'
  | 'pressure'
  | 'neutralised'
  | 'counterattacked'

export type NoFosPointEnd =
  | 'unforced_net'
  | 'unforced_long'
  | 'forced_error'
  | 'winner_other'
  | 'unclear'

export interface Pass1Answers {
  serviceFault: boolean
  serveSpin: ServeSpin | null
  serveLength: ServeLength | null
  receiveOutcome: ReceiveOutcome | null
  receiveWing: Wing | null
  receiveErrorDirection: MissType | null
  fosTiming: FosTiming | null
  /** Multi-select; empty = none passed up */
  passedUp: PassedUpTiming[]
  /** Optional serve attributes (High / Weak / Attackable) */
  serveFlags: BallFlag[]
  incomingSpin: IncomingSpin | null
  incomingLength: IncomingLength | null
  /** Optional attributes of the ball before FOS (later openings only) */
  ballFlags: BallFlag[]
  fosWing: Wing | null
  fosStroke: FosStroke | null
  execution: ExecutionQuality | null
  missType: MissType | null
  fosEffect: FosImmediateEffect | null
  noFosPointEnd: NoFosPointEnd | null
  fosResolvedTimestamp: number | null
}

export interface Pass1Visibility {
  showServeBasics: boolean
  showReceiveOutcome: boolean
  showOpeningSection: boolean
  showPassedUp: boolean
  /** Optional serve attribute toggles (after length) */
  showServeFlags: boolean
  /** Later-FOS ball questions on Shot (not 2nd-ball serve paths) */
  showBallOnShot: boolean
  showIncomingSpinLength: boolean
  showBallFlags: boolean
  showFosShotSection: boolean
  showMissType: boolean
  showFosEffect: boolean
  showNoFosPointEnd: boolean
  needsFosResolvedMark: boolean
  isPassiveMiss: boolean
  isFailedAttackReceive: boolean
  isAttackedInPlay: boolean
}

const FOS_ORDER: FosTiming[] = [
  'receiver_2nd',
  'server_3rd',
  'receiver_4th',
  'server_later',
  'receiver_later',
]

/** Opening (push/returned): no receiver_2nd — that is covered on Serve */
export const OPENING_FOS_OPTIONS: FosTiming[] = [
  'server_3rd',
  'receiver_4th',
  'server_later',
  'receiver_later',
  'no_fos',
]

function fosRank(t: FosTiming | null): number {
  if (!t || t === 'no_fos') return 99
  return FOS_ORDER.indexOf(t)
}

export function emptyPass1Answers(): Pass1Answers {
  return {
    serviceFault: false,
    serveSpin: null,
    serveLength: null,
    receiveOutcome: null,
    receiveWing: null,
    receiveErrorDirection: null,
    fosTiming: null,
    passedUp: [],
    serveFlags: [],
    incomingSpin: null,
    incomingLength: null,
    ballFlags: [],
    fosWing: null,
    fosStroke: null,
    execution: null,
    missType: null,
    fosEffect: null,
    noFosPointEnd: null,
    fosResolvedTimestamp: null,
  }
}

/** Balls strictly before the recorded FOS (multi-select). Empty when none apply. */
export function passedUpOptionsFor(fosTiming: FosTiming | null): PassedUpTiming[] {
  if (!fosTiming || fosTiming === 'no_fos') return []
  const limit = fosRank(fosTiming)
  return FOS_ORDER.filter((t) => fosRank(t) < limit) as PassedUpTiming[]
}

export function togglePassedUp(
  current: PassedUpTiming[],
  value: PassedUpTiming
): PassedUpTiming[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value]
}

export function toggleBallFlag(current: BallFlag[], value: BallFlag): BallFlag[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value]
}

export function deriveVisibility(a: Pass1Answers): Pass1Visibility {
  if (a.serviceFault) {
    return {
      showServeBasics: false,
      showReceiveOutcome: false,
      showOpeningSection: false,
      showPassedUp: false,
      showServeFlags: false,
      showBallOnShot: false,
      showIncomingSpinLength: false,
      showBallFlags: false,
      showFosShotSection: false,
      showMissType: false,
      showFosEffect: false,
      showNoFosPointEnd: false,
      needsFosResolvedMark: false,
      isPassiveMiss: false,
      isFailedAttackReceive: false,
      isAttackedInPlay: false,
    }
  }

  const hasServeBasics = !!(a.serveSpin && a.serveLength)
  const outcome = a.receiveOutcome
  const isPassiveMiss = outcome === 'passive_miss'
  const isFailedAttackReceive = outcome === 'failed_attack'
  const isAttackedInPlay = outcome === 'attacked_in_play'
  const needsOpening = outcome === 'returned' || outcome === 'push'

  const hasFos =
    !!a.fosTiming && a.fosTiming !== 'no_fos' && !isPassiveMiss

  const missed = a.execution === 'missed' || isFailedAttackReceive
  const continues =
    !!a.fosEffect &&
    (a.fosEffect === 'clear_opportunity' ||
      a.fosEffect === 'pressure' ||
      a.fosEffect === 'neutralised' ||
      a.fosEffect === 'counterattacked')

  const passedUpOpts = passedUpOptionsFor(a.fosTiming)
  const showPassedUp = needsOpening && hasFos && passedUpOpts.length > 0

  // Later FOS only — 2nd-ball paths use serve as the ball (flags on Serve)
  const isLaterFos = hasFos && needsOpening

  return {
    showServeBasics: true,
    showReceiveOutcome: hasServeBasics,
    showServeFlags: hasServeBasics,
    showOpeningSection: hasServeBasics && needsOpening,
    showPassedUp,
    showBallOnShot: isLaterFos,
    showIncomingSpinLength: isLaterFos,
    showBallFlags: isLaterFos,
    showFosShotSection:
      isPassiveMiss ||
      (hasFos && (needsOpening || isFailedAttackReceive || isAttackedInPlay)),
    showMissType: hasFos && missed,
    showFosEffect: hasFos && !!a.execution && !missed,
    showNoFosPointEnd: needsOpening && a.fosTiming === 'no_fos',
    needsFosResolvedMark: hasFos && !missed && continues,
    isPassiveMiss,
    isFailedAttackReceive,
    isAttackedInPlay,
  }
}

export function applyReceiveOutcome(
  prev: Pass1Answers,
  receiveOutcome: ReceiveOutcome
): Pass1Answers {
  const base: Pass1Answers = {
    ...prev,
    receiveOutcome,
    receiveWing: null,
    receiveErrorDirection: null,
    fosTiming: null,
    passedUp: [],
    incomingSpin: null,
    incomingLength: null,
    ballFlags: [],
    fosWing: null,
    fosStroke: null,
    execution: null,
    missType: null,
    fosEffect: null,
    noFosPointEnd: null,
    fosResolvedTimestamp: null,
  }

  if (receiveOutcome === 'passive_miss') {
    return { ...base, fosTiming: 'no_fos' }
  }

  if (receiveOutcome === 'failed_attack') {
    return {
      ...base,
      fosTiming: 'receiver_2nd',
      passedUp: [],
      incomingSpin: mapServeSpinToIncoming(prev.serveSpin),
      incomingLength: mapServeLengthToIncoming(prev.serveLength),
      execution: 'missed',
    }
  }

  if (receiveOutcome === 'attacked_in_play') {
    return {
      ...base,
      fosTiming: 'receiver_2nd',
      passedUp: [],
      incomingSpin: mapServeSpinToIncoming(prev.serveSpin),
      incomingLength: mapServeLengthToIncoming(prev.serveLength),
    }
  }

  return base
}

export function applyFosTimingSideEffects(
  prev: Pass1Answers,
  fosTiming: FosTiming
): Pass1Answers {
  const allowed = new Set(passedUpOptionsFor(fosTiming))
  const passedUp = prev.passedUp.filter((v) => allowed.has(v))

  const next: Pass1Answers = { ...prev, fosTiming, passedUp }

  if (fosTiming === 'no_fos') {
    return {
      ...next,
      passedUp: [],
      incomingSpin: null,
      incomingLength: null,
      ballFlags: [],
      fosWing: null,
      fosStroke: null,
      execution: null,
      missType: null,
      fosEffect: null,
      fosResolvedTimestamp: null,
    }
  }

  if (fosTiming === 'receiver_2nd') {
    return {
      ...next,
      incomingSpin: mapServeSpinToIncoming(prev.serveSpin),
      incomingLength: mapServeLengthToIncoming(prev.serveLength),
      noFosPointEnd: null,
    }
  }

  return { ...next, noFosPointEnd: null }
}

function mapServeSpinToIncoming(spin: ServeSpin | null): IncomingSpin | null {
  if (!spin) return null
  if (spin === 'sidespin_mixed') return 'mixed'
  if (spin === 'nospin') return 'nospin'
  return spin
}

function mapServeLengthToIncoming(len: ServeLength | null): IncomingLength | null {
  return len
}

export type Pass1SectionId = 'serve' | 'opening' | 'shot'

export const PASS1_SECTION_LABEL: Record<Pass1SectionId, string> = {
  serve: 'Serve',
  opening: 'Opening',
  shot: 'Shot',
}

export function visiblePass1Sections(
  a: Pass1Answers,
  v: Pass1Visibility
): Pass1SectionId[] {
  if (a.serviceFault) return ['serve']

  const sections: Pass1SectionId[] = ['serve']

  if (v.isPassiveMiss || v.isFailedAttackReceive || v.isAttackedInPlay) {
    sections.push('shot')
    return sections
  }

  if (v.showOpeningSection) sections.push('opening')

  if (
    (a.receiveOutcome === 'returned' || a.receiveOutcome === 'push') &&
    a.fosTiming === 'no_fos'
  ) {
    return sections
  }

  if (v.showFosShotSection) sections.push('shot')

  return sections
}

export function isPass1SectionComplete(
  section: Pass1SectionId,
  a: Pass1Answers,
  v: Pass1Visibility
): boolean {
  if (a.serviceFault) return section === 'serve'

  switch (section) {
    case 'serve':
      return !!(a.serveSpin && a.serveLength && a.receiveOutcome)
    case 'opening': {
      if (!a.fosTiming) return false
      if (v.showNoFosPointEnd) return !!a.noFosPointEnd
      return true
    }
    case 'shot': {
      if (v.isPassiveMiss) {
        return !!(a.receiveWing && a.receiveErrorDirection)
      }
      if (v.showIncomingSpinLength) {
        if (!a.incomingSpin || !a.incomingLength) return false
      }
      // serveFlags / ballFlags are optional (empty = normal)
      if (!a.fosWing || !a.fosStroke) return false
      if (!v.isFailedAttackReceive && !a.execution) return false
      if (v.showMissType && !a.missType) return false
      if (v.showFosEffect && !a.fosEffect) return false
      if (v.needsFosResolvedMark && a.fosResolvedTimestamp === null) return false
      return true
    }
    default:
      return false
  }
}

export function canSavePass1(a: Pass1Answers, v: Pass1Visibility): boolean {
  const sections = visiblePass1Sections(a, v)
  return sections.every((s) => isPass1SectionComplete(s, a, v))
}

export function summarizePass1Line(a: Pass1Answers): string {
  if (a.serviceFault) return 'Service fault'

  const bits: string[] = []
  if (a.serveLength) bits.push(SERVE_LENGTH_LABEL[a.serveLength])
  if (a.serveSpin) bits.push(SERVE_SPIN_LABEL[a.serveSpin])
  if (a.serveFlags.length > 0) {
    bits.push(a.serveFlags.map((f) => BALL_FLAG_LABEL[f]).join('+'))
  }
  if (a.receiveOutcome) bits.push(RECEIVE_OUTCOME_LABEL[a.receiveOutcome])

  if (a.receiveOutcome === 'passive_miss') {
    if (a.receiveWing) bits.push(a.receiveWing === 'fh' ? 'FH' : 'BH')
    if (a.receiveErrorDirection) bits.push(MISS_TYPE_LABEL[a.receiveErrorDirection])
    bits.push('No FOS')
    return bits.join(' · ')
  }

  if (a.fosTiming) bits.push(FOS_TIMING_LABEL[a.fosTiming])
  if (a.passedUp.length > 0) {
    bits.push(`Passed up ${a.passedUp.map((p) => PASSED_UP_LABEL[p]).join(', ')}`)
  }
  if (a.ballFlags.length > 0) {
    bits.push(a.ballFlags.map((f) => BALL_FLAG_LABEL[f]).join('+'))
  }
  if (a.execution === 'missed' && a.missType) {
    bits.push(`Missed ${MISS_TYPE_LABEL[a.missType]}`)
  } else if (a.execution && a.execution !== 'missed') {
    bits.push(EXECUTION_LABEL[a.execution])
  }
  if (a.fosEffect) bits.push(FOS_EFFECT_LABEL[a.fosEffect])
  if (a.noFosPointEnd) bits.push(NO_FOS_END_LABEL[a.noFosPointEnd])

  return bits.join(' · ')
}

export const SERVE_SPIN_LABEL: Record<ServeSpin, string> = {
  underspin: 'Under',
  topspin: 'Top',
  nospin: 'No spin',
  sidespin_mixed: 'Side / mixed',
  unclear: 'Unclear',
}

export const SERVE_LENGTH_LABEL: Record<ServeLength, string> = {
  short: 'Short',
  halflong: 'Half-long',
  long: 'Long',
}

export const RECEIVE_OUTCOME_LABEL: Record<ReceiveOutcome, string> = {
  passive_miss: 'Passive miss',
  failed_attack: 'Attack missed',
  push: 'Push',
  returned: 'Returned',
  attacked_in_play: 'Attacked in play',
}

export const FOS_TIMING_LABEL: Record<FosTiming, string> = {
  receiver_2nd: '2nd · Receiver',
  server_3rd: '3rd · Server',
  receiver_4th: '4th · Receiver',
  server_later: 'Later · Server',
  receiver_later: 'Later · Receiver',
  no_fos: 'No opening',
}

export const PASSED_UP_LABEL: Record<PassedUpTiming, string> = {
  receiver_2nd: '2nd · Receiver',
  server_3rd: '3rd · Server',
  receiver_4th: '4th · Receiver',
  server_later: 'Later · Server',
  receiver_later: 'Later · Receiver',
}

export const INCOMING_SPIN_LABEL: Record<IncomingSpin, string> = {
  underspin: 'Underspin',
  topspin: 'Topspin',
  nospin: 'No spin',
  mixed: 'Mixed / side',
  unclear: 'Unclear',
}

export const INCOMING_LENGTH_LABEL: Record<IncomingLength, string> = {
  short: 'Short',
  halflong: 'Half-long',
  long: 'Long',
}

export const BALL_FLAG_LABEL: Record<BallFlag, string> = {
  high: 'High',
  weak: 'Weak',
  attackable: 'Attackable',
}

export const STROKE_LABEL: Record<FosStroke, string> = {
  topspin_loop: 'Topspin loop',
  drive: 'Drive',
  flick: 'Flick',
  smash: 'Smash',
}

export const EXECUTION_LABEL: Record<ExecutionQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  normal: 'Normal',
  weak: 'Weak',
  missed: 'Missed',
}

export const MISS_TYPE_LABEL: Record<MissType, string> = {
  forced: 'Forced error',
  ue_net: 'Unforced · Net',
  ue_long: 'Unforced · Long',
}

export const FOS_EFFECT_LABEL: Record<FosImmediateEffect, string> = {
  direct_winner: 'Direct winner',
  forced_error: 'Forced error',
  clear_opportunity: 'Clear opportunity',
  pressure: 'Created pressure',
  neutralised: 'Neutralised',
  counterattacked: 'Counterattacked',
}

export const NO_FOS_END_LABEL: Record<NoFosPointEnd, string> = {
  unforced_net: 'Unforced · Net',
  unforced_long: 'Unforced · Long',
  forced_error: 'Forced error',
  winner_other: 'Winner (other)',
  unclear: 'Unclear',
}
