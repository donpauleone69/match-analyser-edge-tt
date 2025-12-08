/**
 * ShotTaggingEngine — Two-phase tagging interface
 * 
 * Sequential question-based interface with auto-advance.
 * Route: /matches/:matchId/tag
 */

import { TaggingUIComposer } from '@/features/shot-tagging-engine'

export function ShotTaggingEngine() {
  return <TaggingUIComposer />
}
