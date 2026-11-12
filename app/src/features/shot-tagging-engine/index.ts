/**
 * Shot Tagging Engine — Pass 1 Focus (default) and Rally Focus (test).
 */

export { TaggingUIComposer } from './composers/TaggingUIComposer'
export { Pass1FocusComposer } from './composers/Pass1FocusComposer'
export { RallyFocusComposer } from './composers/RallyFocusComposer'

export { PhaseLayoutTemplate, type PhaseLayoutTemplateProps } from './layouts'
export {
  UserInputSection,
  VideoPlayerSection,
  StatusBarSection,
  RallyListSection,
  type UserInputSectionProps,
  type VideoPlayerSectionProps,
  type StatusBarSectionProps,
  type RallyListSectionProps,
} from './sections'
export {
  RallyCard,
  ShotListItem,
  PlayerScoreDisplay,
  type RallyCardProps,
  type ShotListItemProps,
  type PlayerScoreDisplayProps,
} from './blocks'
