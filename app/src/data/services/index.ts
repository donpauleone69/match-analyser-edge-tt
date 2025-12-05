/**
 * Data Services - Utility services for cross-entity operations
 */

export * from './validation'

// Re-export db for easy access
export { db } from '../db'

// Re-export all entity stores
export { useClubStore } from '../entities/clubs'
export { useTournamentStore } from '../entities/tournaments'
export { usePlayerStore } from '../entities/players'
export { useMatchStore } from '../entities/matches'
export { setDb } from '../entities/sets'
export { rallyDb } from '../entities/rallies'
export { shotDb } from '../entities/shots'

