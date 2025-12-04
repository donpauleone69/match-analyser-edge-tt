/**
 * Tagging UI Prototype Blocks
 */

// Shared blocks (used across phases)
export { IntentTabBlock, type IntentTabBlockProps, type Intent } from './IntentTabBlock'
export { WingToggleBlock, type WingToggleBlockProps, type Wing } from './WingToggleBlock'
export { DirectionButtonBlock, type DirectionButtonBlockProps, type Direction } from './DirectionButtonBlock'

// Phase 1 blocks
export { Phase1ServeButtonBlock, type Phase1ServeButtonBlockProps } from './Phase1ServeButtonBlock'
export { Phase1EndConditionGrid, type Phase1EndConditionGridProps, type RallyState, type EndCondition } from './Phase1EndConditionGrid'
// Legacy: export { Phase1EndConditionStack, type Phase1EndConditionStackProps } from './Phase1EndConditionStack'

// Phase 2 blocks
export { ServeDetailBlock, type ServeDetailBlockProps, type ServeDetailData, type ServeContact, type ServeDirection, type ServeLength, type ServeSpin } from './ServeDetailBlock'
export { ProgressIndicatorBlock, type ProgressIndicatorBlockProps } from './ProgressIndicatorBlock'

// Legacy (no longer in use, kept for reference)
export { QualityButtonBlock, type QualityButtonBlockProps, type Quality } from './QualityButtonBlock'
