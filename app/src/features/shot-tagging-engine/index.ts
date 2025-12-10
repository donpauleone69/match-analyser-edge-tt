/**
 * Shot Tagging Engine
 * 
 * Sequential question-based interface for shot tagging.
 * One question at a time with auto-advance flow.
 * 
 * Architecture:
 * - layouts/ - PhaseLayoutTemplate for consistent 4-section layout
 * - sections/ - Reusable UI regions (video, status, rally list, user input)
 * - blocks/ - Presentational components (rally cards, shot items, controls)
 * - composers/ - Phase orchestrators (Phase1, Phase2, Phase3+)
 */

export { TaggingUIComposer } from './composers/TaggingUIComposer'
export type { Phase1Rally } from './composers/Phase1TimestampComposer'

// Exports for building custom phases
export { PhaseLayoutTemplate, type PhaseLayoutTemplateProps } from './layouts'
export { 
  UserInputSection, 
  VideoPlayerSection, 
  StatusBarSection, 
  RallyListSection,
  type UserInputSectionProps,
  type VideoPlayerSectionProps,
  type StatusBarSectionProps,
  type RallyListSectionProps
} from './sections'
export { 
  RallyCard, 
  ShotListItem, 
  PlayerScoreDisplay,
  type RallyCardProps,
  type ShotListItemProps,
  type PlayerScoreDisplayProps
} from './blocks'
