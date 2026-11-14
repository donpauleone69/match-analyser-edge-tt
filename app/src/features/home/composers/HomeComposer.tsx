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
    <section className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
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
        ? '1 left to finish'
        : `${home.outstandingCount} left to finish`

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-5 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-neutral-50">Home</h1>
          {outstandingLabel ? (
            <p className="text-sm text-callout-warning mt-0.5">{outstandingLabel}</p>
          ) : home.totals.matches > 0 ? (
            <p className="text-sm text-neutral-500 mt-0.5 tabular-nums">
              {home.totals.matches} matches · {home.totals.rallies} rallies
            </p>
          ) : null}
        </div>
        <Button size="sm" onClick={() => navigate('/matches/create')}>
          <Icon name="plus" size="sm" /> New match
        </Button>
      </header>

      {home.totals.matches === 0 ? (
        <section className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
          <p className="text-neutral-100 font-medium">No matches yet</p>
          <p className="text-sm text-neutral-500">Create a match, load video, tap contacts.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => navigate('/matches/create')}>
              <Icon name="plus" size="sm" /> New match
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/matches')}>
              <Icon name="search" size="sm" /> Find
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
              <Icon name="file-up" size="sm" /> Import
            </Button>
            {cloudConfigured && (
              <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
                <Icon name="cloud-download" size="sm" /> Cloud
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
                      navigate(`/matches/${i.matchId}/tag?set=${i.setNumber}`)
                    }}
                  />
                ))}
              </div>
            </Panel>
          )}

          {home.contextItems.length > 0 && (
            <Panel title="Context (optional)">
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
            title="Recent"
            action={
              <Link to="/matches" className="text-sm text-brand-primary hover:underline">
                Find
              </Link>
            }
          >
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
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

          <p className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
            <Icon name="hard-drive" size="sm" />
            On this device
            <Link to="/settings" className="text-brand-primary hover:underline">
              Import
            </Link>
            {cloudConfigured && !cloudUser && (
              <>
                <span className="text-neutral-600">·</span>
                <Link to="/settings" className="text-brand-primary hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
