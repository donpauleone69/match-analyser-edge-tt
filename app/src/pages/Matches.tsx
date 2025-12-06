/**
 * Matches Page - Display all matches from database
 */

import { MatchListComposer } from '@/features/match-management'

export default function MatchesPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <MatchListComposer />
      </div>
    </div>
  )
}

