/**
 * Match Video Service - CRUD operations for match video segments
 * 
 * Supports multiple video segments per match for comprehensive coverage
 */

import { db } from '../db'
import type { DBMatchVideo, NewMatchVideo } from '../types'
import { generateId } from '@/helpers/generateId'

// =============================================================================
// MATCH VIDEO CRUD
// =============================================================================

/**
 * Get all video segments for a match, sorted by sequence number
 */
export async function getMatchVideos(matchId: string): Promise<DBMatchVideo[]> {
  const allVideos = await db.match_videos?.toArray() || []
  return allVideos
    .filter(v => v.match_id === matchId)
    .sort((a, b) => a.sequence_number - b.sequence_number)
}

/**
 * Get video segment by ID
 */
export async function getMatchVideoById(id: string): Promise<DBMatchVideo | undefined> {
  return await db.match_videos?.get(id)
}

/**
 * Get video by sequence number for a match
 */
export async function getMatchVideoBySequence(
  matchId: string, 
  sequenceNumber: number
): Promise<DBMatchVideo | undefined> {
  const videos = await getMatchVideos(matchId)
  return videos.find(v => v.sequence_number === sequenceNumber)
}

/**
 * Create a new match video segment
 */
export async function createMatchVideo(data: NewMatchVideo): Promise<DBMatchVideo> {
  const id = generateId()
  const matchVideo: DBMatchVideo = {
    ...data,
    id,
    created_at: new Date().toISOString()
  }
  
  await db.match_videos?.add(matchVideo)
  return matchVideo
}

/**
 * Update match video
 */
export async function updateMatchVideo(
  id: string, 
  updates: Partial<Omit<DBMatchVideo, 'id' | 'match_id' | 'created_at'>>
): Promise<DBMatchVideo | undefined> {
  await db.match_videos?.update(id, updates)
  return await getMatchVideoById(id)
}

/**
 * Delete match video
 */
export async function deleteMatchVideo(id: string): Promise<void> {
  // Also delete associated rallies and shots?
  // For now, just delete the video record
  await db.match_videos?.delete(id)
}

/**
 * Delete all videos for a match
 */
export async function deleteMatchVideos(matchId: string): Promise<void> {
  const videos = await getMatchVideos(matchId)
  await Promise.all(videos.map(v => deleteMatchVideo(v.id)))
}

/**
 * Get video coverage summary for a match
 */
export async function getVideoCoverageSummary(matchId: string): Promise<{
  videoCount: number
  hasGaps: boolean
  coveredSets: number[]
  totalCoverage: 'full' | 'partial'
}> {
  const videos = await getMatchVideos(matchId)
  
  if (videos.length === 0) {
    return {
      videoCount: 0,
      hasGaps: false,
      coveredSets: [],
      totalCoverage: 'partial'
    }
  }
  
  // Collect all covered sets
  const coveredSets = new Set<number>()
  videos.forEach(v => {
    for (let set = v.start_set_number; set <= (v.end_set_number || v.start_set_number); set++) {
      coveredSets.add(set)
    }
  })
  
  // Check for gaps in video coverage
  const sortedSets = Array.from(coveredSets).sort((a, b) => a - b)
  let hasGaps = false
  for (let i = 0; i < sortedSets.length - 1; i++) {
    if (sortedSets[i + 1] - sortedSets[i] > 1) {
      hasGaps = true
      break
    }
  }
  
  return {
    videoCount: videos.length,
    hasGaps,
    coveredSets: sortedSets,
    totalCoverage: hasGaps ? 'partial' : 'full'
  }
}

/**
 * Validate video sequence (no gaps, no overlaps)
 */
export async function validateVideoSequence(matchId: string): Promise<{
  isValid: boolean
  errors: string[]
}> {
  const videos = await getMatchVideos(matchId)
  const errors: string[] = []
  
  if (videos.length === 0) {
    return { isValid: true, errors: [] }
  }
  
  // Check sequence numbers are continuous
  for (let i = 0; i < videos.length; i++) {
    if (videos[i].sequence_number !== i + 1) {
      errors.push(`Video sequence gap: expected ${i + 1}, found ${videos[i].sequence_number}`)
    }
  }
  
  // Check for overlaps
  for (let i = 0; i < videos.length - 1; i++) {
    const current = videos[i]
    const next = videos[i + 1]
    
    if (current.end_set_number && next.start_set_number) {
      if (current.end_set_number > next.start_set_number) {
        errors.push(
          `Video ${current.sequence_number} ends at set ${current.end_set_number}, ` +
          `but video ${next.sequence_number} starts at set ${next.start_set_number}`
        )
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

