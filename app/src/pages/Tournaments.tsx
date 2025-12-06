/**
 * Tournaments Page
 */

import { TournamentManagementComposer } from '@/features/tournament-management'

export default function TournamentsPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <TournamentManagementComposer />
      </div>
    </div>
  )
}

