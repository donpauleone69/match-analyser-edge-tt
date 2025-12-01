/**
 * TaggingScreen — Route component for tagging workflow
 * 
 * Thin page component — imports and renders composer.
 */

import { TaggingScreenComposer } from '@/features/tagging'

export function TaggingScreen() {
  return (
    <div className="h-screen bg-bg-surface">
      <TaggingScreenComposer className="h-full" />
    </div>
  )
}

