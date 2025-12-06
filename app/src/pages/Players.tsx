/**
 * Players Page
 */

import { PlayerManagementComposer } from '@/features/player-management'

export default function PlayersPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <PlayerManagementComposer />
      </div>
    </div>
  )
}

