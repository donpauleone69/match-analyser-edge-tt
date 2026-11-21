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
  deriveLeader as leader,
  calculateScoreAtSetEnd as scoreAtSetEnd,
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

// -> @/rules/bestFa
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

// -> @/rules/marks
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

// -> @/rules/matchOps
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
export { overrunLabels, tagRegions } from '@/features/tagging/derive/deriveInputArea'

// -> @/rules/timeline
export { insertIndex, lastContactG, segmentAt, totalDuration } from '@/rules/timeline'

// -> @/data/seed/script
export { tagsFromPlay } from '@/data/seed/script'
export type { ScriptRally } from '@/types/video'

// -> @/rules/timeline
export { firstContactG, segmentsOf, toGlobal } from '@/rules/timeline'

// -> @/rules/match
export {
  deriveDefaultMatchTab as defaultMatchTab,
  derivePhase,
  hasTaggedRallies,
  isArchived,
  isMatchTagged,
  isSpareSet,
  isUntouched,
  calculateMatchSetsWon as matchSetsWon,
  deriveMissingVideoIds as missingVideoIds,
  parseEntered,
  resultDiffers,
  calculateResultSetCount as resultSetCount,
  setHasTagProgress,
  calculateSetRalliesWithoutVideo as setRalliesWithoutVideo,
  setScoresDiffer,
  setSettled,
  deriveSetState as setState,
  deriveTaggedResult as taggedResult,
  calculateTaggedScore as taggedScore,
  deriveTaggedSetIds as taggedSetIds,
} from '@/rules/match'
export type { MatchRecord, SetData, SetMark, VideoAsset } from '@/types/match'

// -> @/rules/format
export {
  formatChipDate,
  formatClock,
  formatMatchDate,
  formatScore,
  formatSize,
  isoDaysBefore,
  formatMatchTitle as matchTitle,
  formatMatchRowLine as matchRowLine,
  formatMatchResultLine as matchResultLine,
  formatTodayDate as todayDate,
} from '@/rules/format'

// -> @/rules/matchStatus
export {
  isRealResult,
  matchDiffers,
  formatMatchName as matchName,
  deriveMatchRowStatus as matchRowStatus,
  taggedResultReady,
  calculateVideoRallyCount as videoRallyCount,
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
export { buildSeed } from '@/data/seed/buildSeed'

// -> @/stores/matchStore
export { SEED, createMatchStore, selectMatch } from '@/stores/matchStore'
