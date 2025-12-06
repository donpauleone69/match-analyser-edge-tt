/**
 * Match Create Page
 */

import { MatchCreationComposer } from '@/features/match-management'

export default function MatchCreatePage() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <MatchCreationComposer />
      </div>
    </div>
  )
}

