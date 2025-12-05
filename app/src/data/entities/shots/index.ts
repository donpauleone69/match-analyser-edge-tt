/**
 * Shot Entity - Public API
 * 
 * Note: Shots don't have a store layer (yet) - accessed via DB layer directly
 * This is because shots are typically managed through rally/tagging contexts
 */

export * from './shot.types'
export * as shotDb from './shot.db'

