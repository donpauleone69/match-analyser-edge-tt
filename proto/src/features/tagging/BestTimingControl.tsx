import { useState } from 'react'
import type { BestTiming } from './bestFlow'

const FIELDS: { key: keyof BestTiming; label: string }[] = [
  { key: 'reaction', label: 'Reaction' },
  { key: 'lead', label: 'Lead' },
  { key: 'end', label: 'End' },
  { key: 'min', label: 'Minimum' },
]

/** Four loop timings, over the picture, remembered on this device. */
export function BestTimingControl({
  timing,
  onChange,
}: {
  timing: BestTiming
  onChange: (timing: BestTiming) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute right-2 top-8 z-30" data-best-timing>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Loop timing"
        className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white"
        onClick={() => setOpen((on) => !on)}
      >
        Timing
      </button>
      {open ? (
        <div className="mt-0.5 w-[8.75rem] space-y-0.5 rounded-md bg-black/80 px-1.5 py-1 text-[10px] text-white" role="group" aria-label="Loop timing, milliseconds">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-1">
              <span>{field.label}</span>
              <input
                type="number"
                min={0}
                max={10000}
                step={50}
                inputMode="numeric"
                aria-label={field.label}
                value={timing[field.key]}
                className="h-5 w-12 rounded border border-white/30 bg-black/40 px-1 text-right text-[10px] tabular-nums text-white"
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isFinite(n) || n < 0 || n > 10000) return
                  onChange({ ...timing, [field.key]: Math.round(n) })
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
