import { useEffect, useReducer } from 'react'
import { initState, reduce } from '@/features/tagging/tagger'
import { TagScreen } from '@/features/tagging/TagScreen'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { DemoSheet } from '@/features/shell/DemoSheet'

export function App() {
  const [s, go] = useReducer(reduce, undefined, initState)

  useEffect(() => {
    if (!s.toast) return
    const id = setTimeout(() => go({ type: 'toast', text: null }), 3200)
    return () => clearTimeout(id)
  }, [s.toast])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-[min(100dvh,660px)] w-[min(100vw,393px)] overflow-hidden bg-ink-0 sm:rounded-[22px] sm:border sm:border-ink-3" data-frame>
        {s.screen === 'tag' ? <TagScreen s={s} go={go} /> : <OverviewScreen s={s} go={go} />}
        {s.sheet ? <DemoSheet go={go} /> : null}
        {s.toast ? (
          <button
            type="button"
            onClick={() => go({ type: 'toast', text: null })}
            className="absolute inset-x-3 top-12 z-10 rounded-btn border border-ink-4 bg-ink-2/95 px-3 py-2 text-left text-xs text-chalk"
            data-toast
          >
            {s.toast}
          </button>
        ) : null}
      </div>
    </div>
  )
}
