/**
 * MatchVideos Entity - Public API
 */

export type { DBMatchVideo, NewMatchVideo, MatchCoverageType } from './matchVideo.types'
export {
  getMatchVideos,
  getMatchVideoById,
  getMatchVideosByMatch,
  createMatchVideo,
  updateMatchVideo,
  deleteMatchVideo,
} from './matchVideo.db'
