/**
 * deriveRallyDetail — View model derivation for Rally Detail (Part 2)
 */

import { useMemo } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import type { RallyDetailVM, ShotVM, TaggingControlsVM } from '../models'
import type { PlayerId } from '@/rules/types'

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
 * Derive the current rally detail view model.
 */
export function useDeriveRallyDetail(): RallyDetailVM | null {
  const {
    rallies,
    currentReviewRallyIndex,
    player1Name,
    player2Name,
  } = useTaggingStore()
  
  return useMemo(() => {
    const rally = rallies[currentReviewRallyIndex]
    if (!rally) return null
    
    const serverName = rally.serverId === 'player1' ? player1Name : player2Name
    const receiverName = rally.receiverId === 'player1' ? player1Name : player2Name
    const winnerName = rally.winnerId 
      ? (rally.winnerId === 'player1' ? player1Name : player2Name)
      : undefined
    
    // Build shots from contacts
    const shots: ShotVM[] = rally.contacts.map((contact, index) => {
      const isServe = index === 0
      const isReturn = index === 1
      
      // Determine who hit this shot
      // Odd index = server, Even index = receiver (0-indexed, so serve is 0 = server)
      const playerId: PlayerId = index % 2 === 0 ? rally.serverId : rally.receiverId
      const playerName = playerId === 'player1' ? player1Name : player2Name
      
      return {
        id: contact.id,
        shotIndex: contact.shotIndex,
        time: contact.time,
        formattedTime: formatTime(contact.time),
        isServe,
        isReturn,
        playerId,
        playerName,
        // TODO: Pull from shots table when implemented
        isTagged: false,
        quality: undefined,
        needsTagging: true,
      }
    })
    
    return {
      id: rally.id,
      rallyIndex: rally.rallyIndex,
      serverId: rally.serverId,
      serverName,
      receiverId: rally.receiverId,
      receiverName,
      shots,
      isScoring: rally.isScoring,
      winnerId: rally.winnerId,
      winnerName,
      pointEndType: rally.pointEndType,
      canGoNext: currentReviewRallyIndex < rallies.length - 1,
      canGoPrev: currentReviewRallyIndex > 0,
      shotsTagged: shots.filter(s => s.isTagged).length,
      totalShots: shots.length,
      isComplete: shots.every(s => s.isTagged),
    }
  }, [rallies, currentReviewRallyIndex, player1Name, player2Name])
}

/**
 * Derive tagging controls state.
 */
export function useDeriveTaggingControls(): TaggingControlsVM {
  const {
    currentRallyContacts,
    isPlaying,
    videoUrl,
  } = useTaggingStore()
  
  return useMemo(() => {
    const hasVideo = !!videoUrl
    const isInRally = currentRallyContacts.length > 0
    
    return {
      canAddContact: hasVideo && !isPlaying,
      canEndRally: isInRally,
      canUndo: isInRally,
      currentRallyContactCount: currentRallyContacts.length,
      isInRally,
    }
  }, [currentRallyContacts, isPlaying, videoUrl])
}

