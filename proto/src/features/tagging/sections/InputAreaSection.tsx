import { cn } from '@/helpers/utils'
import { RegionButtonBlock } from '../blocks/RegionButtonBlock'
import type { InputAreaView } from '../models'

/**
 * Two columns in portrait. In landscape, one column of a wing: pass `column`
 * and the same list, and a spanning control is drawn in both wings.
 */
export function InputAreaSection({
  regions,
  column,
  attrs,
}: InputAreaView & { column?: 1 | 2 }) {
  const rows = [...new Set(regions.map((r) => r.row))].sort((a, b) => a - b)
  if (column) {
    // Both wings share these row heights, so a missing control keeps its row
    // and a button cannot grow into the row beside it.
    const template = rows
      .map((row) => (regions.some((r) => r.row === row && r.short) ? '2.75rem' : 'minmax(0, 1fr)'))
      .join(' ')
    return (
      <div
        data-input-area=""
        className="grid h-full min-h-0 gap-1.5"
        style={{ gridTemplateRows: template }}
        {...attrProps(attrs)}
      >
        {rows.map((row) => {
          const region = regions.find((r) => r.row === row && (r.span || r.column === column))
          const short = regions.some((r) => r.row === row && r.short)
          return (
            <div key={row} className="flex h-full min-h-0">
              {region ? <RegionButtonBlock region={region} short={short} /> : null}
            </div>
          )
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
              <RegionButtonBlock region={span} short={short} />
            </div>
          )
        }
        const left = regions.find((r) => r.row === row && r.column === 1)
        const right = regions.find((r) => r.row === row && r.column === 2)
        return (
          <div key={row} className={cn('grid grid-cols-2 gap-1.5', short ? 'h-11 shrink-0' : 'min-h-0 flex-1')}>
            {left ? <RegionButtonBlock region={left} short={short} /> : <div />}
            {right ? <RegionButtonBlock region={right} short={short} /> : <div />}
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

