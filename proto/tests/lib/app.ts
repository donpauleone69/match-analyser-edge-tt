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
export type { Points } from '@/features/tagging/score'

// -> @/rules/rally
export {
  RALLY_LEAD_S,
  RALLY_PAD_S,
  addContact,
  emptyDraft,
  hitterOf,
  otherSide,
  pointRally,
  winnerOf,
} from '@/features/tagging/rally'
export type { Draft, Ending, RallyData, ShotTags, Side } from '@/features/tagging/rally'

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
export type { BestEnd, BestPart, BestPartSpan } from '@/features/tagging/bestFlow'

// -> @/rules/mark
export {
  endedEarly,
  lineAction,
  markBounds,
  markState,
  migrateSetMark,
  newMarkAt,
  rallyOutside,
  setIncomplete,
  setLineLabel,
  videoLocked,
  videoMoveBreaks,
  videoStatus,
} from '@/features/tagging/setMark'

// -> @/rules/match
export { deleteTags, editStops, finishSet, startSet } from '@/features/tagging/matchOps'

// -> @/rules/continuity
export { serveBands } from '@/features/tagging/continuity'

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
export type { MatchRecord, SetData, SetMark, VideoAsset } from '@/data/demoStore'

// -> @/rules/match
export {
  formatMatchDate,
  isRealResult,
  matchDiffers,
  matchName,
  matchRowLine,
  matchRowStatus,
  taggedResultReady,
  videoRallyCount,
} from '@/features/match/matchChecks'

// -> @/rules/insights
export { insightRules, insightsFor, matchInsights, phaseOf } from '@/features/insights/insightCounts'

// -> @/rules/filters
export {
  DEFAULT_INSIGHTS_FILTERS,
  activeFilterLabels,
  datesChip,
  filterChoices,
  filterIsSet,
  filterMatches,
} from '@/features/insights/insightsFilterContext'
export type { InsightsFilters } from '@/features/insights/insightsFilterContext'

// -> @/data/seed
export { SEED } from '@/data/demoStore'
export { buildSeed } from '@/data/buildSeed'
