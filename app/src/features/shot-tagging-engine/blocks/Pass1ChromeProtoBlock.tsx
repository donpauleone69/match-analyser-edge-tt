import { cn } from '@/helpers/utils'
import { Icon } from '@/ui-mine'

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
}

/** Prototype: compact WTT-style 2-row scorebug (Name | Sets | Points) on the video HUD. */
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
}: Pass1SetHudBlockProps) {
  const rows: Array<{
    side: PlayerSide
    name: string
    sets: number
    points: number
  }> = [
    { side: 'player1', name: player1Name, sets: player1Sets, points: player1Score },
    { side: 'player2', name: player2Name, sets: player2Sets, points: player2Score },
  ]

  return (
    <div
      className="inline-block min-w-[9rem] max-w-[12.5rem] overflow-hidden rounded-md border border-white/20 bg-black/80 text-white shadow-lg backdrop-blur-sm select-none"
      role="status"
      aria-label={`Set ${setNumber}: ${player1Name} ${player1Sets} sets ${player1Score} points, ${player2Name} ${player2Sets} sets ${player2Score} points. Serving: ${serverName}.`}
    >
      <div className="divide-y divide-white/10">
        {rows.map((row) => {
          const isServing = serverId === row.side
          const isP1 = row.side === 'player1'
          return (
            <div
              key={row.side}
              className="grid grid-cols-[minmax(0,1fr)_1.5rem_1.85rem] items-stretch text-[11px] leading-none"
            >
              <div
                className={cn(
                  'flex min-w-0 items-center gap-1.5 border-l-2 px-1.5 py-1',
                  isServing
                    ? isP1
                      ? 'border-player-1 bg-white/10 font-bold text-white'
                      : 'border-player-2 bg-white/10 font-bold text-white'
                    : 'border-transparent font-semibold text-white/80'
                )}
                title={isServing ? `${row.name} (serving)` : row.name}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    isServing
                      ? isP1
                        ? 'bg-player-1'
                        : 'bg-player-2'
                      : 'bg-transparent'
                  )}
                  aria-hidden
                />
                <span className="truncate">{row.name}</span>
              </div>
              <div
                className="flex items-center justify-center border-x border-white/15 bg-white/20 font-bold tabular-nums text-white"
                title={`${row.name} sets: ${row.sets}`}
              >
                {row.sets}
              </div>
              <div
                className={cn(
                  'flex items-center justify-center font-black tabular-nums text-[12px]',
                  isServing ? 'text-white' : 'text-white/90'
                )}
                title={`${row.name} points: ${row.points}`}
              >
                {row.points}
              </div>
            </div>
          )
        })}
      </div>
      <span className="sr-only">Set {setNumber} · Serving: {serverName}</span>
    </div>
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
  /** Jump video to first tagged serve (skip intro / warm-up) */
  onJumpFirstServe?: () => void
  onToggleHistory: () => void
  /** Between points only — Done finishes the set; Pause soft-leaves to Match Review. */
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
  onJumpFirstServe,
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
  const showSetExit = !navigationLocked && Boolean(onEndSet || onReviewMatch)
  const otherServerName = serverId === 'player1' ? player2Name : player1Name

  return (
    <div className="shrink-0 flex min-h-10 items-center gap-1 border-t border-pill-idle-border bg-bg-card px-1.5 py-1">
      {onJumpFirstServe && completed.length > 0 && !navigationLocked && (
        <button
          type="button"
          onClick={onJumpFirstServe}
          className="tag-control shrink-0 gap-1"
          title="Jump to first serve (skip intro / warm-up)"
          aria-label="Jump to first serve"
        >
          <Icon name="skip-forward" size="xs" />
          <span className="hidden xs:inline sm:inline">1st</span>
        </button>
      )}
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
        <span className="min-w-0 flex-1 truncate px-1 text-center text-[10px] font-semibold text-primary">
          Point in progress
        </span>
      ) : viewingPast ? (
        <button type="button" onClick={onSelectNext} className="tag-control tag-control-accent min-w-0">
          {viewed
            ? `Viewing ${viewed.player1ScoreAfter}–${viewed.player2ScoreAfter} · ${nameOfSide(viewed.serverId, player1Name, player2Name)} served · Live →`
            : 'Back to live →'}
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
        className={cn('tag-control shrink-0', historyOpen && 'tag-control-active')}
      >
        History · {completed.length}
      </button>
      {showSetExit && (
        <>
          {onEndSet && (
            <button
              type="button"
              onClick={onEndSet}
              disabled={!canEndSet}
              className="tag-control tag-control-accent shrink-0 min-h-9 px-3 touch-manipulation"
              title="Finish this set and open Match Review"
            >
              Done
            </button>
          )}
          {onReviewMatch && (
            <button
              type="button"
              onClick={onReviewMatch}
              className="tag-control shrink-0 min-h-9 px-3 touch-manipulation"
              title="Pause tagging and open Match Review (set stays resumable)"
            >
              Pause
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
}

/**
 * Prototype: point history is a deliberate, vertically scalable ledger.
 * Score pairs are labelled as scores; sequential numbered cells remain exclusive to shots.
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
}: Pass1PointLedgerBlockProps) {
  if (!open) return null

  const nameOf = (side: PlayerSide) => (side === 'player1' ? player1Name : player2Name)

  return (
    <div
      className="absolute inset-x-0 top-9 bottom-0 z-30 bg-black/20"
      onClick={onClose}
    >
      <section
        className="border-y border-pill-idle-border bg-bg-card px-2 py-1.5 shadow-xl"
        aria-label="Point history"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <div>
            <h2 className="text-xs font-bold text-primary">Point history</h2>
            <p className="text-[9px] text-muted">Winner, score after, and server</p>
          </div>
          <div className="flex-1" />
          {onDeleteLast && (
            <button
              type="button"
              onClick={onDeleteLast}
              disabled={!canDeleteLast}
              className="tag-control tag-control-danger shrink-0"
              title="Delete the last saved point"
            >
              Delete last
            </button>
          )}
          <button type="button" onClick={onClose} className="tag-control">
            Close
          </button>
        </div>
        <div className="grid max-h-[32dvh] grid-cols-1 gap-1 overflow-y-auto pr-0.5 sm:grid-cols-2">
          {completed.map((point) => {
            const winnerIsP1 = point.winnerId === 'player1'
            const focused = focusedRallyIndex === point.rallyIndex
            return (
              <button
                key={point.rallyIndex}
                type="button"
                aria-current={focused ? 'true' : undefined}
                onClick={() => onSelectCompleted(point.rallyIndex)}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md border bg-bg-surface px-2 py-1.5 text-left',
                  focused ? 'border-contact-selected' : 'border-pill-idle-border'
                )}
                title={`Point won by ${point.winnerName}; ${point.player1ScoreAfter}–${point.player2ScoreAfter}; ${nameOf(point.serverId)} served`}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    winnerIsP1 ? 'bg-player-1' : 'bg-player-2'
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-bold text-primary">
                    {point.winnerName} won {point.isHighlight ? '★' : ''}
                  </span>
                  <span className="block truncate text-[9px] text-muted">
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
            type="button"
            aria-current={focusedRallyIndex === 'next' ? 'true' : undefined}
            onClick={onSelectNext}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md border border-dashed bg-bg-elevated px-2 py-1.5 text-left',
              focusedRallyIndex === 'next'
                ? 'border-contact-selected'
                : 'border-pill-idle-border'
            )}
          >
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  nextServerId === 'player1' ? 'bg-player-1' : 'bg-player-2'
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold text-primary">
                  {nextIsOpen ? 'Point in progress' : 'Next point'}
                </span>
                <span className="block truncate text-[9px] text-muted">
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
