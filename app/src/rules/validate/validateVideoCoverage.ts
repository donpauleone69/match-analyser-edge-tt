/**
 * Edge TT Match Analyser — Video Coverage Validation
 * 
 * Pure functions to validate multi-video segment coverage and continuity.
 * Ensures no gaps, overlaps, or discontinuities across video segments.
 * 
 * No React, no IO — deterministic validation only.
 */

import type { ValidationError } from './validateMatchData'
// MatchCoverageType removed - not part of new data schema

// =============================================================================
// VIDEO SEGMENT TYPES
// =============================================================================

export interface VideoSegment {
  videoId: string
  sequenceNumber: number
  startSetNumber: number
  startSetScore: string        // "0-0", "1-1", "2-1"
  startPointsScore: string     // "0-0", "5-3", "10-10"
  endSetNumber: number | null
  endSetScore: string | null
  endPointsScore: string | null
  coverageType: MatchCoverageType
}

// =============================================================================
// VIDEO SEQUENCE VALIDATION
// =============================================================================

/**
 * Validate video sequence numbers are continuous (no gaps)
 */
export function validateVideoSequence(videos: VideoSegment[]): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (videos.length === 0) {
    return errors
  }
  
  const sorted = [...videos].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  
  // Check sequence starts at 1
  if (sorted[0].sequenceNumber !== 1) {
    errors.push({
      field: 'video_sequence',
      message: `Video sequence should start at 1, but starts at ${sorted[0].sequenceNumber}`,
      severity: 'error'
    })
  }
  
  // Check for gaps in sequence
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sequenceNumber !== i + 1) {
      errors.push({
        field: 'video_sequence',
        message: `Video sequence gap: expected ${i + 1}, found ${sorted[i].sequenceNumber}`,
        severity: 'error'
      })
    }
  }
  
  return errors
}

// =============================================================================
// VIDEO OVERLAP VALIDATION
// =============================================================================

/**
 * Validate videos don't overlap (each segment is distinct)
 */
export function validateVideoOverlap(videos: VideoSegment[]): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (videos.length <= 1) {
    return errors
  }
  
  const sorted = [...videos].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    
    if (!current.endSetNumber || !next.startSetNumber) {
      // Can't validate without end/start info
      continue
    }
    
    // Check set-level overlap
    if (current.endSetNumber > next.startSetNumber) {
      errors.push({
        field: `video_${current.sequenceNumber}_overlap`,
        message: `Video ${current.sequenceNumber} ends at set ${current.endSetNumber}, but video ${next.sequenceNumber} starts at set ${next.startSetNumber}`,
        severity: 'error'
      })
    }
  }
  
  return errors
}

// =============================================================================
// VIDEO CONTINUITY VALIDATION
// =============================================================================

/**
 * Parse score string "X-Y" to object { player1: X, player2: Y }
 */
function parseScore(scoreStr: string): { player1: number, player2: number } | null {
  const parts = scoreStr.split('-')
  if (parts.length !== 2) return null
  
  const player1 = parseInt(parts[0].trim(), 10)
  const player2 = parseInt(parts[1].trim(), 10)
  
  if (isNaN(player1) || isNaN(player2)) return null
  
  return { player1, player2 }
}

/**
 * Validate score continuity between adjacent video segments
 */
export function validateVideoContinuity(videos: VideoSegment[]): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (videos.length <= 1) {
    return errors
  }
  
  const sorted = [...videos].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    
    // Check if videos are adjacent (same set or consecutive sets)
    if (!current.endSetNumber || !next.startSetNumber) {
      continue
    }
    
    const isAdjacentSameSet = current.endSetNumber === next.startSetNumber
    const isAdjacentNextSet = current.endSetNumber + 1 === next.startSetNumber
    
    if (!isAdjacentSameSet && !isAdjacentNextSet) {
      // Gap in coverage
      errors.push({
        field: `video_coverage_gap`,
        message: `Coverage gap between video ${current.sequenceNumber} (ends set ${current.endSetNumber}) and video ${next.sequenceNumber} (starts set ${next.startSetNumber})`,
        severity: 'warning'
      })
      continue
    }
    
    // Check point-level continuity within same set
    if (isAdjacentSameSet && current.endPointsScore && next.startPointsScore) {
      const currentEnd = parseScore(current.endPointsScore)
      const nextStart = parseScore(next.startPointsScore)
      
      if (currentEnd && nextStart) {
        if (currentEnd.player1 !== nextStart.player1 || currentEnd.player2 !== nextStart.player2) {
          errors.push({
            field: `video_${current.sequenceNumber}_continuity`,
            message: `Video ${current.sequenceNumber} ends at ${current.endPointsScore}, but video ${next.sequenceNumber} starts at ${next.startPointsScore} (gap in coverage)`,
            severity: 'warning'
          })
        }
      }
    }
    
    // Check set score continuity
    if (isAdjacentNextSet && current.endSetScore && next.startSetScore) {
      const currentEnd = parseScore(current.endSetScore)
      const nextStart = parseScore(next.startSetScore)
      
      if (currentEnd && nextStart) {
        // Set score should increment by 1 for one player
        const setScoreDiff = Math.abs(
          (nextStart.player1 - currentEnd.player1) + (nextStart.player2 - currentEnd.player2)
        )
        
        if (setScoreDiff !== 1) {
          errors.push({
            field: `video_${current.sequenceNumber}_set_continuity`,
            message: `Set score discontinuity: video ${current.sequenceNumber} ends ${current.endSetScore}, video ${next.sequenceNumber} starts ${next.startSetScore}`,
            severity: 'warning'
          })
        }
      }
    }
  }
  
  return errors
}

// =============================================================================
// SET COVERAGE VALIDATION
// =============================================================================

export interface SetCoverageInput {
  videos: VideoSegment[]
  expectedSetNumbers: number[]  // Which sets exist in the match
}

/**
 * Validate that all expected sets have some video coverage (or are explicitly marked as no video)
 */
export function validateSetCoverage(input: SetCoverageInput): ValidationError[] {
  const { videos, expectedSetNumbers } = input
  const errors: ValidationError[] = []
  
  // Build set of covered sets
  const coveredSets = new Set<number>()
  videos.forEach(v => {
    for (let set = v.startSetNumber; set <= (v.endSetNumber || v.startSetNumber); set++) {
      coveredSets.add(set)
    }
  })
  
  // Check each expected set
  expectedSetNumbers.forEach(setNum => {
    if (!coveredSets.has(setNum)) {
      errors.push({
        field: `set_${setNum}_coverage`,
        message: `Set ${setNum} has no video coverage`,
        severity: 'warning'
      })
    }
  })
  
  return errors
}

// =============================================================================
// COMPLETE VIDEO VALIDATION
// =============================================================================

export interface CompleteVideoCoverageValidation {
  sequenceErrors: ValidationError[]
  overlapErrors: ValidationError[]
  continuityErrors: ValidationError[]
  coverageErrors: ValidationError[]
  isValid: boolean
  allErrors: ValidationError[]
}

/**
 * Run complete video coverage validation
 */
export function validateCompleteVideoCoverage(
  videos: VideoSegment[],
  expectedSetNumbers: number[]
): CompleteVideoCoverageValidation {
  const sequenceErrors = validateVideoSequence(videos)
  const overlapErrors = validateVideoOverlap(videos)
  const continuityErrors = validateVideoContinuity(videos)
  const coverageErrors = validateSetCoverage({ videos, expectedSetNumbers })
  
  const allErrors = [
    ...sequenceErrors,
    ...overlapErrors,
    ...continuityErrors,
    ...coverageErrors
  ]
  
  // Only errors (not warnings) make validation fail
  const isValid = allErrors.filter(e => e.severity === 'error').length === 0
  
  return {
    sequenceErrors,
    overlapErrors,
    continuityErrors,
    coverageErrors,
    isValid,
    allErrors
  }
}

// =============================================================================
// VIDEO COVERAGE SUMMARY
// =============================================================================

export interface VideoCoverageSummary {
  totalVideos: number
  coveredSets: number[]
  hasGaps: boolean
  totalCoverage: 'full' | 'partial'
  firstSetCovered: number
  lastSetCovered: number
}

/**
 * Get summary of video coverage across the match
 */
export function getVideoCoverageSummary(videos: VideoSegment[]): VideoCoverageSummary {
  if (videos.length === 0) {
    return {
      totalVideos: 0,
      coveredSets: [],
      hasGaps: false,
      totalCoverage: 'partial',
      firstSetCovered: 0,
      lastSetCovered: 0
    }
  }
  
  // Collect all covered sets
  const coveredSets = new Set<number>()
  videos.forEach(v => {
    for (let set = v.startSetNumber; set <= (v.endSetNumber || v.startSetNumber); set++) {
      coveredSets.add(set)
    }
  })
  
  const sortedSets = Array.from(coveredSets).sort((a, b) => a - b)
  
  // Check for gaps
  let hasGaps = false
  for (let i = 0; i < sortedSets.length - 1; i++) {
    if (sortedSets[i + 1] - sortedSets[i] > 1) {
      hasGaps = true
      break
    }
  }
  
  // Check continuity errors
  const continuityErrors = validateVideoContinuity(videos)
  const hasDiscontinuities = continuityErrors.length > 0
  
  return {
    totalVideos: videos.length,
    coveredSets: sortedSets,
    hasGaps: hasGaps || hasDiscontinuities,
    totalCoverage: (hasGaps || hasDiscontinuities) ? 'partial' : 'full',
    firstSetCovered: sortedSets[0] || 0,
    lastSetCovered: sortedSets[sortedSets.length - 1] || 0
  }
}

