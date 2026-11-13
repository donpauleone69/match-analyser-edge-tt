/**
 * HomeComposer — landing: what's left to tag, recent matches, clip shortcuts.
 */

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { useDeriveClipLibrary } from '@/features/clips'
import { useCloudStore } from '@/stores/cloudStore'
import { useDeriveHome } from '../derive/useDeriveHome'
import { ContinueTaggingBlock } from '../blocks/ContinueTaggingBlock'
import { ContextPolishBlock } from '../blocks/ContextPolishBlock'
import { HomeMatchRowBlock } from '../blocks/HomeMatchRowBlock'
import { ClipShortcutsBlock, type ClipShortcut } from '../blocks/ClipShortcutsBlock'

const SHORTCUT_LIMIT = 6

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-700 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function HomeComposer() {
  const navigate = useNavigate()
  const { home, isLoading } = useDeriveHome()
  const { data: clips } = useDeriveClipLibrary(null)
  const cloudConfigured = useCloudStore((s) => s.configured)
  const cloudUser = useCloudStore((s) => s.user)

  const shortcuts = useMemo<ClipShortcut[]>(
    () =>
      (clips?.groups ?? [])
        .flatMap((g) => g.presets)
        .slice(0, SHORTCUT_LIMIT)
        .map((p) => ({ key: p.key, label: p.label, count: p.count })),
    [clips]
  )

  const openMatch = (matchId: string) => navigate(`/matches/${matchId}`)
  const openDetails = (matchId: string) => navigate(`/matches/${matchId}?tab=details`)

  if (isLoading || !home) {
    return <p className="p-6 text-neutral-400">Loading…</p>
  }

  const outstandingLabel =
    home.outstandingCount === 0
      ? null
      : home.outstandingCount === 1
        ? '1 match left to finish'
        : `${home.outstandingCount} matches left to finish`

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50">Home</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Continue tagging, find matches, open playlists.
          </p>
          {outstandingLabel ? (
            <p className="text-sm text-amber-300/90 mt-1">{outstandingLabel}</p>
          ) : home.totals.matches > 0 ? (
            <p className="text-sm text-neutral-500 mt-1">
              {home.totals.matches} matches · {home.totals.rallies} rallies tagged
            </p>
          ) : null}
        </div>
        <Button onClick={() => navigate('/matches/create')}>
          <Icon name="plus" size="sm" /> New match
        </Button>
      </header>

      {home.totals.matches === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-700 p-8 text-center space-y-3">
          <p className="text-neutral-200 font-medium">No matches yet</p>
          <p className="text-sm text-neutral-400">
            Create a match (opponent optional), load the video, and tap each contact. Review and
            playlists build from your tags.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button onClick={() => navigate('/matches/create')}>
              <Icon name="plus" size="sm" /> Create your first match
            </Button>
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              <Icon name="search" size="sm" /> Find matches
            </Button>
            <Button variant="secondary" onClick={() => navigate('/settings')}>
              <Icon name="file-up" size="sm" /> Import match file
            </Button>
            {cloudConfigured && (
              <Button variant="secondary" onClick={() => navigate('/settings')}>
                <Icon name="cloud-download" size="sm" /> Restore from cloud
              </Button>
            )}
          </div>
        </section>
      ) : (
        <>
          {home.continueItems.length > 0 && (
            <Panel
              title="What's left"
              action={
                home.outstandingCount > home.continueItems.length ? (
                  <Link to="/matches" className="text-sm text-brand-primary hover:underline">
                    See all
                  </Link>
                ) : null
              }
            >
              <div className="space-y-2">
                {home.continueItems.map((item) => (
                  <ContinueTaggingBlock
                    key={`${item.matchId}-${item.setNumber}`}
                    item={item}
                    onReview={openMatch}
                    onContinue={(i) => {
                      if (i.kind === 'fix_incomplete') {
                        navigate(
                          `/matches/${i.matchId}?tab=rallies&s=${i.setNumber}&rf=incomplete`
                        )
                        return
                      }
                      navigate(
                        `/matches/${i.matchId}/tag?set=${i.setNumber}`
                      )
                    }}
                  />
                ))}
              </div>
            </Panel>
          )}

          {home.contextItems.length > 0 && (
            <Panel title="Add context (optional)">
              <p className="text-xs text-neutral-500 -mt-1">
                Name an opponent or tournament when you want Clips filters. Skip anytime.
              </p>
              <div className="space-y-2">
                {home.contextItems.map((item) => (
                  <ContextPolishBlock
                    key={`${item.matchId}-${item.missing}`}
                    item={item}
                    onOpenDetails={openDetails}
                  />
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title="Recent matches"
            action={
              <Link to="/matches" className="text-sm text-brand-primary hover:underline">
                Find matches
              </Link>
            }
          >
            <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
              {home.recent.map((m) => (
                <HomeMatchRowBlock key={m.matchId} match={m} onOpen={openMatch} />
              ))}
            </ul>
          </Panel>

          {shortcuts.length > 0 && (
            <Panel
              title="Watch"
              action={
                <Link to="/clips" className="text-sm text-brand-primary hover:underline">
                  All playlists
                </Link>
              }
            >
              <ClipShortcutsBlock
                shortcuts={shortcuts}
                reelCount={clips?.reels.length ?? 0}
                onOpen={(key) => navigate(key ? `/clips?clip=${encodeURIComponent(key)}` : '/clips')}
              />
            </Panel>
          )}

          <p className="text-sm text-neutral-400 flex items-center gap-2 flex-wrap">
            <Icon name="hard-drive" size="sm" />
            Matches live on this device.
            <Link to="/settings" className="text-brand-primary hover:underline">
              Import a match file
            </Link>
            {cloudConfigured && !cloudUser && (
              <>
                <span className="text-neutral-600">·</span>
                <Link to="/settings" className="text-brand-primary hover:underline">
                  Sign in to back up
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
