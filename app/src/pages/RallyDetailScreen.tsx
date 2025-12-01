/**
 * RallyDetailScreen — Route component for Part 2 rally review
 * 
 * Thin page component — imports and renders composer.
 */

import { RallyDetailComposer } from '@/features/tagging'

export function RallyDetailScreen() {
  return (
    <div className="h-screen bg-bg-surface">
      <RallyDetailComposer className="h-full" />
    </div>
  )
}

