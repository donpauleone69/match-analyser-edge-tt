/**
 * Set Entity - Public API
 * 
 * Note: Sets don't have a store layer (yet) - accessed via DB layer directly
 * This is because sets are typically managed through match/tagging contexts
 */

export * from './set.types'
export * as setDb from './set.db'

