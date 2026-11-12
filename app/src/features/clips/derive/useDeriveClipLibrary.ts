/**
 * useDeriveClipLibrary — loads one match (or every match) and the saved reels,
 * then derives clip presets. Library mode labels clips with the match name.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { matchDb, usePlayerStore, videoAssetDb, type DBPlayer, type DBVideoAsset } from '@/data'
import { deriveVideoAvailability } from '@/data/services/videoAssetService'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import { formatFileSize } from '@/helpers/videoFileHelpers'
import type { ClipMatchInput } from '@/rules/derive/clips/deriveClips'
import { deriveClipPresets, type ClipPresetNames } from '@/rules/derive/clips/deriveClipPresets'
import { formatSeconds, groupClipPresets } from './buildClipLibrary'
import type { ClipPresetGroupModel, ReelRowModel } from '../models'
import { useCloudStore } from '@/stores/cloudStore'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'

export interface ClipLibraryData {
  inputs: ClipMatchInput[]
  names: ClipPresetNames
  groups: ClipPresetGroupModel[]
  /** match id → "Pat vs Sam · 11 Nov" (library mode only) */
  matchLabels: Map<string, string> | null
  reels: ReelRowModel[]
  reelAssets: DBVideoAsset[]
}

function fullName(p: DBPlayer | undefined, fallback: string): string {
  return p ? `${p.first_name} ${p.last_name}`.trim() || fallback : fallback
}

function firstName(p: DBPlayer | undefined, fallback: string): string {
  return p?.first_name || fallback
}

export function useDeriveClipLibrary(matchId: string | null) {
  const { players, load: loadPlayers } = usePlayerStore()
  const profile = useCloudStore((state) => state.profile)
  const [inputs, setInputs] = useState<ClipMatchInput[] | null>(null)
  const [reelAssets, setReelAssets] = useState<DBVideoAsset[]>([])
  const [reels, setReels] = useState<ReelRowModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const candidates = matchId ? [await matchDb.getById(matchId)].filter(Boolean) : await matchDb.getAll()
        const matches = deriveAccountScope(profile, candidates.filter((match): match is NonNullable<typeof match> => Boolean(match))).matches
        const complete = await Promise.all(matches.map((m) => matchDb.getCompleteMatchData(m!.id)))
        const loaded = complete.filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.rallies.length > 0)
        const scopedMatchIds = new Set(matches.map((match) => match.id))
        const allAssets = matchId ? await videoAssetDb.getByMatch(matchId) : await videoAssetDb.getAll()
        const assets = allAssets.filter((asset) => scopedMatchIds.has(asset.match_id))
        const reelList = assets.filter((a) => a.kind === 'reel').sort((a, b) => b.created_at.localeCompare(a.created_at))
        const rows = await Promise.all(
          reelList.map(async (a): Promise<ReelRowModel> => ({
            assetId: a.id,
            matchId: a.match_id,
            label: a.label ?? a.file_name,
            createdLabel: new Date(a.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sizeLabel: formatFileSize(a.size_bytes),
            durationLabel: a.duration_s ? formatSeconds(a.duration_s) : '—',
            clipCount: a.segments?.reduce((n, s) => n + s.clipIds.length, 0) ?? 0,
            availability: await deriveVideoAvailability(a),
          }))
        )
        if (!active) return
        setInputs(loaded)
        setReelAssets(reelList)
        setReels(rows)
        setError(null)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load clips')
      }
    })()
    return () => {
      active = false
    }
  }, [matchId, reloadKey, profile])

  const data = useMemo<ClipLibraryData | null>(() => {
    if (!inputs) return null
    const byId = new Map(players.map((p) => [p.id, p]))
    const heroIds = new Set(inputs.map((i) => i.match.player1_id))
    const villainIds = new Set(inputs.map((i) => i.match.player2_id ?? null))
    const onlyHero = heroIds.size === 1 ? byId.get([...heroIds][0]) : undefined
    const onlyVillainId = villainIds.size === 1 ? [...villainIds][0] : undefined
    const names: ClipPresetNames = {
      hero: onlyHero ? fullName(onlyHero, 'Hero') : 'Hero',
      villain:
        onlyVillainId !== undefined
          ? onlyVillainId ? fullName(byId.get(onlyVillainId), THEM_SIDE_LABEL) : THEM_SIDE_LABEL
          : 'Opponents',
    }
    const matchLabels = matchId
      ? null
      : new Map(
          inputs.map((i) => {
            const m = i.match
            const opp = m.player2_id ? firstName(byId.get(m.player2_id), THEM_SIDE_LABEL) : THEM_SIDE_LABEL
            const date = m.match_date
              ? new Date(m.match_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
              : ''
            return [i.match.id, `vs ${opp}${date ? ` · ${date}` : ''}`]
          })
        )
    return {
      inputs,
      names,
      groups: groupClipPresets(deriveClipPresets(inputs, names)),
      matchLabels,
      reels,
      reelAssets,
    }
  }, [inputs, players, matchId, reels, reelAssets])

  return { data, isLoading: inputs === null && !error, error, refresh }
}
