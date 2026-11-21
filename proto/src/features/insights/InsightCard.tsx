import { useState } from 'react'
import { cn } from '@/helpers/utils'
import { Icon } from '@/ui-mine'
import type { Grade, InsightCardModel } from '@/rules/insights'

function gradeClass(grade: Grade | null | undefined): string {
  if (grade === 'Excellent' || grade === 'Good') return 'text-brand'
  if (grade === 'Below') return 'text-warning'
  return 'text-primary'
}

/**
 * One Insights card. The info icon flips it to a short explanation.
 * The flip is instant when the user prefers reduced motion.
 */
export function InsightCard({
  card,
  playing,
  onPlay,
}: {
  card: InsightCardModel
  playing: boolean
  onPlay: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const cols = card.columns?.length ?? 0
  return (
    <article
      data-insight={card.id}
      data-insight-face={flipped ? 'back' : 'front'}
      className={cn('insight-flip rounded-md border bg-bg-card', playing ? 'insight-on border-brand-primary' : 'border-border')}
    >
      <div className={cn('insight-flip-inner', flipped && 'is-flipped')}>
        <div className="insight-face insight-front space-y-2 p-3" inert={flipped || undefined}>
          <FaceHead title={card.title} value={card.value} flipped={false} onFlip={() => setFlipped(true)} />
          {card.empty ? <p className="text-sm text-muted">{card.empty}</p> : null}
          {card.sub ? <p className="text-[13px] text-muted">{card.sub}</p> : null}
          {card.compare ? <p className="whitespace-nowrap text-[13px] text-muted">{card.compare}</p> : null}
          {cols > 0 && card.rows.length > 0 ? (
            <div
              className="grid items-end gap-x-2 text-[13px] text-muted"
              style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${cols}, 4rem)` }}
            >
              <span />
              {card.columns!.map((col) => (
                <span key={col} className="text-right">
                  {col}
                </span>
              ))}
            </div>
          ) : null}
          {card.rows.map((row) =>
            row.single ? (
              <div key={row.label} className="flex items-baseline justify-between gap-2 border-t border-border py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-primary">
                  <Dot on={row.weak} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-sm font-semibold tabular-nums text-primary">{row.single.main}</span>
                  {row.single.detail ? <span className="ml-2 text-[13px] text-muted">{row.single.detail}</span> : null}
                </span>
              </div>
            ) : (
              <div
                key={row.label}
                className="grid items-start gap-x-2 border-t border-border py-2"
                style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${cols}, 4rem)` }}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-primary">
                  <Dot on={row.weak} />
                  <span className="truncate">{row.label}</span>
                </span>
                <CellView cell={row.you} />
                {cols > 1 ? <CellView cell={row.them} /> : null}
                {cols > 2 ? (
                  <span className={cn('text-right text-sm font-semibold', gradeClass(row.grade))}>{row.grade ?? ''}</span>
                ) : null}
              </div>
            ),
          )}
          {card.playlist ? (
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <button
                type="button"
                aria-label={`Play ${card.playlist.name}`}
                className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-primary"
                onClick={onPlay}
              >
                <Icon name="play" size="sm" />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                {card.playlist.name} · {card.playlist.items.length}
              </span>
              <button
                type="button"
                disabled
                aria-label="Download"
                className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-muted"
              >
                <Icon name="download" size="sm" />
              </button>
            </div>
          ) : null}
        </div>
        <div
          className="insight-face insight-back cursor-pointer space-y-2 p-3"
          aria-hidden={flipped ? undefined : true}
          inert={flipped ? undefined : true}
          onClick={() => setFlipped(false)}
        >
          <FaceHead title={card.title} value={null} flipped quiet={!flipped} onFlip={() => setFlipped(false)} />
          {card.about.map((line) => (
            <p key={line} className="text-sm leading-snug text-primary">
              {line}
            </p>
          ))}
        </div>
      </div>
    </article>
  )
}

function FaceHead({
  title,
  value,
  flipped,
  quiet = false,
  onFlip,
}: {
  title: string
  value: string | null
  flipped: boolean
  quiet?: boolean
  onFlip: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <span className="flex shrink-0 items-center gap-1">
        {value ? <span className="text-2xl font-bold tabular-nums text-primary">{value}</span> : null}
        <button
          type="button"
          aria-label={flipped ? `Back to ${title}` : `About ${title}`}
          aria-pressed={flipped}
          aria-hidden={quiet || undefined}
          className="btn-kind-control btn-kind-square inline-flex items-center justify-center text-muted"
          onClick={(e) => {
            e.stopPropagation()
            onFlip()
          }}
        >
          <Icon name="info" size="sm" />
        </button>
      </span>
    </div>
  )
}

function Dot({ on }: { on: boolean }) {
  return <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-warning' : 'bg-transparent')} aria-hidden />
}

function CellView({ cell }: { cell: { text: string; of: string | null } | null | undefined }) {
  if (!cell) return <span />
  return (
    <span className="text-right">
      <span className="block text-sm font-semibold tabular-nums text-primary">{cell.text}</span>
      {cell.of ? <span className="block text-[11px] text-muted">{cell.of}</span> : null}
    </span>
  )
}
