/**
 * TableTennisButtons — SVG button components for tagging interface
 * 
 * Extracted from tt-buttons-complete-v1.html design
 */

// Base component
export { TableTennisButtonBase, type TableTennisButtonBaseProps, type ButtonSize } from './TableTennisButtonBase'

// Phase 1 buttons (shot tagging)
export { ShotMissedButton, type ShotMissedButtonProps } from './ShotMissedButton'
export { InNetButton, type InNetButtonProps } from './InNetButton'
export { WinningShotButton, type WinningShotButtonProps } from './WinningShotButton'
export { ServeButton, type ServeButtonProps } from './ServeButton'
export { ShotButton, type ShotButtonProps } from './ShotButton'

// Direction buttons
export { LeftLeftButton, type LeftLeftButtonProps } from './LeftLeftButton'
export { LeftMidButton, type LeftMidButtonProps } from './LeftMidButton'
export { LeftRightButton, type LeftRightButtonProps } from './LeftRightButton'
export { MidLeftButton, type MidLeftButtonProps } from './MidLeftButton'
export { MidMidButton, type MidMidButtonProps } from './MidMidButton'
export { MidRightButton, type MidRightButtonProps } from './MidRightButton'
export { RightLeftButton, type RightLeftButtonProps } from './RightLeftButton'
export { RightMidButton, type RightMidButtonProps } from './RightMidButton'
export { RightRightButton, type RightRightButtonProps } from './RightRightButton'

// Serve depth buttons
export { ShortButton, type ShortButtonProps } from './ShortButton'
export { HalfLongButton, type HalfLongButtonProps } from './HalfLongButton'
export { DeepButton, type DeepButtonProps } from './DeepButton'

// Spin type buttons
export { UnderspinButton, type UnderspinButtonProps } from './UnderspinButton'
export { NoSpinButton, type NoSpinButtonProps } from './NoSpinButton'
export { TopspinButton, type TopspinButtonProps } from './TopspinButton'

// Shot type buttons
export { BackhandButton, type BackhandButtonProps } from './BackhandButton'
export { ForehandButton, type ForehandButtonProps } from './ForehandButton'

// Shot intent buttons
export { DefensiveButton, type DefensiveButtonProps } from './DefensiveButton'
export { NeutralButton, type NeutralButtonProps } from './NeutralButton'
export { AggressiveButton, type AggressiveButtonProps } from './AggressiveButton'

// Shot quality buttons
export { AverageQualityButton, type AverageQualityButtonProps } from './AverageQualityButton'
export { HighQualityButton, type HighQualityButtonProps } from './HighQualityButton'

// Error type buttons
export { ForcedErrorButton, type ForcedErrorButtonProps } from './ForcedErrorButton'
export { UnforcedErrorButton, type UnforcedErrorButtonProps } from './UnforcedErrorButton'

