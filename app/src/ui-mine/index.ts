/**
 * ui-mine — Shared UI Kit
 * 
 * Features import from here, NEVER from @/components/ui directly.
 * This layer wraps shadcn primitives with project theming.
 */

// Base components
export { Button, type ButtonProps } from './Button'
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  type CardProps,
} from './Card'
export { Badge, type BadgeProps, badgeVariants } from './Badge'

// Icon system
export { Icon, icons, type IconName, type IconProps } from './Icon'

// Browse / playlist disclosure (Clips, Serve/Receive, Track C shell)
export {
  BrowseDisclosure,
  BrowseDisclosureOption,
  type BrowseDisclosureProps,
  type BrowseDisclosureOptionProps,
} from './BrowseDisclosure'

// Grid components
export { SpinGrid, SPIN_LABELS, SPIN_SHORT_LABELS, type SpinGridProps } from './SpinGrid'
export { LandingZoneGrid, ZONE_LABELS, ZONE_SHORT_LABELS, type LandingZoneGridProps } from './LandingZoneGrid'
export { PositionGrid, POSITION_LABELS, POSITION_SHORT_LABELS, type PositionGridProps } from './PositionGrid'

// Video components
export {
  VideoPlayer,
  TransportCluster,
  VideoStageChrome,
  MatchScoreHud,
  parseScorePair,
  shortPlayerName,
  MatchVideoOverlayBar,
  MatchVideoOverlayIconButton,
  MATCH_VIDEO_OVERLAY_BOTTOM_CLASS,
  MATCH_VIDEO_OVERLAY_CHIP_CLASS,
  MATCH_PLAYBACK_SPEED_STEPS,
  DEFAULT_PLAYBACK_SPEED,
  SEEK_STEP_SECONDS,
  formatPlaybackSpeed,
  nudgePlaybackSpeed,
  canNudgePlaybackSpeed,
  useVideoPlaybackStore,
  useTaggingMuteDefault,
  useWatchUnmuteDefault,
} from './VideoPlayer'
export type {
  VideoPlayerHandle,
  ConstrainedPlayback,
  VideoProgressMarker,
  VideoProgressViewWindow,
  TransportClusterProps,
  TransportVariant,
  VideoStageChromeProps,
  MatchScoreHudProps,
  MatchScoreSide,
  MatchVideoOverlayBarProps,
  MatchVideoOverlayIconButtonProps,
} from './VideoPlayer'

// Table Tennis Buttons (for shot-tagging-engine)
export * from './TableTennisButtons'

// Form components
export * from './Dialog'
export * from './Input'
export * from './Label'
export * from './Table'

