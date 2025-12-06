/**
 * Clubs Page
 * 
 * Manage table tennis clubs
 */

import { ClubManagementComposer } from '@/features/club-management'

export function Clubs() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <ClubManagementComposer />
      </div>
    </div>
  )
}

