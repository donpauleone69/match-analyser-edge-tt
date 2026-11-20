import { cn } from '@/helpers/utils'

/** One control in the Input Area. Empty cells are space, so a missing region draws nothing. */
export type AreaRegion = {
  key: string
  label: string
  column: 1 | 2
  row: number
  /** Portrait: both columns. Landscape: the same control in each wing. */
  span?: boolean
  /** The row stays at control height. The other rows share what is left. */
  short?: boolean
  bg: string
  fg: string
  pressed?: boolean
  /** Shown, and a press does nothing. */
  dim?: boolean
  outline?: boolean
  onClick: () => void
  data?: Record<string, string | undefined>
}

/**
 * Two columns in portrait. In landscape, one column of a wing: pass `column`
 * and the same list, and a spanning control is drawn in both wings.
 */
export function InputArea({
  regions,
  column,
  attrs,
}: {
  regions: AreaRegion[]
  column?: 1 | 2
  attrs?: Record<string, string | undefined>
}) {
  const rows = [...new Set(regions.map((r) => r.row))].sort((a, b) => a - b)
  if (column) {
    return (
      <div data-input-area="" className="flex h-full min-h-0 flex-col gap-1.5" {...attrProps(attrs)}>
        {rows.map((row) => {
          const region = regions.find((r) => r.row === row && (r.span || r.column === column))
          const short = regions.some((r) => r.row === row && r.short)
          if (!region) return <div key={row} className={short ? 'h-11 shrink-0' : 'min-h-0 flex-1'} />
          return <RegionButton key={`${region.key}-${column}`} region={region} short={short} />
        })}
      </div>
    )
  }
  return (
    <div data-input-area="" className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 py-2" {...attrProps(attrs)}>
      {rows.map((row) => {
        const span = regions.find((r) => r.row === row && r.span)
        const short = regions.some((r) => r.row === row && r.short)
        if (span) {
          return (
            <div key={row} className={cn('min-h-0', short ? 'h-11 shrink-0' : 'flex flex-1')}>
              <RegionButton region={span} short={short} />
            </div>
          )
        }
        const left = regions.find((r) => r.row === row && r.column === 1)
        const right = regions.find((r) => r.row === row && r.column === 2)
        return (
          <div key={row} className={cn('grid grid-cols-2 gap-1.5', short ? 'h-11 shrink-0' : 'min-h-0 flex-1')}>
            {left ? <RegionButton region={left} short={short} /> : <div />}
            {right ? <RegionButton region={right} short={short} /> : <div />}
          </div>
        )
      })}
    </div>
  )
}

function attrProps(attrs?: Record<string, string | undefined>) {
  if (!attrs) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

function RegionButton({ region, short }: { region: AreaRegion; short: boolean }) {
  return (
    <button
      type="button"
      {...region.data}
      data-guard={region.dim ? '' : undefined}
      aria-pressed={region.pressed ? true : undefined}
      aria-label={region.label}
      onClick={() => {
        if (region.dim) return
        region.onClick()
      }}
      className={cn(
        'pad-region flex w-full touch-manipulation select-none items-center justify-center rounded-md px-2 text-center text-[22px] font-bold leading-tight active:brightness-90',
        short ? 'input-short h-full' : 'h-full min-h-0 flex-1',
        region.dim && 'opacity-60',
      )}
      style={{
        backgroundColor: region.bg,
        color: region.fg,
        boxShadow: region.pressed
          ? 'inset 0 0 0 4px #fff'
          : region.outline
            ? 'inset 0 0 0 1px var(--color-border)'
            : undefined,
      }}
    >
      {region.label}
    </button>
  )
}
