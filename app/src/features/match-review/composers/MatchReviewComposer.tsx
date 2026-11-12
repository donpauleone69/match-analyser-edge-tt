/**
 * MatchReviewComposer — Match Review page (route: /matches/:id)
 *
 * The player-facing hub for a match:
 *   Overview (takeaways + comparison cards) · Work on · Highlights · Rallies
 * Every number opens its evidence (the rallies behind it); every rally can be
 * watched (if the set video is on this device) or edited on its own.
 * Sets and their tagging actions live in the header panel.
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
import { OverviewSection } from '../sections/OverviewSection'
import { WorkOnSection } from '../sections/WorkOnSection'
import { HighlightsSection, type RallyActions } from '../sections/HighlightsSection'
import { RalliesSection, type RallyFilter } from '../sections/RalliesSection'
import { SetsPanelSection } from '../sections/SetsPanelSection'
import {
  addNextSet,
  loadSetVideoUrl,
  saveSetVideoFromUrl,
  startSetOver,
} from './matchReviewActions'
import type { EvidenceRef, RallyRowModel, SetPanelModel } from '../models'

type ReviewTab = 'overview' | 'workon' | 'highlights' | 'rallies'
const TABS: ReviewTab[] = ['overview', 'workon', 'highlights', 'rallies']

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

  const tabParam = searchParams.get('tab') as ReviewTab | null
  const tab: ReviewTab = tabParam && TABS.includes(tabParam) ? tabParam : 'overview'
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

  useEffect(() => {
    const incoming = (location.state as RallyEditNotice | null)?.notice
    if (incoming) {
      setNotice(incoming)
      // Drop the notice from history so a refresh doesn't show it again
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

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
    { id: 'overview', label: 'Overview' },
    { id: 'workon', label: 'Work on', badge: review.workOn.hero.total },
    { id: 'highlights', label: 'Highlights', badge: review.highlights.flagged.length },
    { id: 'rallies', label: 'Rallies', badge: review.rallies.length },
  ]

  const toRows = (ids: string[]) =>
    ids.map((id) => rallyById.get(id)).filter((r): r is RallyRowModel => Boolean(r))

  return (
    <div className={cn('space-y-6 transition-[margin]', evidence && 'md:mr-[420px]')}>
      <header className="space-y-4">
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
              {review.heroName} <span className="text-neutral-500 font-normal">vs</span> {review.villainName}
            </h1>
            <p className="mt-1 text-sm md:text-base text-neutral-400">
              <span
                className={cn(
                  'font-semibold',
                  review.resultTone === 'good' && 'text-emerald-400',
                  review.resultTone === 'bad' && 'text-rose-400',
                  review.resultTone === 'info' && 'text-neutral-200'
                )}
              >
                {review.resultLabel}
              </span>
              <span className="mx-2 text-neutral-600">·</span>
              {review.dateLabel}
              {review.totalPoints > 0 && (
                <>
                  <span className="mx-2 text-neutral-600">·</span>
                  {review.totalPoints} points tagged
                </>
              )}
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

        <SetsPanelSection
          sets={review.sets}
          onTag={openTagger}
          onBrowse={(set) => setParams({ tab: 'rallies', s: String(set.setNumber) })}
          onStartOver={handleStartOver}
          onAddSet={handleAddSet}
        />
      </header>

      {notice && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          <Icon name="check" size="sm" className="mt-0.5 text-emerald-400" />
          <span className="flex-1">{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="text-emerald-300 hover:text-emerald-50">
            <Icon name="x" size="sm" />
          </button>
        </div>
      )}

      <TabBarBlock tabs={tabs} active={tab} onChange={(id) => setParams({ tab: id === 'overview' ? null : id })} />

      {!review.hasPointData && tab !== 'rallies' ? (
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
      ) : tab === 'overview' ? (
        <OverviewSection review={review} activeEvidenceTitle={evidence?.title ?? null} onOpenEvidence={openEvidence} />
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
          onPlayAll={() => watch(evidenceRallies[0], evidenceRallies, evidence.title)}
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
