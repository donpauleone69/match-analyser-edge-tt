/**
 * useDeriveMatchStorage — where this match and its set videos are kept.
 */

import { useCallback, useEffect, useState } from 'react'
import { videoAssetDb } from '@/data'
import { getLocalSyncStatus, getSyncEntry, type LocalSyncStatus } from '@/data/cloud'
import { deriveVideoAvailability, type VideoAvailability } from '@/data/services/videoAssetService'
import { formatFileSize } from '@/helpers/videoFileHelpers'

export interface SetVideoStorageModel {
  assetId: string
  setNumber: number
  availability: VideoAvailability
  sizeLabel: string
  archivedLocally: boolean
  canRetrieve: boolean
  durationS: number | null
}

export interface MatchStorageModel {
  sync: LocalSyncStatus
  syncedAtLabel: string | null
  setVideos: SetVideoStorageModel[]
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString()
}

export function useDeriveMatchStorage(matchId: string | undefined, dataVersion: unknown) {
  const [model, setModel] = useState<MatchStorageModel | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!matchId) return
    let active = true
    ;(async () => {
      const [sync, assets] = await Promise.all([getLocalSyncStatus(matchId), videoAssetDb.getByMatch(matchId)])
      const sources = assets
        .filter((a) => a.kind === 'source' && a.set_number !== null)
        .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0) || b.updated_at.localeCompare(a.updated_at))
      const latestPerSet = sources.filter((a, i) => sources.findIndex((b) => b.set_number === a.set_number) === i)
      const setVideos = await Promise.all(
        latestPerSet.map(async (a) => {
          const availability = await deriveVideoAvailability(a)
          return {
            assetId: a.id,
            setNumber: a.set_number!,
            availability,
            sizeLabel: formatFileSize(a.size_bytes),
            archivedLocally: Boolean(a.archived_locally_at) || availability === 'cloud' || availability === 'missing',
            canRetrieve: Boolean(a.remote_path),
            durationS: a.duration_s,
          }
        })
      )
      const entry = getSyncEntry(matchId)
      if (active) setModel({ sync, syncedAtLabel: entry ? ago(entry.syncedAt) : null, setVideos })
    })().catch((err) => console.warn('[MatchStorage] load failed:', err))
    return () => {
      active = false
    }
  }, [matchId, reloadKey, dataVersion])

  return { storage: model, refreshStorage: refresh }
}
