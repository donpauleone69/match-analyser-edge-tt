/**
 * Analytics Page
 * 
 * Route: /analytics
 * 
 * Statistical analysis and insights dashboard.
 */

import { AnalyticsComposer } from '@/features/analytics'

export function AnalyticsPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <AnalyticsComposer />
      </div>
    </div>
  )
}

