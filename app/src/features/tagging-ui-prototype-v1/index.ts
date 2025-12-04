/**
 * Tagging UI Prototype Feature
 * 
 * Experimental two-phase tagging interface:
 * - Phase 1: Fast timestamp capture (SERVE/SHOT + rally end conditions)
 * - Phase 2: Detailed shot annotation with auto-advancing screens
 */

export { TaggingUIPrototypeComposer } from './composers/TaggingUIPrototypeComposer'
export { Phase1TimestampComposer, type Phase1Shot, type Phase1Rally } from './composers/Phase1TimestampComposer'
export { Phase2DetailComposer } from './composers/Phase2DetailComposer'

export {
  // Shared blocks
  IntentTabBlock,
  WingToggleBlock,
  DirectionButtonBlock,
  // Phase 1 blocks
  Phase1ServeButtonBlock,
  Phase1EndConditionGrid,
  // Phase 2 blocks
  ServeDetailBlock,
  ProgressIndicatorBlock,
  // Types
  type Intent,
  type Wing,
  type Direction,
  type RallyState,
  type EndCondition,
  type ServeDetailData,
} from './blocks'
