/**
 * MatchReviewComposer — Match Review page (route: /matches/:id)
 *
 * First-person hub for a match (hero / player1):
 *   Summary · Details · Work on · Clips · Highlights · Rallies
 * Summary = narrative + story; Details = result, sets, storage.
 * Every number opens its evidence; every rally can be watched or edited.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Icon, type VideoPlayerHandle } from '@/ui-mine'
import { useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
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
import { HighlightsSection, type RallyActions } from '../sections/HighlightsSection'
import { RalliesSection, type RallyFilter } from '../sections/RalliesSection'
import { ClipsComposer } from '@/features/clips'
import { encodeClipFilter } from '@/rules/derive/clips/deriveClips'
import {
  addNextSet,
  applyStoredVideoMatchDateIfNeeded,
  applySuggestedVideoDate,
  backUpMatch,
  backUpSetVideo,
  createAndLinkOpponent,
  createTournamentForMatch,
  loadSetVideoUrl,
  replaceWithCloudCopy,
  saveMatchContext,
  saveMatchFile,
  saveSetVideoFromUrl,
  retagFromRally,
  startSetOver,
} from './matchReviewActions'
import { useDeriveMatchStorage } from '../derive/useDeriveMatchStorage'
import { useCloudStore } from '@/stores/cloudStore'
import { useMatchStore, usePlayerStore, useTournamentStore, type MatchRound } from '@/data'
import type { EvidenceRef, RallyRowModel, SetPanelModel } from '../models'

type ReviewTab = 'summary' | 'details' | 'workon' | 'clips' | 'highlights' | 'rallies'
const TABS: ReviewTab[] = ['summary', 'details', 'workon', 'clips', 'highlights', 'rallies']

function resolveReviewTab(param: string | null): ReviewTab {
  if (param === 'overview') return 'summary' // legacy URL
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

  const tab = resolveReviewTab(searchParams.get('tab'))
  const categoryId = searchParams.get('cat')
  const rallySetParam = Number(searchParams.get('s'))

  const [filter, setFilter] = useState<RallyFilter>('all')
  const [evidence, setEvidence] = useState<EvidenceRef | null>(null)
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [videoUrls, setVideoUrls] = useState<Record<number, string | null>>({})
  const [notice, setNotice] = useState<string | null>(
    (location.state as RallyEditNotice | null)?.notice ?? null
  )
  const playerRef = useRef<VideoPlayerHandle>(null)
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading match…</p>
      </div>
    )
  }

  if (error || notFound || !data || !review || !matchId) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-neutral-50 mb-2">
          {error ? 'Could not load match' : 'Match not found'}
        </h2>
        {error && <p className="text-sm text-neutral-400 mb-4">{error}</p>}
        <Button variant="secondary" onClick={() => navigate('/matches')}>
          Back to Matches
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
    navigate(`/matches/${matchId}/tag?set=${set.setNumber}&mode=pass1focus`)

  const openEditor = (rally: RallyRowModel) =>
    navigate(`/matches/${matchId}/edit-rally?set=${rally.setNumber}&rally=${rally.rallyIndex}`)

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
    onEdit: openEditor,
    onToggleHighlight: toggleHighlight,
    onRetagFrom: async (rally) => {
      const later = (review?.rallies.filter((r) => r.setId === rally.setId && r.rallyIndex > rally.rallyIndex).length ?? 0)
      const what = later > 0 ? `rally ${rally.rallyIndex} and the ${later} after it` : `rally ${rally.rallyIndex}`
      const kept = rally.rallyIndex > 1 ? `\n\nRallies 1–${rally.rallyIndex - 1} are kept.` : ''
      const ok = window.confirm(`Delete ${what} in Set ${rally.setNumber}, then continue tagging from there?${kept}`)
      if (!ok) return
      try {
        await retagFromRally(rally.setId, rally.rallyIndex)
        navigate(`/matches/${matchId}/tag?set=${rally.setNumber}&mode=pass1focus`)
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

  const tabs: TabItem<ReviewTab>[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'details', label: 'Details' },
    { id: 'workon', label: 'Work on', badge: review.workOn.hero.total },
    { id: 'clips', label: 'Clips' },
    { id: 'highlights', label: 'Highlights', badge: review.highlights.flagged.length },
    { id: 'rallies', label: 'Rallies', badge: review.rallies.length },
  ]

  const toRows = (ids: string[]) =>
    ids.map((id) => rallyById.get(id)).filter((r): r is RallyRowModel => Boolean(r))

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
    onSaveFile: () => runStorage('file', async () => (await saveMatchFile(matchId), null)),
  }

  return (
    <div className={cn('space-y-6 transition-[margin]', evidence && 'md:mr-[420px]')}>
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => navigate('/matches')}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          <Icon name="arrow-left" size="sm" />
          Matches
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-50">
              You vs {review.villainName}
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              <span className="text-neutral-300">{review.heroName}</span>
              <span className="mx-2 text-neutral-600">·</span>
              <span
                className={cn(
                  'font-medium',
                  review.resultTone === 'good' && 'text-result-winner',
                  review.resultTone === 'bad' && 'text-result-error',
                  review.resultTone === 'info' && 'text-neutral-200'
                )}
              >
                {review.resultLabel}
              </span>
            </p>
          </div>
          {nextSet && (
            <Button onClick={() => openTagger(nextSet)}>
              <Icon name="play" size="sm" />
              {nextSet.status === 'in_progress' ? 'Continue tagging' : 'Start tagging'}
              {multiSet && ` Set ${nextSet.setNumber}`}
            </Button>
          )}
        </div>
      </header>

      {notice && (
        <div className="flex items-start gap-3 rounded-lg border border-result-winner/60 bg-result-winner-bg px-4 py-3 text-sm text-result-winner">
          <Icon name="check" size="sm" className="mt-0.5 text-result-winner" />
          <span className="flex-1">{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="text-result-winner hover:text-neutral-50">
            <Icon name="x" size="sm" />
          </button>
        </div>
      )}

      <TabBarBlock
        tabs={tabs}
        active={tab}
        onChange={(id) => setParams({ tab: id === 'summary' ? null : id, cat: null })}
      />

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
      ) : !review.hasPointData && tab !== 'rallies' ? (
        <Card className="p-8 text-center border border-dashed border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-50">Nothing tagged yet</h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-md mx-auto">
            Tag a set with Pass 1 — tap each contact, mark the first attack and how the point ended. Your match story,
            highlights and things to work on appear here as you go.
          </p>
          {nextSet && (
            <Button className="mt-4" onClick={() => openTagger(nextSet)}>
              <Icon name="play" size="sm" /> Start tagging Set {nextSet.setNumber}
            </Button>
          )}
        </Card>
      ) : tab === 'summary' ? (
        <SummarySection
          review={review}
          activeEvidenceTitle={evidence?.title ?? null}
          categoryId={categoryId}
          onSelectCategory={(id) => setParams({ cat: id, tab: null })}
          onOpenEvidence={openEvidence}
          activeRallyId={playerRally?.id ?? null}
          onPlayCategoryPlaylist={(title, rallies) => {
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'rallies', rallyIds: rallies.map((r) => r.id) }),
              clipTitle: title,
              cat: null,
            })
          }}
          onWatchRally={(rally, playlist, title) => watch(rally, playlist, title)}
          onEditRally={openEditor}
          onToggleHighlight={toggleHighlight}
        />
      ) : tab === 'workon' ? (
        <WorkOnSection
          workOn={review.workOn}
          heroName={review.heroName}
          villainName={review.villainName}
          activeEvidenceTitle={evidence?.title ?? null}
          onOpenEvidence={openEvidence}
          onWatchItem={(item, pattern) => {
            const playlist = pattern.items
              .map((i) => rallyById.get(i.rallyId))
              .filter((r): r is RallyRowModel => Boolean(r))
            const rally = rallyById.get(item.rallyId)
            if (rally) watch(rally, playlist, `${pattern.title} · ${pattern.kindLabel}`, item.seekTime)
          }}
          onEditItem={(item) => {
            const rally = rallyById.get(item.rallyId)
            if (rally) openEditor(rally)
          }}
        />
      ) : tab === 'clips' ? (
        <ClipsComposer matchId={matchId} embedded />
      ) : tab === 'highlights' ? (
        <HighlightsSection
          flagged={toRows(review.highlights.flagged)}
          longest={toRows(review.highlights.longest)}
          heroName={review.heroName}
          multiSet={multiSet}
          actions={rallyActions}
        />
      ) : (
        <RalliesSection
          sets={review.sets}
          selectedSetNumber={selectedSetNumber}
          onSelectSet={(n) => setParams({ s: String(n) })}
          rallies={review.rallies}
          filter={filter}
          onFilterChange={setFilter}
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
          onPlayAll={() => {
            setParams({
              tab: 'clips',
              clip: encodeClipFilter({ kind: 'rallies', rallyIds: evidenceRallies.map((r) => r.id) }),
              clipTitle: evidence.title,
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

      {player && playerRally && (
        <RallyPlayerBlock
          ref={playerRef}
          rally={playerRally}
          position={player.index}
          total={player.playlist.length}
          playlistTitle={player.title}
          videoUrl={playerVideoUrl}
          loop={playerRally.loop}
          isPlaying={isPlaying}
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
