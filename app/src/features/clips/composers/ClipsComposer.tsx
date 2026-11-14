/**
 * ClipsComposer — "show me the clips".
 *
 * Routes: /clips (every tagged match) and the Clips tab of Match Review
 * (one match). `?clip=<filter key>` picks the playlist.
 * Standalone `/clips?scope=&id=` filters by tournament / opponent / all.
 *
 * Plays a playlist straight from the source videos (no file is made), moving
 * clip to clip. "Save as reel" cuts the playlist into one small MP4 that can be
 * backed up to the cloud and played anywhere.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  Icon,
  parseScorePair,
  shortPlayerName,
  type MatchScoreHudProps,
  type VideoPlayerHandle,
} from '@/ui-mine'
import { useVideoPlaybackStore, useWatchUnmuteDefault } from '@/ui-mine/VideoPlayer'
import { formatFileSize } from '@/helpers/videoFileHelpers'
import { useCloudStore } from '@/stores/cloudStore'
import { useMatchStore, usePlayerStore, useTournamentStore } from '@/data'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'
import {
  filterMatchesByScope,
  type ReviewScope,
  type ReviewScopeKind,
} from '@/rules/reviewScope'
import {
  applyClipPlaybackMode,
  decodeClipFilter,
  deriveClips,
  encodeClipFilter,
  isShotBasedClipFilter,
  resolveClipPlaybackWindow,
  type ClipPlaybackMode,
} from '@/rules/derive/clips/deriveClips'
import { clipSourceKey, deriveClipEdl } from '@/rules/derive/clips/deriveClipEdl'
import type { ClipPreset } from '@/rules/derive/clips/deriveClipPresets'
import { useDeriveClipLibrary } from '../derive/useDeriveClipLibrary'
import { buildClipRows, formatSeconds } from '../derive/buildClipLibrary'
import { ClipPresetListBlock } from '../blocks/ClipPresetListBlock'
import { ClipQueueBlock } from '../blocks/ClipQueueBlock'
import { ClipStageBlock } from '../blocks/ClipStageBlock'
import {
  PlaylistBrowseShellBlock,
  type PlaylistBrowseTrailLink,
} from '../blocks/PlaylistBrowseShellBlock'
import { ReelListBlock } from '../blocks/ReelListBlock'
import { ScopeControlBlock } from '@/features/match-review/blocks/ScopeControlBlock'
import {
  backUpReel,
  checkReel,
  downloadClipFile,
  fetchReelToDevice,
  loadClipVideo,
  loadReelVideo,
  saveClipVideoFromUrl,
  saveReel,
  type ReelExportProgress,
} from './clipActions'
import type { ReelRowModel } from '../models'

type VideoSlot = { url: string | null; origin: 'device' | 'cloud' | null } | 'loading'

interface ReelPlayback {
  assetId: string
  label: string
  url: string
  origin: 'device' | 'cloud'
}

const STAGE_LABEL: Record<ReelExportProgress['stage'], string> = {
  loading: 'Starting video tools',
  cutting: 'Cutting clips',
  joining: 'Joining clips',
  saving: 'Saving reel',
}

function parseScope(params: URLSearchParams): ReviewScope {
  const kind = (params.get('scope') as ReviewScopeKind | null) ?? 'all'
  if (kind === 'match' || kind === 'tournament' || kind === 'opponent' || kind === 'all') {
    return { kind, id: params.get('id') }
  }
  return { kind: 'all', id: null }
}

export interface ClipsComposerProps {
  /** One match (Match Review tab) or null for every match */
  matchId?: string | null
  /** When set with matchId null, limit the library to these match ids (scope review). */
  matchIds?: string[] | null
  embedded?: boolean
}

export function ClipsComposer({ matchId = null, matchIds = null, embedded = false }: ClipsComposerProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const profile = useCloudStore((s) => s.profile)
  const cloudUser = useCloudStore((s) => s.user)
  const focal = deriveAccountScope(profile, []).focalPlayerId
  const { matches, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()

  const standalone = !embedded && !matchId
  const urlScope = parseScope(searchParams)

  useEffect(() => {
    if (!standalone) return
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [standalone, loadMatches, loadPlayers, loadTournaments])

  const scopedMatchIds = useMemo(() => {
    if (matchIds) return matchIds
    if (!standalone || !focal) return null
    if (urlScope.kind === 'all') return null
    return filterMatchesByScope(matches, urlScope, focal).map((m) => m.id)
  }, [matchIds, standalone, focal, matches, urlScope])

  const { data, isLoading, error, refresh } = useDeriveClipLibrary(matchId, scopedMatchIds)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying)
  useWatchUnmuteDefault()

  const [index, setIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(true)
  /** Default whole rally for shot-based playlists (Work on, opening). */
  const [playbackMode, setPlaybackMode] = useState<ClipPlaybackMode>('rally')
  const [videos, setVideos] = useState<Record<string, VideoSlot>>({})
  const [reel, setReel] = useState<ReelPlayback | null>(null)
  const [exporting, setExporting] = useState<ReelExportProgress | null>(null)
  const [busyReel, setBusyReel] = useState<string | null>(null)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  /** History-style playlist overlay via shared BrowseDisclosure (no page expand). */
  const [presetsOpen, setPresetsOpen] = useState(false)
  const blobUrls = useRef<string[]>([])
  const clipStartedAt = useRef(0)

  useEffect(() => {
    const urls = blobUrls.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const presets = useMemo(() => data?.groups.flatMap((g) => g.presets) ?? [], [data])
  const clipParam = searchParams.get('clip')
  const clipTitleParam = searchParams.get('clipTitle')
  const fromParam = searchParams.get('from')
  const atParam = searchParams.get('at')
  const filter = decodeClipFilter(clipParam) ?? presets[0]?.filter ?? null
  const activeKey = filter ? encodeClipFilter(filter) : null
  const playlistLabel =
    presets.find((p) => p.key === activeKey)?.label ??
    clipTitleParam ??
    (filter?.kind === 'rallies' ? 'Selected rallies' : 'Clips')

  const clips = useMemo(
    () => (data && filter ? deriveClips(data.inputs, filter) : []),
    // filter is rebuilt each render; its key is the identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, activeKey]
  )
  const shotBased = isShotBasedClipFilter(filter)
  const effectiveMode: ClipPlaybackMode = shotBased ? playbackMode : 'rally'
  const playClips = useMemo(() => applyClipPlaybackMode(clips, effectiveMode), [clips, effectiveMode])
  const rows = useMemo(
    () => (data && filter ? buildClipRows(clips, data.inputs, filter, data.matchLabels) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clips, data, activeKey]
  )
  const edl = useMemo(() => deriveClipEdl(playClips), [playClips])

  useEffect(() => {
    setIndex(0)
    setPlaybackMode('rally')
  }, [activeKey])

  // Work on / Summary deep links can land on a specific shot or rally in the playlist.
  useEffect(() => {
    if (!atParam || rows.length === 0) return
    const i = rows.findIndex(
      (r) => r.clip.shotId === atParam || r.clip.rallyId === atParam || r.clip.id === atParam
    )
    if (i >= 0) setIndex(i)
  }, [activeKey, atParam, rows])

  // Deep links land on the sticky browse chip — do not auto-open or scrollIntoView.

  const clearDeepLinkChrome = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('from')
    next.delete('at')
    next.delete('clipTitle')
    setSearchParams(next, { replace: true })
  }

  const backFromWorkOn = () => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'workon')
    next.delete('clip')
    next.delete('clipTitle')
    next.delete('from')
    next.delete('at')
    setSearchParams(next, { replace: true })
  }

  const current = rows[Math.min(index, rows.length - 1)] ?? null
  const playWindow = current ? resolveClipPlaybackWindow(current.clip, effectiveMode) : null
  const sourceKey = current ? clipSourceKey(current.clip) : null

  useEffect(() => {
    if (!current || !sourceKey || sourceKey in videos) return
    const { matchId: m, setNumber } = current.clip
    setVideos((v) => ({ ...v, [sourceKey]: 'loading' }))
    loadClipVideo(m, setNumber)
      .then((resolved) => {
        if (resolved?.url.startsWith('blob:')) blobUrls.current.push(resolved.url)
        setVideos((v) => ({ ...v, [sourceKey]: { url: resolved?.url ?? null, origin: resolved?.origin ?? null } }))
      })
      .catch(() => setVideos((v) => ({ ...v, [sourceKey]: { url: null, origin: null } })))
  }, [current, sourceKey, videos])

  const slot = sourceKey ? videos[sourceKey] : undefined
  const clipVideo = slot && slot !== 'loading' ? slot : null
  const videoUrl = reel ? reel.url : (clipVideo?.url ?? null)

  // Start each clip at its window (and each reel at 0)
  useEffect(() => {
    if (!videoUrl) return
    if (!reel && !current) return
    clipStartedAt.current = Date.now()
    const start = reel ? 0 : playWindow!.start
    const t = setTimeout(() => {
      playerRef.current?.seek(start, true)
      playerRef.current?.play()
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, current?.clip.id, reel?.assetId, playWindow?.start, playWindow?.end, effectiveMode])

  const selectPreset = (preset: ClipPreset) => {
    setReel(null)
    const next = new URLSearchParams(searchParams)
    next.set('clip', preset.key)
    next.delete('clipTitle')
    next.delete('from')
    next.delete('at')
    setSearchParams(next, { replace: true })
  }

  const setScope = (next: ReviewScope) => {
    const p = new URLSearchParams(searchParams)
    p.set('scope', next.kind)
    if (next.id) p.set('id', next.id)
    else p.delete('id')
    setSearchParams(p, { replace: true })
  }

  useEffect(() => {
    clipStartedAt.current = Date.now()
  }, [current?.clip.id])

  const handleClipEnd = useCallback(() => {
    // The shared playback time can still belong to the previous clip/video:
    // only move on when this video really reached this clip's end.
    if (!current || !playWindow || Date.now() - clipStartedAt.current < 800) return
    const at = playerRef.current?.getCurrentTime() ?? 0
    if (at < playWindow.end - 0.3 || at > playWindow.end + 2) return
    if (autoAdvance) setIndex((i) => (i < rows.length - 1 ? i + 1 : i))
  }, [autoAdvance, rows.length, current, playWindow])

  const handleVideoSelect = async (pickedUrl: string) => {
    if (!current || !sourceKey) return
    try {
      const url = await saveClipVideoFromUrl(current.clip.matchId, current.clip.setNumber, pickedUrl)
      if (!url) return
      blobUrls.current.push(url)
      setVideos((v) => ({ ...v, [sourceKey]: { url, origin: 'device' } }))
    } catch {
      setVideos((v) => ({ ...v, [sourceKey]: { url: pickedUrl, origin: 'device' } }))
    }
  }

  // A reel travels with one match's bundle; a cross-match reel goes with its first clip's match
  const reelMatchId = matchId ?? clips[0]?.matchId ?? ''

  const handleDownloadClip = async () => {
    const clipForDownload = playClips[Math.min(index, playClips.length - 1)]
    if (!clipForDownload) return
    setDownloadBusy(true)
    setNotice(null)
    try {
      await downloadClipFile(clipForDownload)
      setNotice({ tone: 'good', text: 'Clip saved to this device (or shared). Tags still use source-video time.' })
      refresh()
    } catch (err) {
      console.error('[Clips] Clip download failed:', err)
      setNotice({ tone: 'bad', text: err instanceof Error ? err.message : 'Clip download failed' })
    } finally {
      setDownloadBusy(false)
    }
  }

  const handleExport = async () => {
    setNotice(null)
    const plan = await checkReel(edl)
    if (plan.missingSources.length > 0) {
      setNotice({ tone: 'bad', text: 'Some clips use a set video that isn’t on this device yet. Play them once and load the video, then try again.' })
      return
    }
    if (plan.tooBig && !window.confirm(`This reel would be about ${formatFileSize(plan.estimatedBytes)}. Big reels can run out of browser memory. Try anyway?`)) {
      return
    }
    setExporting({ stage: 'loading', done: 0, total: edl.segments.length })
    try {
      const asset = await saveReel({ matchId: reelMatchId, label: playlistLabel, edl, onProgress: setExporting })
      setNotice({ tone: 'good', text: `Saved “${playlistLabel}” — ${formatFileSize(asset.size_bytes)}. Open it below, then Save to device.` })
      refresh()
    } catch (err) {
      console.error('[Clips] Reel export failed:', err)
      setNotice({ tone: 'bad', text: err instanceof Error ? err.message : 'Reel export failed' })
    } finally {
      setExporting(null)
    }
  }

  const playReel = async (r: ReelRowModel) => {
    const resolved = await loadReelVideo(r.assetId)
    if (!resolved) {
      setNotice({ tone: 'bad', text: 'That reel isn’t on this device or in the cloud.' })
      return
    }
    if (resolved.url.startsWith('blob:')) blobUrls.current.push(resolved.url)
    setReel({ assetId: r.assetId, label: r.label, url: resolved.url, origin: resolved.origin })
  }

  const runReelAction = async (r: ReelRowModel, action: (id: string) => Promise<void>, done: string) => {
    setBusyReel(r.assetId)
    setNotice(null)
    try {
      await action(r.assetId)
      setNotice({ tone: 'good', text: done })
      refresh()
    } catch (err) {
      setNotice({ tone: 'bad', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setBusyReel(null)
    }
  }

  if (isLoading) return <p className="text-neutral-400">Loading clips…</p>
  if (error) return <p className="text-result-error">{error}</p>
  if (!data) return null

  const mine = focal ? matches.filter((m) => m.player1_id === focal) : []
  const showExportBar = !reel && rows.length > 0

  const header = !embedded && (
    <header className="space-y-3">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-neutral-50">Clips</h1>
      </div>
      {standalone && (
        <ScopeControlBlock
          scope={urlScope}
          matches={mine}
          players={players}
          tournaments={tournaments}
          onChange={setScope}
        />
      )}
    </header>
  )

  if (presets.length === 0 && filter?.kind !== 'rallies' && !clipParam) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6 text-center border border-dashed border-border">
          <h2 className="text-base font-semibold text-neutral-50">No clips yet</h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-md mx-auto">
            Star highlights or flag shots in Pass 1 — playlists show up here.
          </p>
          {!embedded && (
            <Button className="mt-4" onClick={() => navigate('/matches/create')}>
              <Icon name="plus" size="sm" /> New match
            </Button>
          )}
        </Card>
      </div>
    )
  }

  const activeReel = reel
  const missingMessage = current
    ? `Set ${current.clip.setNumber} video isn’t on this device${cloudUser ? ' or in your cloud backup' : ''} — load it once and it’s remembered.`
    : ''

  const clipScoreHud = useMemo((): MatchScoreHudProps | null => {
    if (!current || !data) return null
    const pair = parseScorePair(current.clip.scoreBefore)
    if (!pair) return null
    const input = data.inputs.find((i) => i.match.id === current.clip.matchId)
    const byId = new Map(players.map((p) => [p.id, p]))
    const p1 = input ? byId.get(input.match.player1_id) : undefined
    const p2 = input?.match.player2_id ? byId.get(input.match.player2_id) : undefined
    const player1Name = shortPlayerName(p1?.first_name?.trim() || data.names.hero, 'Hero')
    const player2Name = shortPlayerName(p2?.first_name?.trim() || data.names.villain, 'Opp')
    return {
      player1Name,
      player2Name,
      player1Score: pair.player1,
      player2Score: pair.player2,
      setNumber: current.clip.setNumber,
      showSets: false,
      compact: true,
    }
  }, [current, data, players])

  const stage = activeReel ? (
    <ClipStageBlock
      ref={playerRef}
      heading="Saved reel"
      title={activeReel.label}
      subtitle=""
      position={0}
      total={1}
      videoUrl={activeReel.url}
      videoOrigin={activeReel.origin}
      videoLoading={false}
      window={null}
      isPlaying={isPlaying}
      autoAdvance={false}
      missingMessage=""
      onClipEnd={() => undefined}
      onTogglePlay={() => playerRef.current?.togglePlay()}
      onReplay={() => {
        playerRef.current?.seek(0, true)
        playerRef.current?.play()
      }}
      onPrev={() => undefined}
      onNext={() => undefined}
      onToggleAutoAdvance={() => undefined}
      onClose={() => setReel(null)}
    />
  ) : current && playWindow ? (
    <ClipStageBlock
      ref={playerRef}
      heading={playlistLabel}
      title={current.title}
      subtitle={current.subtitle}
      position={index}
      total={rows.length}
      videoUrl={videoUrl}
      videoOrigin={clipVideo?.origin ?? null}
      videoLoading={slot === 'loading'}
      window={playWindow}
      isPlaying={isPlaying}
      autoAdvance={autoAdvance}
      missingMessage={missingMessage}
      playbackMode={shotBased ? playbackMode : null}
      onPlaybackModeChange={shotBased ? setPlaybackMode : undefined}
      onVideoSelect={handleVideoSelect}
      onClipEnd={handleClipEnd}
      onTogglePlay={() => playerRef.current?.togglePlay()}
      onReplay={() => {
        clipStartedAt.current = Date.now()
        playerRef.current?.seek(playWindow.start, true)
        playerRef.current?.play()
      }}
      onPrev={() => setIndex((i) => Math.max(0, i - 1))}
      onNext={() => setIndex((i) => Math.min(rows.length - 1, i + 1))}
      onToggleAutoAdvance={() => setAutoAdvance((a) => !a)}
      scoreHud={clipScoreHud}
      heroWon={current.heroWon}
      // Download lives once: export strip (desktop) / sticky bar (phone) — never on stage.
      onEdit={() => {
        const q = new URLSearchParams({
          set: String(current.clip.setNumber),
          rally: String(current.clip.rallyIndex),
          from: 'clips',
        })
        if (current.clip.shotIndex != null) q.set('shot', String(current.clip.shotIndex))
        navigate(`/matches/${current.clip.matchId}/edit-rally?${q.toString()}`)
      }}
    />
  ) : (
    <Card className="p-6 text-sm text-neutral-400 space-y-3">
      <p>No clips in this playlist.</p>
      {embedded && fromParam === 'workon' ? (
        <Button size="sm" variant="secondary" onClick={backFromWorkOn}>
          <Icon name="arrow-left" size="sm" /> Back to Work on
        </Button>
      ) : (
        <p className="text-xs text-neutral-500">
          Open Playlists above to switch list, or flag shots / star rallies while tagging.
        </p>
      )}
    </Card>
  )

  const isHighlightReel = filter?.kind === 'highlights'

  const browseTrail: PlaylistBrowseTrailLink[] = []
  if (embedded && fromParam === 'workon') {
    browseTrail.push({ id: 'workon', label: 'Work on', onClick: backFromWorkOn, primary: true })
  }
  if (embedded && fromParam === 'workon' && (clipTitleParam || atParam)) {
    browseTrail.push({ id: 'stay', label: 'Stay in Clips', onClick: clearDeepLinkChrome })
  }
  if (!reel && current) {
    browseTrail.push({
      id: 'fix',
      label: 'Fix tags',
      onClick: () => {
        const q = new URLSearchParams({
          set: String(current.clip.setNumber),
          rally: String(current.clip.rallyIndex),
          from: 'clips',
        })
        if (current.clip.shotIndex != null) q.set('shot', String(current.clip.shotIndex))
        navigate(`/matches/${current.clip.matchId}/edit-rally?${q.toString()}`)
      },
    })
  }

  const browseContext =
    embedded && fromParam === 'workon'
      ? `From Work on${clipTitleParam ? ` · ${clipTitleParam}` : ''}`
      : null

  const browseShell = (
    <PlaylistBrowseShellBlock
      open={presetsOpen}
      onOpenChange={setPresetsOpen}
      groups={data.groups}
      activeKey={reel ? null : activeKey}
      activeLabel={reel ? reel.label : playlistLabel}
      clipCount={reel ? null : rows.length}
      contextLabel={browseContext}
      trail={browseTrail}
      onSelect={selectPreset}
    />
  )

  const exportStrip = showExportBar && (
    <div className="hidden md:flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">
          {isHighlightReel ? `★ ${playlistLabel}` : playlistLabel}
        </p>
        <p className="text-xs text-neutral-500 tabular-nums">
          {isHighlightReel
            ? `${rows.length} starred`
            : `${rows.length} clip${rows.length === 1 ? '' : 's'} · ${formatSeconds(edl.duration)}`}
        </p>
      </div>
      {exporting ? (
        <p className="flex items-center gap-2 text-sm text-neutral-300">
          <Icon name="loader" size="sm" className="animate-spin" />
          {STAGE_LABEL[exporting.stage]}
          {exporting.stage === 'cutting' && ` ${exporting.done + 1}/${exporting.total}`}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={handleDownloadClip} disabled={!current || downloadBusy}>
            <Icon name={downloadBusy ? 'loader' : 'download'} size="sm" className={downloadBusy ? 'animate-spin' : undefined} />
            Download
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExport}>
            <Icon name="scissors" size="sm" /> Save as reel
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className={`space-y-6 ${showExportBar ? 'pb-24 md:pb-6' : ''}`}>
      {header}

      {notice && (
        <div
          className={
            notice.tone === 'good'
              ? 'flex items-center gap-2 rounded-md border border-result-winner/50 bg-result-winner-bg px-3 py-2 text-sm text-result-winner'
              : 'flex items-center gap-2 rounded-md border border-result-error/50 bg-result-error-bg px-3 py-2 text-sm text-result-error'
          }
        >
          <Icon name={notice.tone === 'good' ? 'check' : 'warning'} size="sm" />
          <span className="min-w-0 flex-1 truncate">{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <Icon name="x" size="sm" />
          </button>
        </div>
      )}

      {/* Sticky browse shell (all viewports) on shared BrowseDisclosure + desktop rail. */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden md:block md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:pr-1">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Playlists
          </p>
          <ClipPresetListBlock groups={data.groups} activeKey={reel ? null : activeKey} onSelect={selectPreset} />
        </aside>

        <div className="space-y-4 min-w-0">
          {browseShell}
          {stage}
          {exportStrip}
          {!activeReel && rows.length > 0 && <ClipQueueBlock rows={rows} activeIndex={index} onSelect={setIndex} />}
          <ReelListBlock
            reels={data.reels}
            activeAssetId={activeReel?.assetId ?? null}
            busyAssetId={busyReel}
            canUseCloud={Boolean(cloudUser)}
            onPlay={playReel}
            onUpload={(r) => runReelAction(r, backUpReel, `“${r.label}” is backed up to the cloud.`)}
            onDownload={(r) => runReelAction(r, fetchReelToDevice, `“${r.label}” is saved on this device.`)}
          />
        </div>
      </div>

      {showExportBar && (
        <div className="fixed inset-x-0 bottom-12 z-30 border-t border-border bg-bg-shell/95 px-3 py-2 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={handleDownloadClip}
              disabled={!current || downloadBusy || Boolean(exporting)}
            >
              <Icon name={downloadBusy ? 'loader' : 'download'} size="sm" className={downloadBusy ? 'animate-spin' : undefined} />
              Download
            </Button>
            <Button size="sm" className="flex-1" onClick={handleExport} disabled={Boolean(exporting)}>
              <Icon name={exporting ? 'loader' : 'scissors'} size="sm" className={exporting ? 'animate-spin' : undefined} />
              {exporting ? STAGE_LABEL[exporting.stage] : 'Save as reel'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
