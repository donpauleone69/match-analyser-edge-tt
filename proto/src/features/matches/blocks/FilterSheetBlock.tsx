import { useEffect, type ReactNode } from 'react'
import { Pressable, Button } from '@/ui-mine'

/**
 * Chips, the desktop panel and the phone sheet. `css` keeps both panels in the
 * DOM (md: show and hide). `media` mounts only the panel for the current width.
 */
export function FilterSheet({
  active,
  clearOne,
  open,
  setOpen,
  clear,
  apply,
  show,
  mode,
  desktop,
  desktopClass,
  phoneClass,
  pickers,
}: {
  active: string[]
  clearOne: (label: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  clear: () => void
  apply: () => void
  show: boolean
  mode: 'css' | 'media'
  desktop: boolean
  desktopClass: string
  phoneClass: string
  pickers: () => ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPress = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el?.closest('[data-filter-surface]')) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPress)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPress)
    }
  }, [open, setOpen])

  const desktopOn = mode === 'css' ? open && show : open && desktop
  const phoneOn = mode === 'css' ? open && show : open && !desktop

  return (
    <>
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {active.map((label) => (
            <Pressable
              key={label}
              type="button"
              onClick={() => clearOne(label)}
              className="btn-kind-control inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${label}`}
            >
              {label}
              <span aria-hidden>×</span>
            </Pressable>
          ))}
        </div>
      ) : null}
      <div className="px-4 sm:px-6 lg:px-8">
        {desktopOn ? (
          <div className={desktopClass} data-filter-surface role="group" aria-label="Filters">
            {pickers()}
            <div className="flex justify-end gap-2">
              <Button kind="control" variant="ghost" onClick={clear}>
                Clear
              </Button>
              <Button kind="control" onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        ) : null}
        {phoneOn ? (
          <div className={phoneClass} data-filter-surface role="dialog" aria-label="Filters">
            <Pressable
              type="button"
              className="absolute inset-0 bg-neutral-50/60"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[100dvh] space-y-3 overflow-auto rounded-t-xl border border-border bg-bg-surface p-4 pb-8 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Filter</p>
                <Button kind="control" variant="ghost" className="shrink-0 px-2" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
              {pickers()}
              <div className="flex gap-2">
                <Button fullWidth kind="control" variant="ghost" onClick={clear}>
                  Clear
                </Button>
                <Button fullWidth kind="control" onClick={apply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
