/**
 * Test Fixtures - Sample data for validation and testing
 * 
 * Provides realistic match/set/rally data for testing validation logic.
 */

// import type { DBMatch, DBMatchVideo, DBSet, DBRally, DBShot } from '@/data'
import type { 
  MatchValidationInput, 
  SetValidationInput,
  RallySetValidationInput 
} from '@/rules/validate/validateMatchData'
import type { VideoSegment } from '@/rules/validate/validateVideoCoverage'

// =============================================================================
// VALID MATCH DATA
// =============================================================================

export const validMatch3To2: MatchValidationInput = {
  winnerId: 'player1',
  bestOf: 5,
  player1SetsWon: 3,
  player2SetsWon: 2,
  setScoreSummary: '3-2'
}

export const validMatch3To1: MatchValidationInput = {
  winnerId: 'player1',
  bestOf: 5,
  player1SetsWon: 3,
  player2SetsWon: 1,
  setScoreSummary: '3-1'
}

export const validMatchBestOf3: MatchValidationInput = {
  winnerId: 'player2',
  bestOf: 3,
  player1SetsWon: 1,
  player2SetsWon: 2,
  setScoreSummary: '1-2'
}

// =============================================================================
// INVALID MATCH DATA
// =============================================================================

export const invalidMatchWrongWinner: MatchValidationInput = {
  winnerId: 'player1',  // Wrong! Player 2 won more sets
  bestOf: 5,
  player1SetsWon: 2,
  player2SetsWon: 3,
  setScoreSummary: '2-3'
}

export const invalidMatchTooManySets: MatchValidationInput = {
  winnerId: 'player1',
  bestOf: 5,
  player1SetsWon: 4,  // Total = 6, exceeds best of 5
  player2SetsWon: 2,
  setScoreSummary: '4-2'
}

export const invalidMatchScoreMismatch: MatchValidationInput = {
  winnerId: 'player1',
  bestOf: 5,
  player1SetsWon: 3,
  player2SetsWon: 2,
  setScoreSummary: '3-1'  // Doesn't match 3-2
}

// =============================================================================
// VALID SET DATA
// =============================================================================

export const validSet11to9: SetValidationInput = {
  setNumber: 1,
  player1FinalScore: 11,
  player2FinalScore: 9,
  winnerId: 'player1'
}

export const validSetDeuce13to11: SetValidationInput = {
  setNumber: 2,
  player1FinalScore: 13,
  player2FinalScore: 11,
  winnerId: 'player1'
}

export const validSet11to7: SetValidationInput = {
  setNumber: 3,
  player1FinalScore: 11,
  player2FinalScore: 7,
  winnerId: 'player1'
}

// =============================================================================
// INVALID SET DATA
// =============================================================================

export const invalidSetWrongWinner: SetValidationInput = {
  setNumber: 1,
  player1FinalScore: 9,
  player2FinalScore: 11,
  winnerId: 'player1'  // Wrong! Player 2 scored more
}

export const invalidSetNotEnoughPoints: SetValidationInput = {
  setNumber: 1,
  player1FinalScore: 10,  // Didn't reach 11
  player2FinalScore: 9,
  winnerId: 'player1'
}

export const invalidSetNotEnoughLead: SetValidationInput = {
  setNumber: 1,
  player1FinalScore: 11,  // Only 1 point lead
  player2FinalScore: 10,
  winnerId: 'player1'
}

// =============================================================================
// VALID RALLY DATA
// =============================================================================

export const validRalliesSet11to9: RallySetValidationInput = {
  setNumber: 1,
  expectedPlayer1FinalScore: 11,
  expectedPlayer2FinalScore: 9,
  expectedWinnerId: 'player1',
  rallies: [
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 1, player2ScoreAfter: 0 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 1, player2ScoreAfter: 1 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 2, player2ScoreAfter: 1 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 3, player2ScoreAfter: 1 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 3, player2ScoreAfter: 2 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 4, player2ScoreAfter: 2 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 4, player2ScoreAfter: 3 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 5, player2ScoreAfter: 3 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 5, player2ScoreAfter: 4 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 6, player2ScoreAfter: 4 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 6, player2ScoreAfter: 5 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 7, player2ScoreAfter: 5 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 7, player2ScoreAfter: 6 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 8, player2ScoreAfter: 6 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 8, player2ScoreAfter: 7 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 9, player2ScoreAfter: 7 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 9, player2ScoreAfter: 8 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 10, player2ScoreAfter: 8 },
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 10, player2ScoreAfter: 9 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 11, player2ScoreAfter: 9 },
  ]
}

// =============================================================================
// INVALID RALLY DATA
// =============================================================================

export const invalidRalliesWrongFinalScore: RallySetValidationInput = {
  setNumber: 1,
  expectedPlayer1FinalScore: 11,
  expectedPlayer2FinalScore: 9,
  expectedWinnerId: 'player1',
  rallies: [
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 1, player2ScoreAfter: 0 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 2, player2ScoreAfter: 0 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 3, player2ScoreAfter: 0 },
    // ... but ends at 10-8 instead of 11-9
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 10, player2ScoreAfter: 8 },
  ]
}

export const invalidRalliesScoreJump: RallySetValidationInput = {
  setNumber: 1,
  expectedPlayer1FinalScore: 5,
  expectedPlayer2FinalScore: 3,
  expectedWinnerId: 'player1',
  rallies: [
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 1, player2ScoreAfter: 0 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 2, player2ScoreAfter: 0 },
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 4, player2ScoreAfter: 0 }, // Jump!
    { isScoring: true, winnerId: 'player2', player1ScoreAfter: 4, player2ScoreAfter: 3 }, // Jump!
    { isScoring: true, winnerId: 'player1', player1ScoreAfter: 5, player2ScoreAfter: 3 },
  ]
}

// =============================================================================
// VALID VIDEO SEGMENTS
// =============================================================================

export const validVideoSingleComplete: VideoSegment[] = [{
  videoId: 'video1',
  sequenceNumber: 1,
  startSetNumber: 1,
  startSetScore: '0-0',
  startPointsScore: '0-0',
  endSetNumber: 5,
  endSetScore: '3-2',
  endPointsScore: '11-9',
  coverageType: 'full'
}]

export const validVideoTwoSegments: VideoSegment[] = [
  {
    videoId: 'video1',
    sequenceNumber: 1,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '0-0',
    endSetNumber: 3,
    endSetScore: '1-2',
    endPointsScore: '11-8',
    coverageType: 'partial_end'
  },
  {
    videoId: 'video2',
    sequenceNumber: 2,
    startSetNumber: 4,
    startSetScore: '1-2',
    startPointsScore: '0-0',
    endSetNumber: 5,
    endSetScore: '3-2',
    endPointsScore: '11-9',
    coverageType: 'full'
  }
]

export const validVideoContinuousSameSet: VideoSegment[] = [
  {
    videoId: 'video1',
    sequenceNumber: 1,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '0-0',
    endSetNumber: 1,
    endSetScore: '0-0',
    endPointsScore: '5-5',
    coverageType: 'partial_end'
  },
  {
    videoId: 'video2',
    sequenceNumber: 2,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '5-5',  // Continues from previous
    endSetNumber: 1,
    endSetScore: '1-0',
    endPointsScore: '11-9',
    coverageType: 'partial_start'
  }
]

// =============================================================================
// INVALID VIDEO SEGMENTS
// =============================================================================

export const invalidVideoSequenceGap: VideoSegment[] = [
  {
    videoId: 'video1',
    sequenceNumber: 1,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '0-0',
    endSetNumber: 2,
    endSetScore: '1-1',
    endPointsScore: '11-9',
    coverageType: 'partial_end'
  },
  {
    videoId: 'video2',
    sequenceNumber: 3,  // GAP! Should be 2
    startSetNumber: 3,
    startSetScore: '1-1',
    startPointsScore: '0-0',
    endSetNumber: 5,
    endSetScore: '3-2',
    endPointsScore: '11-9',
    coverageType: 'full'
  }
]

export const invalidVideoOverlap: VideoSegment[] = [
  {
    videoId: 'video1',
    sequenceNumber: 1,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '0-0',
    endSetNumber: 3,  // Ends at set 3
    endSetScore: '2-1',
    endPointsScore: '11-8',
    coverageType: 'partial_end'
  },
  {
    videoId: 'video2',
    sequenceNumber: 2,
    startSetNumber: 2,  // OVERLAP! Starts before video1 ends
    startSetScore: '1-1',
    startPointsScore: '0-0',
    endSetNumber: 5,
    endSetScore: '3-2',
    endPointsScore: '11-9',
    coverageType: 'full'
  }
]

export const invalidVideoDiscontinuity: VideoSegment[] = [
  {
    videoId: 'video1',
    sequenceNumber: 1,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '0-0',
    endSetNumber: 1,
    endSetScore: '0-0',
    endPointsScore: '5-5',
    coverageType: 'partial_end'
  },
  {
    videoId: 'video2',
    sequenceNumber: 2,
    startSetNumber: 1,
    startSetScore: '0-0',
    startPointsScore: '8-7',  // DISCONTINUITY! Jumped from 5-5 to 8-7
    endSetNumber: 1,
    endSetScore: '1-0',
    endPointsScore: '11-9',
    coverageType: 'partial_start'
  }
]

// =============================================================================
// COMPLETE MATCH FIXTURES
// =============================================================================

export const completeValidMatch: {
  match: MatchValidationInput
  sets: (SetValidationInput & { rallies: RallySetValidationInput['rallies'] })[]
  videos: VideoSegment[]
} = {
  match: validMatch3To2,
  sets: [
    {
      ...validSet11to9,
      setNumber: 1,
      rallies: validRalliesSet11to9.rallies
    },
    {
      setNumber: 2,
      player1FinalScore: 9,
      player2FinalScore: 11,
      winnerId: 'player2',
      rallies: [] // Simplified for fixture
    },
    {
      setNumber: 3,
      player1FinalScore: 11,
      player2FinalScore: 7,
      winnerId: 'player1',
      rallies: []
    },
    {
      setNumber: 4,
      player1FinalScore: 8,
      player2FinalScore: 11,
      winnerId: 'player2',
      rallies: []
    },
    {
      setNumber: 5,
      player1FinalScore: 11,
      player2FinalScore: 9,
      winnerId: 'player1',
      rallies: []
    }
  ],
  videos: validVideoSingleComplete
}

