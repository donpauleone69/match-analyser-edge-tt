import { useEffect, useRef } from 'react'
import { cn } from '@/helpers/utils'
import { Icon, MatchScoreHud } from '@/ui-mine'

type PlayerSide = 'player1' | 'player2'

export interface Pass1PointLedgerItem {
  rallyIndex: number
  serverId: PlayerSide
  winnerId: PlayerSide
  winnerName: string
  player1ScoreAfter: number
  player2ScoreAfter: number
  isHighlight: boolean
}

export interface Pass1SetHudBlockProps {
  setNumber: number
  player1Name: string
  player2Name: string
  player1Sets?: number
  player2Sets?: number
  player1Score: number
  player2Score: number
  serverId: PlayerSide
  serverName: string
  /** Smaller H+W for Simple tagging video HUD (MA-58). */
  compact?: boolean
}

/** Pass 1 alias → shared MatchScoreHud (ui-mine spine for all video surfaces). */
export function Pass1SetHudBlock({
  setNumber,
  player1Name,
  player2Name,
  player1Sets = 0,
  player2Sets = 0,
  player1Score,
  player2Score,
  serverId,
  serverName,
  compact = false,
}: Pass1SetHudBlockProps) {
  return (
    <MatchScoreHud
      setNumber={setNumber}
      player1Name={player1Name}
      player2Name={player2Name}
      player1Sets={player1Sets}
      player2Sets={player2Sets}
      player1Score={player1Score}
      player2Score={player2Score}
      serverSide={serverId}
      serverName={serverName}
      compact={compact}
    />
  )
}

export interface Pass1SetContextBlockProps {
  completed: Pass1PointLedgerItem[]
  player1Name: string
  player2Name: string
  serverId: PlayerSide
  serverName: string
  focusedRallyIndex: number | 'next'
  historyOpen: boolean
  navigationLocked?: boolean
  canToggleServer?: boolean
  onToggleServer?: () => void
  onSelectLast: () => void
  onSelectNext: () => void
  onToggleHistory: () => void
  /**
   * Done finishes the set → Match Review (available mid-point with discard confirm).
   * Leave soft-exits anytime, including mid-rally with Keep/Discard choice.
   * Leave is not video Pause.
   * Gap / 1st seek jumps live in History (MA-108) so this bar stays tappable.
   */
  canEndSet?: boolean
  onEndSet?: () => void
  onReviewMatch?: () => void
}

/** Persistent set controls without a persistent point strip. */
export function Pass1SetContextBlock({
  completed,
  player1Name,
  player2Name,
  serverId,
  serverName,
  focusedRallyIndex,
  historyOpen,
  navigationLocked = false,
  canToggleServer = false,
  onToggleServer,
  onSelectLast,
  onSelectNext,
  onToggleHistory,
  canEndSet = false,
  onEndSet,
  onReviewMatch,
}: Pass1SetContextBlockProps) {
  const last = completed[completed.length - 1]
  const viewingPast = focusedRallyIndex !== 'next'
  const viewed = viewingPast
    ? completed.find((point) => point.rallyIndex === focusedRallyIndex)
    : null
  /** Done stays visible mid-point (handler confirms discard); Leave soft-exits. */
  const showDone = Boolean(onEndSet)
  const showLeave = Boolean(onReviewMatch)
  const otherServerName = serverId === 'player1' ? player2Name : player1Name

  return (
    <div className="shrink-0 flex min-h-10 items-center gap-1 border-t border-border bg-bg-card px-1.5 py-1">
      {canToggleServer && onToggleServer ? (
        <button
          type="button"
          onClick={onToggleServer}
          className={cn(
            'tag-control min-w-0 max-w-[6.75rem] shrink-0 gap-1 font-bold',
            serverId === 'player1'
              ? 'bg-player-1-bg border-player-1 text-primary'
              : 'bg-player-2-bg border-player-2 text-primary'
          )}
          title={`Rally server: ${serverName}. Tap to switch to ${otherServerName}.`}
          aria-label={`Rally server: ${serverName}. Tap to switch to ${otherServerName}.`}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              serverId === 'player1' ? 'bg-player-1' : 'bg-player-2'
            )}
            aria-hidden
          />
          <span className="truncate">Serve · {serverName}</span>
          <Icon name="switch" size="xs" className="shrink-0 opacity-75" />
        </button>
      ) : (
        <div
          className="tag-control min-w-0 max-w-[6.5rem] shrink-0 gap-1 cursor-default opacity-80"
          title={`${viewingPast ? 'Served' : 'Serving'}: ${serverName}`}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              serverId === 'player1' ? 'bg-player-1' : 'bg-player-2'
            )}
            aria-hidden
          />
          <span className="truncate">
            {viewingPast ? 'Served' : 'Serve'} · {serverName}
          </span>
        </div>
      )}
      {navigationLocked ? (
        <span className="min-w-0 flex-1 truncate px-1 text-center text-[10px] font-medium text-muted">
          Point in progress
        </span>
      ) : viewingPast ? (
        <button
          type="button"
          onClick={onSelectNext}
          className="tag-control tag-control-accent min-w-0 flex-1 justify-center gap-1.5"
          title={
            viewed
              ? `Viewing ${viewed.player1ScoreAfter}–${viewed.player2ScoreAfter} · ${nameOfSide(viewed.serverId, player1Name, player2Name)} served — tap to return live`
              : 'Back to live tagging'
          }
          aria-label={
            viewed
              ? `Viewing ${viewed.player1ScoreAfter}–${viewed.player2ScoreAfter}. Return to live tagging`
              : 'Return to live tagging'
          }
        >
          {viewed && (
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                viewed.winnerId === 'player1' ? 'bg-player-1' : 'bg-player-2'
              )}
              aria-hidden
            />
          )}
          <span className="min-w-0 truncate">
            <span className="font-semibold text-muted">Viewing </span>
            <span className="tabular-nums font-bold text-primary">
              {viewed
                ? `${viewed.player1ScoreAfter}–${viewed.player2ScoreAfter}`
                : 'past'}
            </span>
          </span>
          <span className="shrink-0 font-black text-brand">Live →</span>
        </button>
      ) : last ? (
        <button
          type="button"
          onClick={onSelectLast}
          className="tag-control min-w-0 flex-1 justify-start"
          title={`Last point: ${last.winnerName} won ${last.player1ScoreAfter}–${last.player2ScoreAfter}`}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              last.winnerId === 'player1' ? 'bg-player-1' : 'bg-player-2'
            )}
            aria-hidden
          />
          <span className="truncate">
            Last · {last.winnerName} · {last.player1ScoreAfter}–{last.player2ScoreAfter}
          </span>
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate px-1 text-[10px] text-muted">
          First point · {player1Name} vs {player2Name}
        </span>
      )}
      <button
        type="button"
        aria-expanded={historyOpen}
        onClick={onToggleHistory}
        disabled={navigationLocked}
        className={cn('tag-control shrink-0 tabular-nums', historyOpen && 'tag-control-active')}
        title={`Point history (${completed.length})`}
        aria-label={`Point history, ${completed.length} saved`}
      >
        Hist · {completed.length}
      </button>
      {(showDone || showLeave) && (
        <>
          <span className="sr-only">
            Done finishes this set and opens Match Review — mid-point asks to
            discard the open rally first. Leave exits without finishing; mid-rally
            offers Keep draft or Discard. Leave is not video Pause.
          </span>
          {showDone && onEndSet && (
            <button
              type="button"
              onClick={onEndSet}
              disabled={!canEndSet}
              className="tag-control tag-control-accent shrink-0 touch-manipulation"
              title={
                !canEndSet
                  ? 'Done — tag at least one point before finishing the set'
                  : navigationLocked
                    ? 'Done — discard open point and finish this set → Match Review'
                    : 'Done — finish this set and open Match Review'
              }
              aria-label={
                !canEndSet
                  ? 'Done — disabled until at least one point is tagged'
                  : navigationLocked
                    ? 'Done — discard open point and finish set'
                    : 'Done — finish this set'
              }
            >
              Done
            </button>
          )}
          {showLeave && onReviewMatch && (
            <button
              type="button"
              onClick={onReviewMatch}
              className="tag-control shrink-0 touch-manipulation"
              title={
                navigationLocked
                  ? 'Leave — soft exit mid-rally (Keep draft or Discard; not Pause)'
                  : 'Leave — soft exit to Match Review (resume later; does not finish set; not video Pause)'
              }
              aria-label={
                navigationLocked
                  ? 'Leave tagging mid-rally — Keep draft or Discard'
                  : 'Leave tagging — resume later, does not finish set'
              }
            >
              Leave
            </button>
          )}
        </>
      )}
    </div>
  )
}

export interface Pass1PointLedgerBlockProps {
  open: boolean
  completed: Pass1PointLedgerItem[]
  player1Name: string
  player2Name: string
  nextServerId: PlayerSide
  focusedRallyIndex: number | 'next'
  nextIsOpen: boolean
  onClose: () => void
  onSelectCompleted: (rallyIndex: number) => void
  onSelectNext: () => void
  /** Rare undo — lives in History, not on the crowded form row. */
  onDeleteLast?: () => void
  canDeleteLast?: boolean
  /** Jump video to first tagged serve (skip intro / warm-up). */
  onJumpFirstServe?: () => void
  /** Multi-set: jump into between-set gap (or estimated start). Seek-only. */
  onJumpPrevSetEnd?: () => void
  /** True when Gap seeks with pre-contact estimate (no first serve yet). */
  gapJumpIsEstimate?: boolean
  prevSetNumber?: number | null
}

/**
 * Point history sheet — score-first ledger under the set bar.
 * Seek jumps (Gap / 1st) live here so the set bar stays tappable (MA-108).
 * MA-124: sheet chrome (sticky header, Escape, scroll focused, ordinals, ★).
 */
export function Pass1PointLedgerBlock({
  open,
  completed,
  player1Name,
  player2Name,
  nextServerId,
  focusedRallyIndex,
  nextIsOpen,
  onClose,
  onSelectCompleted,
  onSelectNext,
  onDeleteLast,
  canDeleteLast = false,
  onJumpFirstServe,
  onJumpPrevSetEnd,
  gapJumpIsEstimate = false,
  prevSetNumber = null,
}: Pass1PointLedgerBlockProps) {
  const focusedRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    focusedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, focusedRallyIndex, completed.length])

  if (!open) return null

  const nameOf = (side: PlayerSide) => (side === 'player1' ? player1Name : player2Name)
  const showJumps = Boolean(onJumpFirstServe || onJumpPrevSetEnd)

  return (
    <div
      className="absolute inset-x-0 top-9 bottom-0 z-30 flex flex-col bg-panel-scrim"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass1-history-title"
        className="flex max-h-[min(48dvh,22rem)] flex-col overflow-hidden rounded-b-xl border-x border-b border-border bg-bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1.5">
          <h2
            id="pass1-history-title"
            className="text-xs font-bold text-primary shrink-0"
          >
            History
          </h2>
          <span className="text-[9px] text-muted tabular-nums shrink-0">
            · {completed.length}
          </span>
          <div className="flex-1" />
          {showJumps && (
            <div
              className="flex items-center gap-1 opacity-80"
              role="group"
              aria-label="Seek jumps"
            >
              {onJumpPrevSetEnd && (
                <button
                  type="button"
                  onClick={onJumpPrevSetEnd}
                  className="tag-control shrink-0 gap-1 text-muted"
                  title={
                    gapJumpIsEstimate
                      ? prevSetNumber
                        ? `Jump toward estimated set start (dead air after set ${prevSetNumber})`
                        : 'Jump toward estimated set start (between-set dead air)'
                      : prevSetNumber
                        ? `Jump to end of set ${prevSetNumber} (start of between-set gap)`
                        : 'Jump to previous set end (between-set gap)'
                  }
                  aria-label={
                    gapJumpIsEstimate
                      ? 'Jump toward estimated set start in between-set gap'
                      : 'Jump to previous set end'
                  }
                >
                  <Icon name="skip-forward" size="xs" />
                  <span>Gap</span>
                </button>
              )}
              {onJumpFirstServe && completed.length > 0 && (
                <button
                  type="button"
                  onClick={onJumpFirstServe}
                  className="tag-control shrink-0 gap-1 text-muted"
                  title="Jump to first serve (skip intro / warm-up)"
                  aria-label="Jump to first serve"
                >
                  <Icon name="skip-forward" size="xs" />
                  <span>1st</span>
                </button>
              )}
            </div>
          )}
          {onDeleteLast && (
            <button
              type="button"
              onClick={onDeleteLast}
              disabled={!canDeleteLast}
              className="tag-control tag-control-danger shrink-0"
              title="Delete the last saved point"
              aria-label="Delete last saved point"
            >
              Del
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="tag-control shrink-0 px-1.5"
            aria-label="Close history"
            title="Close (Esc)"
          >
            <Icon name="x" size="xs" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 overflow-y-auto overscroll-contain px-2 py-1.5 sm:grid-cols-2">
          {completed.length === 0 && (
            <p className="col-span-full px-1 py-2 text-center text-[10px] text-muted">
              No points yet — save a rally to fill History.
            </p>
          )}
          {completed.map((point, index) => {
            const winnerIsP1 = point.winnerId === 'player1'
            const focused = focusedRallyIndex === point.rallyIndex
            return (
              <button
                key={point.rallyIndex}
                ref={focused ? focusedRef : undefined}
                type="button"
                aria-current={focused ? 'true' : undefined}
                onClick={() => onSelectCompleted(point.rallyIndex)}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md border bg-bg-surface px-2 py-1.5 text-left',
                  focused ? 'border-contact-selected' : 'border-border',
                  point.isHighlight && 'bg-bg-elevated'
                )}
                title={`Point ${index + 1} won by ${point.winnerName}; ${point.player1ScoreAfter}–${point.player2ScoreAfter}; ${nameOf(point.serverId)} served`}
              >
                <span className="w-4 shrink-0 text-center text-[9px] tabular-nums text-muted">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    winnerIsP1 ? 'bg-player-1' : 'bg-player-2'
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1 leading-tight">
                    <span className="truncate text-[10px] font-bold text-primary">
                      {point.winnerName} won
                    </span>
                    {point.isHighlight && (
                      <Icon
                        name="star"
                        size="xs"
                        className="text-warning"
                        label="Highlighted"
                      />
                    )}
                  </span>
                  <span className="block truncate text-[9px] text-muted leading-tight">
                    {nameOf(point.serverId)} served
                  </span>
                </span>
                <strong className="shrink-0 text-sm font-black tabular-nums text-primary">
                  {point.player1ScoreAfter}–{point.player2ScoreAfter}
                </strong>
              </button>
            )
          })}
          <button
            ref={focusedRallyIndex === 'next' ? focusedRef : undefined}
            type="button"
            aria-current={focusedRallyIndex === 'next' ? 'true' : undefined}
            onClick={onSelectNext}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md border border-dashed bg-bg-elevated px-2 py-1.5 text-left',
              focusedRallyIndex === 'next'
                ? 'border-contact-selected'
                : 'border-border'
            )}
          >
            <span className="w-4 shrink-0 text-center text-[9px] tabular-nums text-muted">
              →
            </span>
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                nextServerId === 'player1' ? 'bg-player-1' : 'bg-player-2'
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-primary leading-tight">
                {nextIsOpen ? 'Point in progress' : 'Next point'}
              </span>
              <span className="block truncate text-[9px] text-muted leading-tight">
                {nameOf(nextServerId)} serves
              </span>
            </span>
            <span className="text-sm font-black text-muted">→</span>
          </button>
        </div>
      </section>
    </div>
  )
}

function nameOfSide(side: PlayerSide, player1Name: string, player2Name: string) {
  return side === 'player1' ? player1Name : player2Name
}
