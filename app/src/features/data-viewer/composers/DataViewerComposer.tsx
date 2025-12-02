import { useEffect, useState } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { MatchMetadataSection } from '../sections/MatchMetadataSection'
import { SetsDataSection } from '../sections/SetsDataSection'
import { RalliesDataSection } from '../sections/RalliesDataSection'
import { ShotsDataSection } from '../sections/ShotsDataSection'
import { ExportControlsSection } from '../sections/ExportControlsSection'

export function DataViewerComposer() {
  const [isHydrated, setIsHydrated] = useState(false)
  const matchId = useTaggingStore((state) => state.matchId)
  const rallies = useTaggingStore((state) => state.rallies)

  useEffect(() => {
    // Immediately set as hydrated - Zustand persist loads synchronously on first render
    setIsHydrated(true)
  }, [])


  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-surface">
        <div className="text-center">
          <p className="text-neutral-400">Loading match data...</p>
        </div>
      </div>
    )
  }

  if (!matchId || !rallies || rallies.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-surface">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-50 mb-2">
            No Match Data Available
          </h2>
          <p className="text-neutral-400">
            Please tag a match first to view data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-50">Match Data Viewer</h1>
          <ExportControlsSection />
        </div>

        <MatchMetadataSection />
        <SetsDataSection />
        <RalliesDataSection />
        <ShotsDataSection />
      </div>
    </div>
  )
}

