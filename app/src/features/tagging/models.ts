/**
 * Tagging Feature — View Models
 * 
 * Types for UI state derived from domain data.
 * These are NOT domain types — they're shaped for rendering.
 */

import type { 
  PlayerId, 
  TaggingMode,
  PointEndType,
  ShotQuality,
  Contact,
} from '@/rules/types'

// =============================================================================
// MATCH PANEL VIEW MODELS
// =============================================================================

export interface MatchPanelVM {
  player1Name: string
  player2Name: string
  matchDate: string | null
  currentSetScore: string // e.g. "2-1"
  currentPointsScore: string // e.g. "7-4"
  currentServerId: PlayerId
  taggingMode: TaggingMode
}

export interface RallyTreeNodeVM {
  id: string
  rallyIndex: number
  isScoring: boolean
  winnerId?: PlayerId
  serverId: PlayerId
  scoreAfter: string // e.g. "3-2"
  shotCount: number
  isExpanded: boolean
  isCurrentReview: boolean
  isHighlight: boolean
  hasError: boolean // Server mismatch, missing winner, etc.
  // Part 2 - expanded view
  contacts?: Contact[]
  endOfPointTime?: number
}

export interface GameNodeVM {
  gameNumber: number
  player1Score: number
  player2Score: number
  winnerId?: string
  rallies: RallyTreeNodeVM[]
  isExpanded: boolean
}

export interface PointDetailsTreeVM {
  games: GameNodeVM[]
  totalRallies: number
  ralliesWithErrors: number
}

// =============================================================================
// VIDEO PANEL VIEW MODELS
// =============================================================================

export interface VideoControlsVM {
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackSpeed: number
  formattedTime: string // e.g. "1:23.4"
  formattedDuration: string
  progress: number // 0-100
}

export interface TimelineMarkerVM {
  id: string
  time: number
  position: number // 0-100 (percentage)
  type: 'contact' | 'rally-end' | 'end-of-set'
  isInCurrentRally: boolean
}

export interface TimelineVM {
  markers: TimelineMarkerVM[]
  previewStart?: number // For loop preview
  previewEnd?: number
}

// =============================================================================
// TAGGING CONTROLS VIEW MODELS
// =============================================================================

export interface TaggingControlsVM {
  canAddContact: boolean
  canEndRally: boolean
  canUndo: boolean
  currentRallyContactCount: number
  isInRally: boolean
}

// =============================================================================
// RALLY DETAIL VIEW MODELS (Part 2)
// =============================================================================

export interface ShotVM {
  id: string
  shotIndex: number
  time: number
  formattedTime: string
  isServe: boolean
  isReturn: boolean
  playerId: PlayerId
  playerName: string
  // Tagging status
  isTagged: boolean
  quality?: ShotQuality
  needsTagging: boolean
}

export interface RallyDetailVM {
  id: string
  rallyIndex: number
  serverId: PlayerId
  serverName: string
  receiverId: PlayerId
  receiverName: string
  shots: ShotVM[]
  isScoring: boolean
  winnerId?: PlayerId
  winnerName?: string
  pointEndType?: PointEndType
  // Navigation
  canGoNext: boolean
  canGoPrev: boolean
  // Progress
  shotsTagged: number
  totalShots: number
  isComplete: boolean
}

// =============================================================================
// MODAL VIEW MODELS
// =============================================================================

export interface MatchDetailsModalVM {
  isOpen: boolean
  player1Name: string
  player2Name: string
  matchDate: string
  videoStartSetScore: string
  videoStartPointsScore: string
  taggingMode: TaggingMode
}

export interface EndOfPointModalVM {
  isOpen: boolean
  winnerId: PlayerId
  winnerName: string
  needsForcedUnforced: boolean
  derivationNote: string
}

export interface MatchCompletionModalVM {
  isOpen: boolean
  matchResult: 'player1' | 'player2' | 'incomplete' | null
  finalSetScore: string
  finalPointsScore: string
}

