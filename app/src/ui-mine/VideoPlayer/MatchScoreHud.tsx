/**
 * MatchScoreHud — canonical WTT-style scorebug for match video overlays.
 *
 * Pass 1 / Simple / Clips / Rallies share this visual language so every
 * surface reads as one product. Compact mode matches TransportCluster h-7.
 */

import { cn } from '@/helpers/utils'

export type MatchScoreSide = 'player1' | 'player2'

export interface MatchScoreHudProps {
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  /** Sets won (optional — omit or 0 when unknown). */
  player1Sets?: number
  player2Sets?: number
  /** Which side is serving; omit to hide the serve marker. */
  serverSide?: MatchScoreSide | null
  serverName?: string
  /** Optional set label for a11y (e.g. review/clips). */
  setNumber?: number | null
  /**
   * Show the sets column (Pass 1 always). Clips often omit — no match-sets context.
   * Default true.
   */
  showSets?: boolean
  /** Smaller H+W for video HUD next to overlay transport (Pass 1 baseline). */
  compact?: boolean
  className?: string
}

/** First token for compact HUD (shared by Clips / Review / Edit). */
export function shortPlayerName(name: string, fallback = '?'): string {
  const trimmed = name.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0] ?? fallback
}

/** Parse "3–5" / "3-5" score pairs from clip/rally view models. */
export function parseScorePair(score: string | null | undefined): {
  player1: number
  player2: number
} | null {
  if (!score) return null
  const m = score.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/)
  if (!m) return null
  return { player1: Number(m[1]), player2: Number(m[2]) }
}

/** Canonical compact scorebug — Name | Sets | Points, serve highlight. */
export function MatchScoreHud({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  player1Sets = 0,
  player2Sets = 0,
  serverSide = null,
  serverName,
  setNumber = null,
  showSets = true,
  compact = true,
  className,
}: MatchScoreHudProps) {
  const rows: Array<{
    side: MatchScoreSide
    name: string
    sets: number
    points: number
  }> = [
    { side: 'player1', name: player1Name, sets: player1Sets, points: player1Score },
    { side: 'player2', name: player2Name, sets: player2Sets, points: player2Score },
  ]

  const serveLabel = serverName ?? (serverSide === 'player1' ? player1Name : serverSide === 'player2' ? player2Name : null)
  const setPrefix = setNumber != null ? `Set ${setNumber}: ` : ''
  const gridCols = showSets
    ? compact
      ? 'h-1/2 grid-cols-[minmax(0,1fr)_1rem_1.25rem] text-[8px]'
      : 'grid-cols-[minmax(0,1fr)_1.5rem_1.85rem] text-[11px]'
    : compact
      ? 'h-1/2 grid-cols-[minmax(0,1fr)_1.35rem] text-[8px]'
      : 'grid-cols-[minmax(0,1fr)_1.85rem] text-[11px]'

  return (
    <div
      className={cn(
        'inline-block overflow-hidden rounded-md border border-white/20 bg-black/80 text-white backdrop-blur-sm select-none',
        compact
          ? showSets
            ? 'h-7 min-w-[5.75rem] max-w-[7.5rem] shadow-md'
            : 'h-7 min-w-[4.5rem] max-w-[6.5rem] shadow-md'
          : 'min-w-[9rem] max-w-[12.5rem] shadow-lg',
        className
      )}
      role="status"
      aria-label={`${setPrefix}${player1Name}${showSets ? ` ${player1Sets} sets` : ''} ${player1Score} points, ${player2Name}${showSets ? ` ${player2Sets} sets` : ''} ${player2Score} points${serveLabel ? `. Serving: ${serveLabel}` : ''}.`}
    >
      <div className={cn('divide-y divide-white/10', compact && 'h-full')}>
        {rows.map((row) => {
          const isServing = serverSide === row.side
          const isP1 = row.side === 'player1'
          return (
            <div
              key={row.side}
              className={cn('grid items-stretch leading-none', gridCols)}
            >
              <div
                className={cn(
                  'flex min-w-0 items-center border-l-2',
                  compact ? 'gap-0.5 px-1 py-0' : 'gap-1.5 px-1.5 py-1',
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
                    'shrink-0 rounded-full',
                    compact ? 'h-1 w-1' : 'h-1.5 w-1.5',
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
              {showSets && (
                <div
                  className="flex items-center justify-center border-x border-white/15 bg-white/20 font-bold tabular-nums text-white"
                  title={`${row.name} sets: ${row.sets}`}
                >
                  {row.sets}
                </div>
              )}
              <div
                className={cn(
                  'flex items-center justify-center font-black tabular-nums',
                  !showSets && 'border-l border-white/15 bg-white/10',
                  compact ? 'text-[9px]' : 'text-[12px]',
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
      {setNumber != null && (
        <span className="sr-only">
          Set {setNumber}
          {serveLabel ? ` · Serving: ${serveLabel}` : ''}
        </span>
      )}
    </div>
  )
}
