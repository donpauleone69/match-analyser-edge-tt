import { buildSeed, hasTaggedRallies } from './app'
import { NOW } from './clock'

/** One seed for the whole file. Dates are days before this instant, in UTC. */
export const TODAY = NOW
export const SEED = buildSeed(TODAY)
export const TAGGED = SEED.filter(hasTaggedRallies)
