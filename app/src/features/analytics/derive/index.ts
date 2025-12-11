/**
 * Analytics Derive Hooks
 * 
 * Hooks that transform raw data into view models for analytics cards.
 * Use hybrid data access pattern:
 * - usePlayerStore/useMatchStore for reference data
 * - Direct DB calls (shotDb, rallyDb) for analytics queries
 */

export { useDeriveServePerformance } from './useDeriveServePerformance'
export { useDeriveReceivePerformance } from './useDeriveReceivePerformance'
export { useDeriveThirdBallEffectiveness } from './useDeriveThirdBallEffectiveness'
export { useDeriveRallyStats } from './useDeriveRallyStats'
export { useDeriveErrorProfile } from './useDeriveErrorProfile'

