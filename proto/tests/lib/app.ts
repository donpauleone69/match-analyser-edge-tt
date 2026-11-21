// The only import of app code. Phase 3 edits this file and nothing under tests/ besides it.
// Groups are today's modules. The comment is the phase 3 home. Never `export *`: names clash.

// -> @/rules/score
export {
  ZERO,
  addPoint,
  canSaveEarly,
  countPoints,
  firstServerAt,
  firstServerForSet,
  isLegalEnd,
  isSetWon,
  leader,
  scoreAtSetEnd,
  serverAt,
  setEndIndex,
  setOverOnRule,
} from '@/rules/score'
export type { Points } from '@/types/match'

// -> @/rules/rally
export {
  RALLY_LEAD_S,
  RALLY_PAD_S,
  addContact,
  emptyDraft,
  hitterOf,
  isError,
  loopShotOf,
  otherSide,
  pointRally,
  rallyEnd,
  rallyStart,
  shotWindow,
  winnerOf,
} from '@/rules/rally'
export type { Draft, Ending, RallyData, ShotTags, Side } from '@/types/rally'

// -> @/rules/best
export {
  bestAdvance,
  bestAt,
  bestOpener,
  bestParts,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  bestSetServer,
  padFocus,
  routeAfter,
  setDepth,
  setWingStroke,
} from '@/rules/bestFa'
export type { BestEnd, BestPartSpan } from '@/rules/bestFa'
export type { BestPart } from '@/types/rally'

// -> @/rules/mark
export {
  clampWing,
  endedEarly,
  gapsOf,
  lineAction,
  markBounds,
  markState,
  migrateSetMark,
  MIN_SET_S,
  newMarkAt,
  rallyOutside,
  setIncomplete,
  setLineLabel,
  spanBack,
  spanOnto,
  spansOnVideo,
  videoLocked,
  videoMoveBreaks,
  videoStatus,
  wingLimits,
} from '@/rules/marks'

// -> @/rules/match
export {
  deleteRally,
  deleteTags,
  editStops,
  finishSet,
  leaveMark,
  saveMark,
  settleFinished,
  startSet,
} from '@/rules/matchOps'

// -> @/rules/continuity
export {
  breakIndexes,
  expectedServer,
  leaveIds,
  openReview,
  pressReview,
  serveBands,
} from '@/rules/continuity'
export type { ReviewPress, ServeRally } from '@/rules/continuity'

// -> @/rules/input-modes
export { overrunLabels, tagRegions } from '@/features/tagging/inputModes'

// -> @/rules/timeline
export { formatClock, insertIndex, lastContactG, segmentAt, totalDuration } from '@/rules/timeline'

// -> @/rules/script
export { tagsFromPlay } from '@/features/tagging/script'
export type { ScriptRally } from '@/types/video'

// -> @/rules/timeline
export { firstContactG, segmentsOf, toGlobal } from '@/rules/timeline'

// -> @/rules/match
export {
  defaultMatchTab,
  derivePhase,
  formatScore,
  formatSize,
  hasTaggedRallies,
  isArchived,
  isMatchTagged,
  isSpareSet,
  isUntouched,
  matchSetsWon,
  matchTitle,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setHasTagProgress,
  setRalliesWithoutVideo,
  setScoresDiffer,
  setSettled,
  setState,
  taggedResult,
  taggedScore,
  taggedSetIds,
  todayDate,
} from '@/rules/match'
export type { MatchRecord, SetData, SetMark, VideoAsset } from '@/types/match'

// -> @/rules/match
export {
  formatMatchDate,
  isRealResult,
  matchDiffers,
  matchName,
  matchRowLine,
  matchResultLine,
  matchRowStatus,
  taggedResultReady,
  videoRallyCount,
} from '@/rules/matchStatus'

// -> @/rules/insights
export { gradeOf, insightRules, insightsFor, matchInsights, phaseOf } from '@/rules/insights'
export type { InsightCardModel, InsightRow } from '@/rules/insights'

// -> @/rules/filters
export {
  DEFAULT_INSIGHTS_FILTERS,
  activeFilterLabels,
  datesChip,
  filterChoices,
  filterIsSet,
  filterMatches,
  migrateFilters,
} from '@/rules/filters'
export type { InsightsFilters } from '@/features/insights/models'

// -> @/data/seed
export { emptySet } from '@/rules/match'
export { SEED } from '@/data/demoStore'
export { buildSeed, isoDaysBefore } from '@/data/buildSeed'
