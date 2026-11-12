/**
 * Match Review Page
 *
 * Route: /matches/:id
 */

import { MatchReviewComposer } from '@/features/match-review'

export default function MatchReviewPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <MatchReviewComposer />
      </div>
    </div>
  )
}
