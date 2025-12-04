/**
 * deriveVideoControls — View model derivation for Video Controls
 */

import { useMemo } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import type { VideoControlsVM, TimelineVM, TimelineMarkerVM } from '../models'

/**
 * Format time as MM:SS.d
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const formatted = secs.toFixed(1)
  return `${mins}:${formatted.padStart(4, '0')}`
}

/**
 * Derive video controls view model.
 */
export function useDeriveVideoControls(): VideoControlsVM {
  const {
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
  } = useTaggingStore()
  
  return useMemo(() => ({
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
    formattedTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    progress: duration > 0 ? (currentTime / duration) * 100 : 0,
  }), [currentTime, duration, isPlaying, playbackSpeed])
}

/**
 * Derive timeline view model with markers.
 */
export function useDeriveTimeline(): TimelineVM {
  const {
    shots,
    rallies,
    currentRallyShots,
    duration,
    currentReviewRallyIndex,
    sets,
  } = useTaggingStore()
  
  return useMemo(() => {
    if (duration === 0) {
      return { markers: [] }
    }
    
    const markers: TimelineMarkerVM[] = []
    const currentRallyId = rallies[currentReviewRallyIndex]?.id
    
    // Add shot markers from completed rallies
    rallies.forEach(rally => {
      rally.shots.forEach(shot => {
        markers.push({
          id: shot.id,
          time: shot.time,
          position: (shot.time / duration) * 100,
          type: 'shot',
          isInCurrentRally: rally.id === currentRallyId,
        })
      })
      
      // Add rally end marker
      const lastContact = rally.shots[rally.shots.length - 1]
      if (lastContact) {
        markers.push({
          id: `rally-end-${rally.id}`,
          time: rally.endOfPointTime || lastContact.time,
          position: ((rally.endOfPointTime || lastContact.time) / duration) * 100,
          type: 'rally-end',
          isInCurrentRally: rally.id === currentRallyId,
        })
      }
    })
    
    // Add current rally shots (not yet committed)
    currentRallyShots.forEach(shot => {
      markers.push({
        id: shot.id,
        time: shot.time,
        position: (shot.time / duration) * 100,
        type: 'shot',
        isInCurrentRally: true,
      })
    })
    
    // Add end-of-set markers
    sets.forEach(game => {
      if (game.endOfSetTimestamp) {
        markers.push({
          id: `end-of-set-${game.setNumber}`,
          time: game.endOfSetTimestamp,
          position: (game.endOfSetTimestamp / duration) * 100,
          type: 'end-of-set',
          isInCurrentRally: false,
        })
      }
    })
    
    return {
      markers: markers.sort((a, b) => a.time - b.time),
    }
  }, [shots, rallies, currentRallyShots, duration, currentReviewRallyIndex, sets])
}

