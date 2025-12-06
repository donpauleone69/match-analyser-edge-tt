/**
 * Inference Functions (Level 1+ - Probabilistic)
 * 
 * Functions that infer attributes with varying levels of confidence.
 * Unlike derivations, these involve uncertainty and include confidence scores.
 * 
 * Organized by scope:
 * - shot-level/      - Infer shot attributes (persisted to DB with confidence)
 * - rally-patterns/  - Infer tactical patterns (computed on-demand for stats)
 */

export * from './shot-level'
export * from './rally-patterns'

