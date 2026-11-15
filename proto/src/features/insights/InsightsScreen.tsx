import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { WfBadge, WfEmpty } from '@/layout/Wireframe'
import {
  derivePhase,
  hasTaggedRallies,
  taggedSetIds,
  useDemo,
  type MatchRecord,
} from '@/data/demoStore'
import { filterMatches, useInsightsFilterValues } from '@/features/insights/insightsFilterContext'
import { hasPlayableRallies, matchLabel } from '@/features/match/matchChecks'

export type InsightsScope = 'global' | 'match'
export type SectionId = 'summary' | 'serve' | 'receive' | 'improve'

const GLOBAL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'serve', label: 'Serve' },
  { id: 'receive', label: 'Receive' },
  { id: 'improve', label: 'Improve' },
]

const MATCH_SECTIONS = GLOBAL_SECTIONS.filter((s) => s.id !== 'improve')

type Reel = { id: string; title: string; meta: string }

type ImproveItem = {
  rank: number
  title: string
  why: string
  reel: Reel
}

function countOf(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Saved rallies in the sets that were filmed. */
function pointsIn(matches: MatchRecord[]): number {
  return matches.reduce(
    (n, m) => n + m.sets.reduce((k, s) => k + (s.skipped ? 0 : s.rallies.length), 0),
    0
  )
}

/**
 * Stub numbers and reels. What is real: the matches covered, their point
 * count, and the name on each reel, so a filter visibly changes the page.
 */
function sectionData(
  section: SectionId,
  scope: InsightsScope,
  /** What the reels are cut from: a match title, "All matches" or "2 matches". */
  prefix: string,
  /** Global only: the matches the numbers cover. */
  covered: MatchRecord[]
): { stats: string; reels: Reel[]; improve?: ImproveItem[] } {
  const matchCount = countOf(covered.length, 'match', 'matches')

  if (section === 'summary') {
    return {
      stats:
        scope === 'match'
          ? 'FA 58% · 12 winners'
          : `${countOf(pointsIn(covered), 'point', 'points')} · FA 54%`,
      reels: [
        { id: 'sum-1', title: 'Highlight', meta: `${prefix} · 8 points` },
        { id: 'sum-2', title: 'Key winners', meta: `${prefix} · 5 points` },
      ],
    }
  }
  if (section === 'serve') {
    return {
      stats:
        scope === 'match'
          ? '1st in 64% · short 3 · long 7'
          : '1st in 62% · short 4 · long 9 · fault 3%',
      reels: [
        { id: 'srv-1', title: 'Serve +1', meta: `${prefix} · 6 points` },
        { id: 'srv-2', title: 'Serve faults', meta: `${prefix} · 2 points` },
        { id: 'srv-3', title: 'Long serve hold', meta: `${prefix} · 4 points` },
      ],
    }
  }
  if (section === 'receive') {
    return {
      stats:
        scope === 'match'
          ? 'Short miss 2 · deep hold 5'
          : 'Short miss 6 · deep hold 11 · flick 4',
      reels: [
        { id: 'rcv-1', title: 'Short receive', meta: `${prefix} · 6 points` },
        { id: 'rcv-2', title: 'Flick return', meta: `${prefix} · 3 points` },
        { id: 'rcv-3', title: 'Deep push', meta: `${prefix} · 5 points` },
      ],
    }
  }
  const improve: ImproveItem[] = [
    {
      rank: 1,
      title: 'Short-ball receive',
      why: `6 misses · ${matchCount}`,
      reel: {
        id: 'imp-1',
        title: 'Short-ball receive',
        meta: `18 points · ${prefix}`,
      },
    },
    {
      rank: 2,
      title: 'Push depth on BH',
      why: '9 floats long',
      reel: { id: 'imp-2', title: 'Push depth on BH', meta: '9 points' },
    },
    {
      rank: 3,
      title: 'Serve variation',
      why: 'Same long serve 71%',
      reel: { id: 'imp-3', title: 'Serve variation', meta: '11 points' },
    },
  ]
  return {
    stats: 'Ranked work-ons this week',
    reels: improve.map((i) => i.reel),
    improve,
  }
}

/** Segmented pills inside page content (not header tabs). */
export function SectionPills({
  sections,
  section,
  basePath,
}: {
  sections: { id: SectionId; label: string }[]
  section: SectionId
  basePath: string
}) {
  const navigate = useNavigate()
  return (
    <div
      className="inline-flex flex-nowrap gap-1 p-1 rounded-lg bg-bg-elevated border border-border"
      role="tablist"
      aria-label="Insight sections"
    >
      {sections.map((s) => {
        const active = s.id === section
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => navigate(`${basePath}/${s.id}`)}
            className={cn(
              'shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
              active
                ? 'bg-bg-surface text-brand-primary shadow-sm border border-border'
                : 'text-muted hover:text-primary border border-transparent'
            )}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionBody({
  section,
  scope,
  match,
}: {
  section: SectionId
  scope: InsightsScope
  match?: MatchRecord
}) {
  const navigate = useNavigate()
  const { matches } = useDemo()
  const filters = useInsightsFilterValues()
  const [playingId, setPlayingId] = useState<string | null>(null)

  // Global: the tagged matches the filter keeps, and those that can still play.
  const tagged = matches.filter(hasTaggedRallies)
  const covered = scope === 'global' ? filterMatches(tagged, filters) : []
  const playable = scope === 'global' ? covered.filter(hasPlayableRallies) : []
  // Reels are cut from the matches that still have their video.
  const inReels = playable.length > 0 ? playable : covered
  const prefix =
    scope === 'match' && match
      ? matchLabel(match)
      : inReels.length === 1
        ? matchLabel(inReels[0])
        : inReels.length === tagged.length
          ? 'All matches'
          : countOf(inReels.length, 'match', 'matches')
  const data = sectionData(section, scope, prefix, covered)

  useEffect(() => {
    setPlayingId(null)
  }, [section])

  if (scope === 'match' && match) {
    const tagged = taggedSetIds(match)
    if (tagged.length === 0) {
      const phase = derivePhase(match)
      return (
        <div className="space-y-3">
          <WfEmpty
            title="Nothing tagged yet"
            body={
              phase === 'new'
                ? 'Add the video in Tag to start.'
                : 'Tag a rally to see insights for this match.'
            }
          />
          <Button onClick={() => navigate(`/matches/${match.id}/tag`)}>Go to Tag</Button>
        </div>
      )
    }
  }

  if (scope === 'global' && covered.length === 0) {
    return <WfEmpty title="Nothing fits this filter" body="Remove a filter to see insights." />
  }

  // A match whose video was removed keeps its numbers, but nothing can play.
  const videoGone =
    scope === 'match'
      ? match !== undefined && hasTaggedRallies(match) && !hasPlayableRallies(match)
      : playable.length === 0
  const playing = videoGone ? null : (data.reels.find((r) => r.id === playingId) ?? null)
  const noVideo = covered.length - playable.length

  return (
    <div className="space-y-4">
      {scope === 'match' && match && taggedSetIds(match).length > 0 ? (
        <p className="text-xs text-muted">
          Covers set {taggedSetIds(match).join(', set ')}.
        </p>
      ) : null}
      {scope === 'global' ? (
        <p className="text-xs text-muted">
          Covers{' '}
          {covered.length === tagged.length
            ? countOf(covered.length, 'match', 'matches')
            : `${covered.length} of ${countOf(tagged.length, 'match', 'matches')}`}
          .
          {noVideo > 0 && !videoGone
            ? ` ${noVideo} ${noVideo === 1 ? 'has' : 'have'} no video, so ${noVideo === 1 ? 'it is' : 'they are'} left out of reels.`
            : ''}
        </p>
      ) : null}

      <Card className="space-y-3">
        <CardDescription>{data.stats}</CardDescription>

        {videoGone && match ? (
          <p className="rounded-md border border-dashed border-border bg-bg-card px-3 py-2 text-sm text-primary">
            The video was removed, so these reels cannot play.{' '}
            <Link to={`/matches/${match.id}/details`} className="font-semibold text-brand underline">
              Add it back in Details
            </Link>
            .
          </p>
        ) : null}
        {videoGone && scope === 'global' ? (
          <p className="rounded-md border border-dashed border-border bg-bg-card px-3 py-2 text-sm text-primary">
            {covered.length === 1 ? 'This match has' : 'These matches have'} no video, so reels
            cannot play.
          </p>
        ) : null}

        {playing ? (
          <div className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">Reel · {playing.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setPlayingId(null)}>
                Close
              </Button>
            </div>
            <div className="max-h-48 md:max-h-56 w-full rounded-md border border-dashed border-border flex items-center justify-center bg-bg-elevated">
              <div className="text-center space-y-1 py-6 px-4">
                <Icon name="film" size="lg" className="mx-auto text-muted" />
                <p className="text-sm text-muted">Player stub</p>
                <p className="text-xs text-muted">{playing.meta}</p>
              </div>
            </div>
          </div>
        ) : null}

        {section === 'improve' && data.improve ? (
          <ol className="space-y-3">
            {data.improve.map((item) => (
              <li
                key={item.reel.id}
                className="rounded-md border border-border bg-bg-card px-3 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      {item.rank}. {item.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{item.why}</p>
                  </div>
                  <WfBadge>work on</WfBadge>
                </div>
                {videoGone ? null : (
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" onClick={() => setPlayingId(item.reel.id)}>
                      <Icon name="play" size="xs" />
                      Play evidence
                    </Button>
                    <Button size="sm" variant="secondary" disabled>
                      <Icon name="download" size="xs" />
                      Download
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-2">
            {data.reels.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5">{r.meta}</p>
                </div>
                {videoGone ? null : (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" onClick={() => setPlayingId(r.id)}>
                      <Icon name="play" size="xs" />
                      Play
                    </Button>
                    <Button size="sm" variant="secondary" disabled>
                      <Icon name="download" size="xs" />
                      Download
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {videoGone ? null : (
          <Button size="sm" variant="secondary" disabled>
            <Icon name="download" size="xs" />
            Download all
          </Button>
        )}
      </Card>
    </div>
  )
}

export function InsightsScreen({
  scope,
  matchId,
  section,
  basePath,
  chrome = 'full',
}: {
  scope: InsightsScope
  matchId?: string
  section: SectionId
  basePath: string
  /** full = pills + body (match). body = content only (global chrome on InsightsPage). */
  chrome?: 'full' | 'body'
}) {
  const { getMatch } = useDemo()
  const match = matchId ? getMatch(matchId) : undefined
  const sections = scope === 'global' ? GLOBAL_SECTIONS : MATCH_SECTIONS

  if (scope === 'match' && !match) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="Match not found" body="Return to Home." />
        <div className="mt-3">
          <Link to="/home" className="text-sm font-semibold text-brand">
            Home
          </Link>
        </div>
      </div>
    )
  }

  if (chrome === 'body') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <SectionBody key={section} section={section} scope={scope} match={match} />
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <SectionPills sections={sections} section={section} basePath={basePath} />
      </div>
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <SectionBody key={section} section={section} scope={scope} match={match} />
      </div>
    </div>
  )
}

export function InsightsSectionRoute({
  scope,
  chrome = 'full',
}: {
  scope: InsightsScope
  chrome?: 'full' | 'body'
}) {
  const { matchId, section = 'summary' } = useParams()
  const base = scope === 'global' ? '/insights' : `/matches/${matchId}/insights`
  const allowed =
    scope === 'global'
      ? ['summary', 'serve', 'receive', 'improve']
      : ['summary', 'serve', 'receive']
  const safe = (allowed.includes(section) ? section : 'summary') as SectionId
  return (
    <InsightsScreen
      scope={scope}
      matchId={matchId}
      section={safe}
      basePath={base}
      chrome={chrome}
    />
  )
}
