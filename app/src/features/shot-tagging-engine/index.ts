/**
 * Shot Tagging Engine — Pass 1 Focus (default) and Rally Focus (test).
 */

export { TaggingUIComposer } from './composers/TaggingUIComposer'
export { Pass1FocusComposer } from './composers/Pass1FocusComposer'
export { RallyFocusComposer } from './composers/RallyFocusComposer'
export { RallyEditComposer, type RallyEditNotice } from './composers/RallyEditComposer'
export {
  setPersistedRallyHighlight,
  updatePersistedPass1FocusRally,
} from './composers/persistPass1FocusRally'

export {
  VideoPlayerSection,
  type VideoPlayerSectionProps,
} from './sections'
export {
  RallyCard,
  ShotListItem,
  PlayerScoreDisplay,
  type RallyCardProps,
  type ShotListItemProps,
  type PlayerScoreDisplayProps,
} from './blocks'
