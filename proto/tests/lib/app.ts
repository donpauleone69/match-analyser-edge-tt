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
} from '@/features/tagging/score'
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
} from '@/features/tagging/rally'
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
} from '@/features/tagging/bestFlow'
export type { BestEnd, BestPartSpan } from '@/features/tagging/bestFlow'
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
} from '@/features/tagging/setMark'

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
} from '@/features/tagging/matchOps'

// -> @/rules/continuity
export {
  breakIndexes,
  expectedServer,
  leaveIds,
  openReview,
  pressReview,
  serveBands,
} from '@/features/tagging/continuity'
export type { ReviewPress, ServeRally } from '@/features/tagging/continuity'

// -> @/rules/input-modes
export { overrunLabels, tagRegions } from '@/features/tagging/inputModes'

// -> @/rules/timeline
export { lastContactG, totalDuration } from '@/features/tagging/timeline'

// -> @/rules/script
export { tagsFromPlay } from '@/features/tagging/script'
export type { ScriptRally } from '@/types/video'

// -> @/rules/timeline
export { firstContactG, segmentsOf, toGlobal } from '@/features/tagging/timeline'

// -> @/rules/match
export {
  defaultMatchTab,
  derivePhase,
  hasTaggedRallies,
  isArchived,
  isMatchTagged,
  isSpareSet,
  matchSetsWon,
  matchTitle,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  setScoresDiffer,
  setSettled,
  setState,
  taggedResult,
  taggedScore,
} from '@/data/demoStore'
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
} from '@/features/match/matchChecks'

// -> @/rules/insights
export { gradeOf, insightRules, insightsFor, matchInsights, phaseOf } from '@/features/insights/insightCounts'
export type { InsightCardModel, InsightRow } from '@/features/insights/insightCounts'

// -> @/rules/filters
export {
  DEFAULT_INSIGHTS_FILTERS,
  activeFilterLabels,
  datesChip,
  filterChoices,
  filterIsSet,
  filterMatches,
  migrateFilters,
} from '@/features/insights/insightsFilterContext'
export type { InsightsFilters } from '@/features/insights/models'

// -> @/data/seed
export { emptySet, SEED } from '@/data/demoStore'
export { buildSeed, isoDaysBefore } from '@/data/buildSeed'
