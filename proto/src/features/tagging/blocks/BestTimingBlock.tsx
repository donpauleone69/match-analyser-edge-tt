import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pressable, Icon, buttonKindControlSquare } from '@/ui-mine'
import { APP_VERSION } from '@/version'
import type { BestTiming } from '@/rules/bestFa'

const FIELDS: { key: keyof BestTiming; label: string }[] = [
  { key: 'reaction', label: 'Reaction' },
  { key: 'lead', label: 'Lead' },
  { key: 'end', label: 'End' },
]

/** Loop timings, in the playback row, remembered on this device. */
export function BestTimingBlock({
  timing,
  onChange,
  open,
  onOpen,
}: {
  timing: BestTiming
  onChange: (timing: BestTiming) => void
  /** Owned by the tagging screen, so the tap zone can ignore presses while this is open. */
  open: boolean
  onOpen: (open: boolean) => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  const [place, setPlace] = useState<{ bottom: number; right: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const box = button.current?.getBoundingClientRect()
      if (!box) return
      setPlace({ bottom: window.innerHeight - box.top + 2, right: Math.max(8, window.innerWidth - box.right) })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])

  return (
    <div className="relative inline-flex" data-best-timing>
      <Pressable
        ref={button}
        type="button"
        aria-expanded={open}
        aria-label="Settings"
        className={`${buttonKindControlSquare} inline-flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80`}
        onClick={() => onOpen(!open)}
      >
        <Icon name="settings" size="sm" />
      </Pressable>
      {open && place
        ? createPortal(
            <div
              className="fixed z-50 w-44 space-y-1 rounded-md bg-black/80 px-1.5 py-1 text-[10px] text-white"
              style={{ bottom: place.bottom, right: place.right }}
              role="group"
              aria-label="Settings"
              data-best-timing-menu=""
            >
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
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
