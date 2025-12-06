/**
 * Derivation Functions (Level 0 - Deterministic)
 * 
 * Pure functions that derive database fields from input data with 100% certainty.
 * These are NOT probabilistic inferences - they are deterministic transformations.
 * 
 * Organized by data level:
 * - shot/    - Derive shot table fields
 * - rally/   - Derive rally table fields
 * - set/     - Derive set table fields
 * - match/   - Derive match table fields
 */

export * from './shot'
export * from './rally'
export * from './set'
export * from './match'

