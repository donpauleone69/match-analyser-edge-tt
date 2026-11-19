import { useState } from 'react'
import { APP_VERSION } from '@/version'
import { cn } from '@/helpers/utils'
import type { AnswerLayout, BestTiming } from './bestFlow'

const FIELDS: { key: keyof BestTiming; label: string }[] = [
  { key: 'reaction', label: 'Reaction' },
  { key: 'lead', label: 'Lead' },
  { key: 'end', label: 'End' },
  { key: 'min', label: 'Minimum' },
]

/** Layout and loop timings, over the picture, remembered on this device. */
export function BestTimingControl({
  timing,
  onChange,
  layout,
  onLayout,
}: {
  timing: BestTiming
  onChange: (timing: BestTiming) => void
  layout: AnswerLayout
  onLayout: (layout: AnswerLayout) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute right-2 top-8 z-30" data-best-timing>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Settings"
        className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white"
        onClick={() => setOpen((on) => !on)}
      >
        Settings
      </button>
      {open ? (
        <div className="mt-0.5 w-44 space-y-1 rounded-md bg-black/80 px-1.5 py-1 text-[10px] text-white" role="group" aria-label="Settings">
          <div className="space-y-0.5">
            <p className="font-semibold">Layout</p>
            <div className="flex h-6 rounded-full bg-white/15 p-0.5" role="group" aria-label="Answer layout">
              {(['buttons', 'pad'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={layout === choice}
                  data-layout-choice={choice}
                  className={cn(
                    'flex-1 rounded-full px-1 text-[10px] font-semibold leading-5',
                    layout === choice
                      ? choice === 'pad'
                        ? 'bg-[#1d4ed8] text-white'
                        : 'bg-white text-neutral-950'
                      : 'text-white/70'
                  )}
                  onClick={() => onLayout(choice)}
                >
                  {choice === 'buttons' ? 'Buttons' : 'Corner pad'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-0.5" role="group" aria-label="Loop timing, milliseconds">
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
          <p data-build-version="" className="pt-0.5 text-[10px] font-medium leading-none text-white/70">
            {APP_VERSION}
          </p>
        </div>
      ) : null}
    </div>
  )
}
