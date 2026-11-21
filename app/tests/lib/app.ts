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
  deriveMarkState as markState,
  migrateSetMark,
  MIN_SET_S,
  newMarkAt,
  rallyOutside,
  isIncomplete as setIncomplete,
  spanBack,
  spanOnto,
  spansOnVideo,
  videoLocked,
  videoMoveBreaks,
  deriveVideoStatus as videoStatus,
  wingLimits,
} from '@/rules/marks'

// -> @/rules/matchOps
export {
  deleteRally,
  deleteTags,
  deriveSetInProgress as setInProgress,
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
  hasTagProgress as setHasTagProgress,
  calculateSetRalliesWithoutVideo as setRalliesWithoutVideo,
  hasDifferingScores as setScoresDiffer,
  isSettled as setSettled,
  deriveSetState as setState,
  deriveTaggedResult as taggedResult,
  calculateTaggedScore as taggedScore,
  deriveTaggedSetIds as taggedSetIds,
} from '@/rules/match'
export type { MatchRecord, SetData, SetMark, VideoAsset } from '@/types/match'

// -> @/rules/format
export {
  formatBytes,
  formatChipDate,
  formatClock,
  formatExportWhen,
  formatMatchDate,
  formatScore,
  formatSize,
  isoDaysBefore,
  formatMatchTitle as matchTitle,
  formatSetLine as setLineLabel,
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
  idsForNameFilters,
  migrateFilters,
  resolveNameFilters,
} from '@/rules/filters'
export type { InsightsFilters } from '@/features/insights/models'

// -> @/data/seed
export { emptySet } from '@/rules/match'
export { buildSeed } from '@/data/seed/buildSeed'

// -> @/stores/matchStore
export { SEED, createMatchStore, selectMatch } from '@/stores/matchStore'
export { useSettingsStore } from '@/stores/settingsStore'

// -> @/types/db, @/rules/dbRows, @/rules/dbValidate
export {
  CATEGORIES,
  DB_TABLES,
  HANDEDNESS,
  IMPORTANCES,
  MY_ENDS,
  OPPONENT_STYLES,
  OUTCOMES,
  RANKING_STATUSES,
  ROUNDS,
  SCHEMA_VERSION,
  STAGES,
  STROKES,
} from '@/types/db'
export type {
  DbError,
  DbRows,
  DraftRow,
  EventRow,
  MatchRow,
  OpponentRow,
  RallyRow,
  SetRow,
  ShotRow,
  VideoRow,
} from '@/types/db'
export {
  BYTES_PER_MB,
  CHECK_THE_POINT,
  EMPTY_ROWS,
  deriveDbRows,
  deriveMatchChildRows,
  deriveMatchRecords,
  deriveOutcome,
  deriveRallyData,
} from '@/rules/dbRows'
export type { RowContext } from '@/rules/dbRows'
export {
  validateDbRows,
  validateDraftRow,
  validateEventRow,
  validateMatchRow,
  validateOpponentRow,
  validateRallyRow,
  validateSetRow,
  validateShotRow,
  validateUniqueNames,
  validateVideoRow,
} from '@/rules/dbValidate'
export type { RemovedVideo } from '@/types/match'
export { DB_COLUMNS, DB_TABLES as TABLES, MATCH_FILE_FORMAT } from '@/types/db'
export type { MatchFile, RepoResult } from '@/types/db'
export { deriveSetRowId, deriveShotRowId, stableJson } from '@/rules/dbRows'
export { SETTINGS_STORAGE_KEYS } from '@/stores/settingsStore'

// -> @/rules/videoFile, @/data/videoFiles
export { calculateLastModifiedMs, isSameVideoFile } from '@/rules/videoFile'
export type { VideoFileFacts } from '@/rules/videoFile'

// -> @/data (phase 8 database layer; the browser check runs these)
export { DEMO_DB_NAME, MatchDb, SCHEMA_V1_STORES, USER_DB_NAME, createMatchDb, openMatchDb } from '@/data/db'
export { createRowId } from '@/data/ids'
export {
  deleteMatch,
  deriveListRows,
  isEmpty,
  loadAll,
  readAllRows,
  reseedDemo,
  saveDraft,
  saveMatch,
  saveRally,
} from '@/data/matchRepo'
export { removeEvent, removeOpponent, renameEvent, renameOpponent } from '@/data/nameRepo'
export { deriveMatchFileName, exportMatchFile, importMatchFile, serializeMatchFile } from '@/data/matchFile'
export { readStorageInfo, requestPersistentStorage } from '@/data/storage'
export {
  VIDEO_DIR,
  deleteVideoFiles,
  fingerprintFile,
  listVideoFiles,
  pruneVideoFiles,
  readFileFacts,
  readVideoFile,
  saveVideoFile,
} from '@/data/videoFiles'
export { openMode } from '@/data/boot'
export {
  OLD_DATABASES,
  OLD_LOCAL_KEYS,
  OLD_LOCAL_PREFIXES,
  OLD_OPFS_DIRS,
  OLD_SESSION_KEYS,
  cleanupOldStorage,
  isOldLocalKey,
} from '@/data/cleanupOldStorage'
