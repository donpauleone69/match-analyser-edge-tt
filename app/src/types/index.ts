// Player types
export interface Player {
  id: string
  name: string
  rating?: number
}

// Match types
export interface Match {
  id: string
  player1: Player
  player2: Player
  firstServerId: string
  matchDate: string
  videoSource?: string
  hasVideo: boolean
  step1Complete: boolean
  step2Complete: boolean
}

// Game types
export interface Game {
  id: string
  matchId: string
  gameNumber: number
  player1FinalScore: number
  player2FinalScore: number
  winnerId?: string
  hasVideo: boolean
}

// Rally types
export interface Rally {
  id: string
  gameId: string
  rallyIndex: number
  isScoring: boolean
  winnerId?: 'player1' | 'player2'
  endOfPointTime?: number // Timestamp when rally ended (movable in review)
  player1ScoreAfter: number
  player2ScoreAfter: number
  serverId: 'player1' | 'player2'
  receiverId: 'player1' | 'player2'
  hasVideoData: boolean
  contacts: Contact[]
  isHighlight?: boolean // Mark as highlight for export filtering
}

// Contact types (Step 1 tagging)
export interface Contact {
  id: string
  rallyId: string
  time: number // seconds in video
  shotIndex: number
}

// Timeline marker types
export type MarkerType = 'contact' | 'rally-end-score' | 'rally-end-no-score'

export interface TimelineMarker {
  id: string
  time: number
  type: MarkerType
  rallyId?: string
}

// Tagging session state
export interface TaggingSession {
  matchId: string
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  contacts: Contact[]
  rallies: Rally[]
  currentRallyContacts: Contact[] // Contacts in the current (open) rally
  player1Score: number
  player2Score: number
  currentServerId: string
}

