/**
 * TaggingScreen — Route component for tagging workflow
 * 
 * Thin page component — imports and renders composer.
 * Handles new match vs resume match logic.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TaggingScreenComposer } from '@/features/tagging'
import { useTaggingStore } from '@/stores/taggingStore'

export function TaggingScreen() {
  const location = useLocation()
  const resetForNewMatch = useTaggingStore(state => state.resetForNewMatch)
  
  // If this is /matches/new, reset for a fresh match
  useEffect(() => {
    if (location.pathname === '/matches/new') {
      resetForNewMatch()
    }
    // Only run on mount and pathname change
  }, [location.pathname, resetForNewMatch])
  
  return (
    <div className="h-screen bg-bg-surface">
      <TaggingScreenComposer className="h-full" />
    </div>
  )
}

