import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import type { StrokeSide, Wing } from './rally'

/** The Shot by shot answer look, shared by every flow's questions. */
export const answerCell =
  'h-8 min-w-10 shrink-0 border px-2.5 text-sm font-semibold inline-flex items-center justify-center whitespace-nowrap'

export function restStyle(): CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)' }
}

export function Name({ children }: { children: ReactNode }) {
  return <p className="h-3 truncate text-[10px] font-bold uppercase leading-3 tracking-[0.025em] text-muted">{children}</p>
}

export function Answer({
  label,
  on,
  onClick,
  tone = 'chosen',
  disabled = false,
  radius = 'rounded-md',
  dim = false,
  side,
  fixed,
  style,
  data,
  size,
  className,
}: {
  label: string
  on: boolean
  onClick: () => void
  tone?: 'chosen' | 'error'
  disabled?: boolean
  radius?: string
  dim?: boolean
  side?: StrokeSide
  fixed?: boolean
  /** Replaces the resting look, for a hint or a filled fix. */
  style?: CSSProperties
  data?: Record<string, string | undefined>
  /** Small: a secondary action beside the answers. */
  size?: 'sm'
  className?: string
}) {
  return (
    <button
      type="button"
      data-cell={label}
      data-side={side}
      data-fixed={fixed === undefined ? undefined : fixed ? 'true' : 'false'}
      aria-pressed={on}
      aria-disabled={disabled || dim}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        answerCell,
        radius,
        size === 'sm' && 'h-7 min-w-0 px-2 text-xs',
        on
          ? tone === 'error'
            ? 'border-tag-error bg-tag-error text-white'
            : 'border-tag-chosen bg-tag-chosen text-on-accent'
          : 'text-primary',
        dim && 'pointer-events-none opacity-[0.45]',
        className
      )}
      style={on ? undefined : (style ?? restStyle())}
      {...data}
    >
      {label}
    </button>
  )
}

export function Cells({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-nowrap gap-1.5', className)}>{children}</div>
}

/** A labelled line of answers. */
export function AnswerRow({ label, children, aside }: { label: ReactNode; children: ReactNode; aside?: ReactNode }) {
  const name = typeof label === 'string' ? label : undefined
  return (
    <div role="group" aria-label={name} data-row={name} className="flex flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <Name>{label}</Name>
        </div>
        {aside}
      </div>
      <Cells>{children}</Cells>
    </div>
  )
}

export type StrokeCell = { wing: Wing; stroke: 'Attack' | 'Control'; label: string }

/** Two rows of two equal cells. BH left, FH right. Attack on top, Control below. */
export function StrokeGrid({
  label,
  rows,
  isOn,
  onPick,
  shot,
  aside,
}: {
  label: ReactNode
  rows: readonly (readonly StrokeCell[])[]
  isOn: (cell: StrokeCell) => boolean
  onPick: (cell: StrokeCell) => void
  shot: number
  aside?: ReactNode
}) {
  return (
    <div role="group" aria-label={`Shot ${shot} stroke`} data-row="Stroke" data-stroke-shot={shot} className="flex flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <Name>{label}</Name>
        </div>
        {aside}
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 gap-1.5">
          {row.map((cell) => (
            <Answer
              key={cell.label}
              label={cell.label}
              on={isOn(cell)}
              onClick={() => onPick(cell)}
              className="w-full min-w-0"
              data={{ 'data-wing': cell.wing, 'data-stroke': cell.stroke }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
