/**
 * MatchReviewComposer — Match Review page (route: /matches/:id)
 *
 * First-person hub for a match (hero / player1):
 *   Summary · Details · Work on · Clips · Rallies
 * Summary = narrative + story; Details = result, sets, storage.
 * Highlights show-reel lives under Clips (preset kind: highlights).
 * Every number opens its evidence; every rally can be watched or edited.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Icon, type VideoPlayerHandle } from '@/ui-mine'
import { useVideoPlaybackStore, useWatchUnmuteDefault } from '@/ui-mine/VideoPlayer'
import { cn } from '@/helpers/utils'
import { setPersistedRallyHighlight, type RallyEditNotice } from '@/features/shot-tagging-engine'
import { useDeriveMatchReview } from '../derive/useDeriveMatchReview'
import { TabBarBlock, type TabItem } from '../blocks/TabBarBlock'
import { EvidenceDrawerBlock } from '../blocks/EvidenceDrawerBlock'
import { RallyRowBlock } from '../blocks/RallyRowBlock'
import { RallyPlayerBlock } from '../blocks/RallyPlayerBlock'
import { SummarySection } from '../sections/SummarySection'
import { DetailsSection } from '../sections/DetailsSection'
import { WorkOnSection } from '../sections/WorkOnSection'
import type { RallyActions } from '../models'
import { RalliesSection, type RallyFilter } from '../sections/RalliesSection'
import { ClipsComposer } from '@/features/clips'
import { encodeClipFilter } from '@/rules/derive/clips/deriveClips'
import {
  addNextSet,
  applyStoredVideoMatchDateIfNeeded,
  applySuggestedVideoDate,
  archiveSetVideo,
  backUpMatch,
  backUpSetVideo,
  createAndLinkOpponent,
  createTournamentForMatch,
  loadSetVideoUrl,
  replaceWithCloudCopy,
  retrieveSetVideo,
  saveMatchContext,
  saveMatchFile,
  saveSetVideoFromUrl,
  retagFromRally,
  startSetOver,
  trimSetVideo,
} from './matchReviewActions'
import { useDeriveMatchStorage } from '../derive/useDeriveMatchStorage'
import { useCloudStore } from '@/stores/cloudStore'
import { useMatchStore, usePlayerStore, useTournamentStore, type MatchRound } from '@/data'
import type { EvidenceRef, RallyRowModel, SetPanelModel } from '../models'
type ReviewTab = 'summary' | 'details' | 'workon' | 'clips' | 'rallies'
const TABS: ReviewTab[] = ['summary', 'details', 'workon', 'clips', 'rallies']

function resolveReviewTab(param: string | null): ReviewTab {
  if (param === 'overview') return 'summary' // legacy URL
  if (param === 'highlights') return 'clips' // show-reel lives in Clips
  if (param && (TABS as string[]).includes(param)) return param as ReviewTab
  return 'summary'
}

interface PlayerState {
  playlist: RallyRowModel[]
  index: number
  title: string
  /** Start the clip here (a flagged shot) instead of the rally start */
  seekTime?: number
}

const SHOT_LEAD_SECONDS = 1.5

export function MatchReviewComposer() {
  const { id: matchId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, review, isLoading, notFound, error, refresh } = useDeriveMatchReview(matchId)
  const { players } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  const { load: loadMatches } = useMatchStore()

  const tab = resolveReviewTab(searchParams.get('tab'))
  const categoryId = searchParams.get('cat')
  const focusId = searchParams.get('focus')
  const rallySetParam = Number(searchParams.get('s'))
  const rfParam = searchParams.get('rf')

  const [filter, setFilter] = useState<RallyFilter>(() =>
    rfParam === 'incomplete' ? 'incomplete' : 'all'
  )

  useEffect(() => {
    if (rfParam === 'incomplete') setFilter('incomplete')
  }, [rfParam])
  const [evidence, setEvidence] = useState<EvidenceRef | null>(null)
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [videoUrls, setVideoUrls] = useState<Record<number, string | null>>({})
  const [notice, setNotice] = useState<string | null>(
    (location.state as RallyEditNotice | null)?.notice ?? null
  )
  const playerRef = useRef<VideoPlayerHandle>(null)
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying)
  useWatchUnmuteDefault(Boolean(player))
  const cloudConfigured = useCloudStore((s) => s.configured)
  const cloudUser = useCloudStore((s) => s.user)
  const { storage, refreshStorage } = useDeriveMatchStorage(matchId, data)
  const [storageBusy, setStorageBusy] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [contextSaving, setContextSaving] = useState(false)

  const runStorage = async (key: string, action: () => Promise<string | null>) => {
    setStorageBusy(key)
    try {
      const message = await action()
      if (message) setNotice(message)
    } catch (err) {
      console.error('[MatchReview] Storage action failed:', err)
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setStorageBusy(null)
      refreshStorage()
    }
  }

  useEffect(() => {
    const incoming = (location.state as RallyEditNotice | null)?.notice
    if (incoming) {
      setNotice(incoming)
      // Drop the notice from history so a refresh doesn't show it again
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  // Details: apply stored video lastModified once when date isn't locked manual
  useEffect(() => {
    if (!matchId || tab !== 'details') return
    let active = true
    applyStoredVideoMatchDateIfNeeded(matchId).then((changed) => {
      if (active && changed) refresh()
    })
    return () => {
      active = false
    }
  }, [matchId, tab, refresh])

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k)
        else next.set(k, v)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const rallyById = useMemo(
    () => new Map((review?.rallies ?? []).map((r) => [r.id, r])),
    [review]
  )

  const selectedSetNumber = useMemo(() => {
    const sets = review?.sets ?? []
    if (sets.some((s) => s.setNumber === rallySetParam)) return rallySetParam
    return (sets.find((s) => s.rallyCount > 0) ?? sets[0])?.setNumber ?? 1
  }, [review, rallySetParam])

  // Load the set video for whatever the player is showing
  const playerRally = player ? player.playlist[player.index] : null
  const playerSetNumber = playerRally?.setNumber ?? null
  useEffect(() => {
    if (!matchId || playerSetNumber === null || playerSetNumber in videoUrls) return
    let active = true
    loadSetVideoUrl(matchId, playerSetNumber)
      .then((url) => {
        if (active) setVideoUrls((v) => ({ ...v, [playerSetNumber]: url }))
      })
      .catch(() => {
        if (active) setVideoUrls((v) => ({ ...v, [playerSetNumber]: null }))
      })
    return () => {
      active = false
    }
  }, [matchId, playerSetNumber, videoUrls])

  const playerVideoUrl = playerSetNumber !== null ? (videoUrls[playerSetNumber] ?? null) : null
  const clipStart = playerRally?.loop
    ? Math.max(
        playerRally.loop.start,
        typeof player?.seekTime === 'number' ? player.seekTime - SHOT_LEAD_SECONDS : playerRally.loop.start
      )
    : null

  // Seek + play whenever the clip changes and the video is ready
  useEffect(() => {
    if (!playerVideoUrl || clipStart === null) return
    const t = setTimeout(() => {
      playerRef.current?.seek(clipStart, true)
      playerRef.current?.play()
    }, 200)
    return () => clearTimeout(t)
  }, [playerVideoUrl, clipStart, playerRally?.id])

  // Legacy ?tab=highlights → Clips Highlights show-reel preset (must stay above early returns)
  useEffect(() => {
    if (searchParams.get('tab') !== 'highlights') return
    setParams({
      tab: 'clips',
      clip: encodeClipFilter({ kind: 'highlights' }),
    })
  }, [searchParams, setParams])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading match…</p>
      </div>
    )
  }

  if (error || notFound || !data || !review || !matchId) {
    return (
      <Card className="p-5 text-center max-w-lg mx-auto border border-border">
        <h2 className="text-lg font-semibold text-neutral-50 mb-1">
          {error ? 'Could not load match' : 'Match not found'}
        </h2>
        {error && <p className="text-sm text-neutral-500 mb-3">{error}</p>}
        <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
          Home
        </Button>
      </Card>
    )
  }

  const multiSet = review.sets.length > 1
  const nextSet =
    review.sets.find((s) => s.status === 'in_progress') ??
    review.sets.find((s) => s.status === 'not_started') ??
    null

  const openTagger = (set: SetPanelModel) =>
    navigate(`/matches/${matchId}/tag?set=${set.setNumber}`)

  const openEditor = (rally: RallyRowModel, opts?: { shotIndex?: number; from?: 'workon' | 'rallies' | 'clips' }) => {
    const q = new URLSearchParams({
      set: String(rally.setNumber),
      rally: String(rally.rallyIndex),
    })
    if (opts?.shotIndex && opts.shotIndex > 0) q.set('shot', String(opts.shotIndex))
    if (opts?.from) q.set('from', opts.from)
    // Prefer mode the rally was saved with (§9 9A); default Pass 1.
    try {
      const raw = localStorage.getItem(`edge-tt-rally-tagging-mode:v1:${rally.id}`)
      if (raw === 'simple' || raw === 'pass1focus') q.set('mode', raw)
    } catch {
      // ignore
    }
    navigate(`/matches/${matchId}/edit-rally?${q.toString()}`)
  }

  const openEvidence = (ref: EvidenceRef) =>
    setEvidence((cur) => (cur?.title === ref.title ? null : ref))

  const watch = (rally: RallyRowModel, playlist: RallyRowModel[], title: string, seekTime?: number) => {
    const index = Math.max(0, playlist.findIndex((r) => r.id === rally.id))
    setPlayer({ playlist, index, title, seekTime })
  }

  const closePlayer = () => {
    playerRef.current?.pause()
    setPlayer(null)
  }

  const toggleHighlight = async (rally: RallyRowModel) => {
    try {
      await setPersistedRallyHighlight(rally.id, !rally.isHighlight)
      refresh()
    } catch (err) {
      console.error('[MatchReview] Highlight toggle failed:', err)
      alert('Could not update highlight')
    }
  }

  const rallyActions: RallyActions = {
    onWatch: (rally, playlist, title) => watch(rally, playlist, title),
    onEdit: (rally) => openEditor(rally, { from: 'rallies' }),
    onToggleHighlight: toggleHighlight,
    onOpenInClips: (rallies, title) => {
      setParams({
        tab: 'clips',
        clip: encodeClipFilter({ kind: 'rallies', rallyIds: rallies.map((r) => r.id) }),
        clipTitle: title,
        from: 'rallies',
      })
    },
    onRetagFrom: async (rally) => {
      const later = (review?.rallies.filter((r) => r.setId === rally.setId && r.rallyIndex > rally.rallyIndex).length ?? 0)
      const what = later > 0 ? `rally ${rally.rallyIndex} and the ${later} after it` : `rally ${rally.rallyIndex}`
      const kept = rally.rallyIndex > 1 ? `\n\nRallies 1–${rally.rallyIndex - 1} are kept.` : ''
      const ok = window.confirm(`Delete ${what} in Set ${rally.setNumber}, then continue tagging from there?${kept}`)
      if (!ok) return
      try {
        await retagFromRally(rally.setId, rally.rallyIndex)
        navigate(`/matches/${matchId}/tag?set=${rally.setNumber}`)
      } catch (err) {
        console.error('[MatchReview] Re-tag failed:', err)
        alert('Could not reset the set from that rally')
      }
    },
  }

  const handleStartOver = async (set: SetPanelModel) => {
    try {
      await startSetOver(set.setId)
      setNotice(`Set ${set.setNumber} cleared. Start tagging when ready.`)
      refresh()
    } catch (err) {
      console.error('[MatchReview] Start over failed:', err)
      alert('Could not clear the set')
    }
  }

  const handleAddSet = async () => {
    try {
      const created = await addNextSet(data.match, data.sets)
      setNotice(`Set ${created.set_number} added.`)
      refresh()
    } catch (err) {
      console.error('[MatchReview] Add set failed:', err)
      alert('Could not add a set')
    }
  }

  const handleSaveContext = async (input: {
    matchDate: string
    player2Id: string | null
    tournamentId: string | null
    round: MatchRound | null
  }) => {
    if (!data) return
    setContextSaving(true)
    const err = await saveMatchContext(data.match, input)
    setContextSaving(false)
    if (err) {
      setNotice(err)
      return
    }
    setNotice('Match context saved.')
    refresh()
  }

  const handleCreateOpponent = async (firstName: string, lastName: string) => {
    if (!data) return
    setContextSaving(true)
    const err = await createAndLinkOpponent(data.match, firstName, lastName)
    setContextSaving(false)
    if (err) {
      setNotice(err)
      return
    }
    setNotice('Opponent linked.')
    refresh()
  }

  const handleCreateTournament = async (name: string) => {
    if (!data) return
    setContextSaving(true)
    const result = await createTournamentForMatch(name, data.match.match_date.slice(0, 10))
    if ('error' in result) {
      setContextSaving(false)
      setNotice(result.error)
      return
    }
    await useMatchStore.getState().update(data.match.id, {
      tournament_id: result.id,
      round: data.match.round,
    })
    await loadTournaments()
    setContextSaving(false)
    setNotice('Tournament added to your match.')
    refresh()
  }

  const handleUseVideoDate = async (date: string) => {
    if (!matchId) return
    setContextSaving(true)
    const err = await applySuggestedVideoDate(matchId, date)
    setContextSaving(false)
    if (err) {
      setNotice(err)
      return
    }
    setNotice('Match date set from video file (last modified).')
    refresh()
  }

  const handleVideoSelect = async (pickedUrl: string) => {
    if (!playerRally) return
    const setNumber = playerRally.setNumber
    try {
      const url = await saveSetVideoFromUrl(matchId, setNumber, pickedUrl)
      if (!url) return
      setVideoUrls((v) => ({ ...v, [setNumber]: url }))
    } catch (err) {
      console.error('[MatchReview] Saving video failed:', err)
      setVideoUrls((v) => ({ ...v, [setNumber]: pickedUrl }))
    }
  }

  const evidenceRallies = evidence
    ? evidence.rallyIds
        .map((id) => rallyById.get(id))
        .filter((r): r is RallyRowModel => Boolean(r))
        .sort((a, b) => a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex)
    : []

  const incompleteCount = review.rallies.filter((r) => r.isIncomplete).length
  const tabs: TabItem<ReviewTab>[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'details', label: 'Details' },
    { id: 'workon', label: 'Work on', badge: review.workOn.hero.total || undefined },
    { id: 'clips', label: 'Clips' },
    { id: 'rallies', label: 'Rallies', badge: incompleteCount || undefined },
  ]

  const storageHandlers = {
    onSignIn: () => navigate('/settings'),
    onBackUpMatch: () =>
      runStorage('match', async () => {
        const result = await backUpMatch(matchId)
        if (result.status === 'conflict') {
          setConflict(true)
          return null
        }
        return 'Match backed up to the cloud.'
      }),
    onKeepDevice: () =>
      runStorage('match', async () => {
        await backUpMatch(matchId, true)
        setConflict(false)
        return 'Cloud copy replaced with this device’s match.'
      }),
    onUseCloud: () =>
      runStorage('match', async () => {
        await replaceWithCloudCopy(matchId)
        setConflict(false)
        refresh()
        return 'This device now has the cloud copy.'
      }),
    onBackUpVideo: (assetId: string) =>
      runStorage(assetId, async () => {
        setUploadPercent(0)
        try {
          await backUpSetVideo(assetId, (sent, total) => setUploadPercent(Math.floor((sent / total) * 100)))
        } finally {
          setUploadPercent(null)
        }
        return 'Video backed up — it can now play on your other devices.'
      }),
    onArchiveVideo: (assetId: string) =>
      runStorage(`archive-${assetId}`, async () => archiveSetVideo(assetId)),
    onRetrieveVideo: (assetId: string) =>
      runStorage(`retrieve-${assetId}`, async () => retrieveSetVideo(assetId)),
    onTrimVideo: (assetId: string, setNumber: number, sourceStart: number, sourceEnd: number) =>
      runStorage(`trim-${assetId}`, async () => trimSetVideo(assetId, setNumber, sourceStart, sourceEnd)),
    onSaveFile: () =>
      runStorage('file', async () => {
        await saveMatchFile(matchId)
        return 'Match file downloaded (tags + metadata). Videos stay on this device or cloud — re-link by asset id on import.'
      }),
  }

  return (
    <div className={cn('space-y-3 transition-[margin]', evidence && 'md:mr-[420px]')}>
      {/* Slim sticky chrome — title + tabs; PlaylistBrowseShell offsets from this node (MA-127). */}
      <header
        data-match-review-chrome
        className="sticky top-0 z-30 -mx-0 bg-bg-surface/95 backdrop-blur border-b border-border px-0 py-1.5 space-y-1.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="tag-control shrink-0"
            aria-label="Back to Home"
          >
            <Icon name="arrow-left" size="sm" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm md:text-base font-semibold text-primary truncate">
              You vs {review.villainName}
            </h1>
            <p className="text-[11px] text-muted truncate">
              <span
                className={cn(
                  'font-medium',
                  review.resultTone === 'good' && 'text-result-winner',
                  review.resultTone === 'bad' && 'text-result-error'
                )}
              >
                {review.resultLabel}
              </span>
            </p>
          </div>
          {/* Phone density: Tag only — Clips live in tabs + bottom nav */}
          {nextSet ? (
            <Button size="sm" onClick={() => openTagger(nextSet)} className="shrink-0 min-h-8 px-2.5">
              <Icon name="play" size="sm" />
              Tag
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0 min-h-8 px-2.5"
              onClick={() => setParams({ tab: 'clips', cat: null })}
              title="Open this match’s Clips tab"
            >
              <Icon name="film" size="sm" />
              Clips
            </Button>
          )}
        </div>
        <TabBarBlock
          tabs={tabs}
          active={tab}
          onChange={(id) => setParams({ tab: id === 'summary' ? null : id, cat: null })}
          onBadgeClick={(id) => {
            if (id !== 'rallies' || incompleteCount <= 0) return
            const first =
              review.rallies.find((r) => r.isIncomplete)?.setNumber ?? selectedSetNumber
            setParams({
              tab: 'rallies',
              rf: 'incomplete',
              s: String(first),
              cat: null,
            })
          }}
        />
      </header>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-1.5 rounded-md border border-result-winner/40 bg-result-winner-bg px-2.5 py-1.5 text-xs text-result-winner sticky top-0 z-20"
        >
          <Icon name="check" size="sm" className="shrink-0" />
          <p className="min-w-0 flex-1 truncate">{notice}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="hover:text-neutral-50">
            <Icon name="x" size="sm" />
          </button>
        </div>
      )}

      {tab === 'details' ? (
        <DetailsSection
          review={review}
          players={players}
          tournaments={tournaments}
          storage={storage}
          signedIn={Boolean(cloudUser)}
          cloudAvailable={cloudConfigured}
          busy={storageBusy}
          uploadPercent={uploadPercent}
          conflict={conflict}
          contextSaving={contextSaving}
          onSaveContext={handleSaveContext}
          onCreateOpponent={handleCreateOpponent}
          onCreateTournament={handleCreateTournament}
          onUseVideoDate={handleUseVideoDate}
          onTag={openTagger}
          onBrowse={(set) => setParams({ tab: 'rallies', s: String(set.setNumber) })}
          onStartOver={handleStartOver}
          onAddSet={handleAddSet}
          {...storageHandlers}
        />
      ) : !review.hasPointData &&
        review.rallies.length === 0 &&
        tab !== 'rallies' ? (
        <Card className="p-3 text-center border border-dashed border-border">
          <h2 className="text-sm font-semibold text-primary">Nothing tagged yet</h2>
          <p className="mt-0.5 text-xs text-muted max-w-sm mx-auto">
            Tag a set — summary and work-on appear as you go.
          </p>
          {nextSet && (
            <Button className="mt-2" size="sm" onClick={() => openTagger(nextSet)}>
              <Icon name="play" size="sm" /> Start Set {nextSet.setNumber}
            </Button>
          )}
        </Card>
      ) : tab === 'summary' ? (
        <SummarySection
          review={review}
          activeEvidenceTitle={evidence?.title ?? null}
          evidenceRallyIds={evidence?.rallyIds ?? null}
          categoryId={categoryId}
          focusId={focusId}
          onSelectCategory={(id) => setParams({ cat: id, tab: null, focus: null })}
          onFocusChange={(id) => setParams({ focus: id })}
          onOpenEvidence={openEvidence}
          onClearEvidence={() => setEvidence(null)}
          activeRallyId={playerRally?.id ?? null}
          onPlayCategoryPlaylist={(title, rallies) => {
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'rallies', rallyIds: rallies.map((r) => r.id) }),
              clipTitle: title,
              from: 'summary',
              cat: null,
              focus: null,
            })
          }}
          onWatchRally={(rally, playlist, title) => watch(rally, playlist, title)}
          onEditRally={openEditor}
          onToggleHighlight={toggleHighlight}
          onOpenDetails={() => setParams({ tab: 'details', cat: null, focus: null })}
          onOpenIncomplete={() => {
            const first =
              review.rallies.find((r) => r.isIncomplete)?.setNumber ?? selectedSetNumber
            setParams({
              tab: 'rallies',
              rf: 'incomplete',
              s: String(first),
              cat: null,
              focus: null,
            })
          }}
        />
      ) : tab === 'workon' ? (
        <WorkOnSection
          workOn={review.workOn}
          heroName={review.heroName}
          villainName={review.villainName}
          activeEvidenceTitle={evidence?.title ?? null}
          onOpenEvidence={openEvidence}
          onWatchItem={(item, pattern) => {
            // Insight → playlist: open Clips on this pattern, landed on the shot.
            const side =
              [...review.workOn.hero.technical, ...review.workOn.hero.tactical].some((p) => p.key === pattern.key)
                ? 'hero'
                : 'villain'
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({
                kind: 'review',
                side,
                reviewKind: pattern.reviewKind,
                ...(pattern.wing ? { wing: pattern.wing } : {}),
                ...(pattern.stroke ? { stroke: pattern.stroke } : {}),
              }),
              clipTitle: `${pattern.title} · ${pattern.kindLabel}`,
              from: 'workon',
              at: item.shotId,
            })
          }}
          onEditItem={(item) => {
            const rally = rallyById.get(item.rallyId)
            if (rally) openEditor(rally, { shotIndex: item.shotIndex, from: 'workon' })
          }}
          onPlayPlaylist={(pattern) => {
            const side =
              [...review.workOn.hero.technical, ...review.workOn.hero.tactical].some((p) => p.key === pattern.key)
                ? 'hero'
                : 'villain'
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({
                kind: 'review',
                side,
                reviewKind: pattern.reviewKind,
                ...(pattern.wing ? { wing: pattern.wing } : {}),
                ...(pattern.stroke ? { stroke: pattern.stroke } : {}),
              }),
              clipTitle: `${pattern.title} · ${pattern.kindLabel}`,
              from: 'workon',
              at: null,
            })
          }}
          onOpenErrorsPlaylist={() =>
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'errors', side: 'hero' }),
              clipTitle: `${review.heroName} · errors`,
              from: 'workon',
              at: null,
            })
          }
          onOpenHighlights={() =>
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'highlights' }),
              clipTitle: 'Highlights',
              from: 'workon',
              at: null,
            })
          }
        />
      ) : tab === 'clips' ? (
        <ClipsComposer matchId={matchId} embedded />
      ) : (
        <RalliesSection
          sets={review.sets}
          selectedSetNumber={selectedSetNumber}
          onSelectSet={(n) => setParams({ s: String(n) })}
          rallies={review.rallies}
          filter={filter}
          onFilterChange={(next) => {
            setFilter(next)
            setParams({ rf: next === 'incomplete' ? 'incomplete' : null })
          }}
          heroName={review.heroName}
          actions={rallyActions}
          onTagSet={openTagger}
        />
      )}

      {evidence && (
        <EvidenceDrawerBlock
          title={evidence.title}
          subtitle={evidence.subtitle}
          count={evidenceRallies.length}
          canPlayAll={evidenceRallies.length > 1}
          playlistHint={
            categoryId === 'B' || categoryId === 'C'
              ? 'Focus playlist below is synced — watch there or open Clips'
              : null
          }
          onPlayAll={() => {
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'rallies', rallyIds: evidenceRallies.map((r) => r.id) }),
              clipTitle: evidence.title,
              from: 'summary',
            })
            setEvidence(null)
          }}
          onClose={() => setEvidence(null)}
        >
          {evidenceRallies.map((r) => (
            <RallyRowBlock
              key={r.id}
              rally={r}
              heroName={review.heroName}
              showSet={multiSet}
              active={playerRally?.id === r.id}
              onWatch={(rally) => watch(rally, evidenceRallies, evidence.title)}
              onEdit={openEditor}
              onToggleHighlight={toggleHighlight}
            />
          ))}
        </EvidenceDrawerBlock>
      )}

      {player && playerRally && review && (
        <RallyPlayerBlock
          ref={playerRef}
          rally={playerRally}
          position={player.index}
          total={player.playlist.length}
          playlistTitle={player.title}
          videoUrl={playerVideoUrl}
          loop={playerRally.loop}
          isPlaying={isPlaying}
          heroName={review.heroName}
          villainName={review.villainName}
          player1Sets={review.sets.reduce(
            (n, s) => n + (s.setNumber < playerRally.setNumber && s.heroWon === true ? 1 : 0),
            0
          )}
          player2Sets={review.sets.reduce(
            (n, s) => n + (s.setNumber < playerRally.setNumber && s.heroWon === false ? 1 : 0),
            0
          )}
          onVideoSelect={handleVideoSelect}
          onTogglePlay={() => playerRef.current?.togglePlay()}
          onReplay={() => {
            if (clipStart !== null) {
              playerRef.current?.seek(clipStart, true)
              playerRef.current?.play()
            }
          }}
          onPrev={() => setPlayer((p) => (p && p.index > 0 ? { ...p, index: p.index - 1, seekTime: undefined } : p))}
          onNext={() =>
            setPlayer((p) =>
              p && p.index < p.playlist.length - 1 ? { ...p, index: p.index + 1, seekTime: undefined } : p
            )
          }
          onEdit={() => openEditor(playerRally)}
          onClose={closePlayer}
        />
      )}
    </div>
  )
}
