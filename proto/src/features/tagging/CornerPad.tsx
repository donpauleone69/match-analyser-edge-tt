import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  /** Landscape: left wing or right wing. Portrait ignores this and uses the grid. */
  side?: 'left' | 'right'
  data?: Record<string, string | undefined>
  style?: CSSProperties
}

/** Landscape slots. The question stays in the middle. The halves sit in these wings. */
export const PadWingContext = createContext<{ left: HTMLElement | null; right: HTMLElement | null }>({
  left: null,
  right: null,
})

function regionButton(region: PadRegion, fill: boolean) {
  return (
    <button
      key={region.key}
      type="button"
      data-cell={region.label}
      aria-pressed={region.on}
      onClick={region.onClick}
      className={cn(
        'pad-region min-h-0 min-w-0 touch-manipulation select-none rounded-md px-2 text-center text-[22px] font-bold leading-tight active:brightness-90',
        fill ? 'min-h-11 flex-1' : 'h-full'
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
  )
}

/**
 * Large colour regions under the question name. The whole region is the hit,
 * so the answer does not need a look down at a small button.
 * In landscape the left regions portal to the left wing and the right regions
 * to the right wing. Portrait keeps one grid.
 */
export function CornerPad({
  label,
  regions,
  columns,
  rows,
  aside,
  fill = true,
  shot,
  split = false,
  showName = true,
}: {
  label: ReactNode
  regions: PadRegion[]
  columns: string
  rows: string
  aside?: ReactNode
  /** Fills the answer zone. Off for a reminder row once a later question is open. */
  fill?: boolean
  shot?: number
  /** Landscape: halves on the side wings, question name in the middle. */
  split?: boolean
  /** Off hides the question name. An aside still sits on that line. */
  showName?: boolean
}) {
  const name = typeof label === 'string' ? label : undefined
  const wings = useContext(PadWingContext)
  const heading =
    showName || aside ? (
      <div className="flex min-w-0 items-center gap-2">
        {showName ? (
          <div className="min-w-0 flex-1">
            <Name>{label}</Name>
          </div>
        ) : (
          <span className="flex-1" />
        )}
        {aside}
      </div>
    ) : null
  const ready = Boolean(split && wings.left && wings.right && regions.every((region) => region.side))
  if (split) {
    const left = regions.filter((region) => region.side !== 'right')
    const right = regions.filter((region) => region.side === 'right')
    return (
      <div className="flex flex-col gap-1" data-corner-pad="" data-stroke-shot={shot} data-pad-split="" role="group" aria-label={name}>
        {heading}
        {ready && wings.left
          ? createPortal(
              <div className="pad-hits flex min-h-0 w-full flex-1 flex-col gap-1.5">{left.map((region) => regionButton(region, true))}</div>,
              wings.left
            )
          : null}
        {ready && wings.right
          ? createPortal(
              <div className="pad-hits flex min-h-0 w-full flex-1 flex-col gap-1.5">{right.map((region) => regionButton(region, true))}</div>,
              wings.right
            )
          : null}
      </div>
    )
  }
  return (
    <div
      className={cn('flex min-h-0 flex-col gap-1', fill && 'flex-1')}
      data-corner-pad=""
      data-stroke-shot={shot}
      role="group"
      aria-label={name}
    >
      {fill ? heading : null}
      <div
        className={cn('grid min-h-0 gap-1', fill ? 'min-h-28 flex-1' : 'h-12')}
        style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}
      >
        {regions.map((region) => regionButton(region, false))}
      </div>
    </div>
  )
}
