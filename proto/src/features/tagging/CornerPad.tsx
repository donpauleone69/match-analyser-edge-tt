import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import { Name } from './AnswerCells'

/** One region of the corner pad. Colour is the aim. The word is there while the map is new. */
export type PadRegion = {
  key: string
  label: string
  on: boolean
  bg: string
  fg: string
  onClick: () => void
  data?: Record<string, string | undefined>
  style?: CSSProperties
}

/**
 * Large colour regions under the question name. The whole region is the hit,
 * so the answer does not need a look down at a small button.
 */
export function CornerPad({
  label,
  regions,
  columns,
  rows,
  aside,
  fill = true,
  shot,
}: {
  label: ReactNode
  regions: PadRegion[]
  columns: string
  rows: string
  aside?: ReactNode
  /** Fills the answer zone. Off for a reminder row once a later question is open. */
  fill?: boolean
  shot?: number
}) {
  const name = typeof label === 'string' ? label : undefined
  return (
    <div
      className={cn('flex min-h-0 flex-col gap-1', fill && 'flex-1')}
      data-corner-pad=""
      data-stroke-shot={shot}
      role="group"
      aria-label={name}
    >
      {fill ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Name>{label}</Name>
          </div>
          {aside}
        </div>
      ) : null}
      <div
        className={cn('grid min-h-0 gap-1', fill ? 'min-h-28 flex-1' : 'h-12')}
        style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}
      >
        {regions.map((region) => (
          <button
            key={region.key}
            type="button"
            data-cell={region.label}
            aria-pressed={region.on}
            onClick={region.onClick}
            className={cn(
              'min-h-0 min-w-0 touch-manipulation select-none rounded-md px-2 font-bold leading-tight active:brightness-90',
              fill ? 'text-[22px]' : 'text-sm'
            )}
            style={{
              backgroundColor: region.bg,
              color: region.fg,
              boxShadow: region.on ? `inset 0 0 0 4px ${region.fg === '#fff' ? '#fff' : '#0b1220'}` : undefined,
              ...region.style,
            }}
            {...region.data}
          >
            {region.label}
          </button>
        ))}
      </div>
    </div>
  )
}
