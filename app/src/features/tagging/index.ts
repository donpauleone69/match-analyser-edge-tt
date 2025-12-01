/**
 * Tagging Feature
 * 
 * Two-part tagging workflow:
 * - Part 1: Match Framework (contacts + rally boundaries)
 * - Part 2: Rally Detail (per-rally review + shot tagging)
 */

// Composers (route-level)
export { TaggingScreenComposer } from './composers'

// Sections (page regions)
export { MatchPanelSection, TaggingControlsSection } from './sections'

// Blocks (presentational)
export { ScoreDisplayBlock, RallyPodBlock, ContactButtonBlock } from './blocks'

// Derive hooks
export {
  useDeriveMatchPanel,
  useDerivePointDetailsTree,
  useDeriveVideoControls,
  useDeriveTimeline,
  useDeriveRallyDetail,
  useDeriveTaggingControls,
} from './derive'

// View models
export type {
  MatchPanelVM,
  RallyTreeNodeVM,
  GameNodeVM,
  PointDetailsTreeVM,
  VideoControlsVM,
  TimelineMarkerVM,
  TimelineVM,
  TaggingControlsVM,
  ShotVM,
  RallyDetailVM,
  MatchDetailsModalVM,
  EndOfPointModalVM,
  MatchCompletionModalVM,
} from './models'

