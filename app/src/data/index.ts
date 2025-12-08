/**
 * Data Layer - Central export
 * 
 * Entities with stores (use these in components):
 * - Clubs, Tournaments, Players, Matches
 * 
 * Entities without stores (DB operations only):
 * - Sets, Rallies, Shots (managed through tagging context)
 */

// Export stores (for use in features)
export { useClubStore } from './entities/clubs'
export { useTournamentStore } from './entities/tournaments'
export { usePlayerStore } from './entities/players'
export { useMatchStore } from './entities/matches'

// Export types (for use everywhere)
export type {
  DBClub,
  NewClub,
} from './entities/clubs'

export type {
  DBTournament,
  NewTournament,
  TournamentType,
} from './entities/tournaments'

export type {
  DBPlayer,
  NewPlayer,
  Handedness,
  Playstyle,
} from './entities/players'

export type {
  DBMatch,
  NewMatch,
  MatchRound,
  TaggingMode,
  BestOf,
} from './entities/matches'

export type {
  DBSet,
  NewSet,
  DBSetVideoContext,
} from './entities/sets'

export type {
  DBRally,
  NewRally,
} from './entities/rallies'

export type {
  DBShot,
  NewShot,
  ShotIntent,
  ShotResult,
  TablePosition,
  RallyEndRole,
  PressureLevel,
  IntentQuality,
  ServeSpinFamily,
  ShotLength,
  ShotLabel,
  ShotContactTiming,
  PlayerPosition,
  PlayerDistance,
  ShotSpeed,
  ShotArc,
  ServeType,
} from './entities/shots'

export type {
  DBMatchVideo,
  NewMatchVideo,
  MatchCoverageType,
} from './entities/matchVideos'

export type {
  DBShotInference,
  NewShotInference,
  InferenceFieldName,
} from './entities/shotInferences'

// Export DB operations for entities without stores
export { matchDb } from './entities/matches'
export { setDb } from './entities/sets'
export { rallyDb } from './entities/rallies'
export { shotDb } from './entities/shots'
export { shotInferenceDb } from './entities/shotInferences'

// Export match helper functions
export { getCompleteMatchData, saveCompleteMatch } from './entities/matches'
export type { CompleteMatchData } from './entities/matches'

// Export services
export * from './services'

// Export database instance (for advanced use)
export { db } from './db'

// Export ID generation helpers
export {
  generateRallyId,
  generateShotId,
  generateMatchId,
  generateSetId,
  generatePlayerId,
  generateClubId,
  generateTournamentId,
  generateMatchVideoId,
  generateShotInferenceId,
  slugify,
} from '@/helpers/generateSlugId'

