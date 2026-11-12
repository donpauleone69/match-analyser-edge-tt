/**
 * Rally Edit — fix one tagged rally without re-tagging the set
 *
 * Route: /matches/:matchId/edit-rally?set=N&rally=R
 */

import { RallyEditComposer } from '@/features/shot-tagging-engine'

export function RallyEdit() {
  return <RallyEditComposer />
}
