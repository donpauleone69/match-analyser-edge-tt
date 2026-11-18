import { useState, type Dispatch } from 'react'
import { SCENARIOS } from '@/rules/scenarios'
import { Icon } from '@/ui/Icon'
import { THEMES } from '@/theme/themes'
import { currentTheme, setTheme } from '@/theme/applyTheme'
import type { Action } from '@/features/tagging/tagger'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

function ThemeRow() {
  const [on, setOn] = useState(currentTheme().key)
  return (
    <div className="flex flex-col gap-1 pb-1" data-themes>
      <span className="cap">Theme</span>
      <div className="grid grid-cols-4 gap-1">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={on === t.key}
            data-theme-key={t.key}
            onClick={() => {
              setTheme(t.key)
              setOn(t.key)
            }}
            className={`flex h-11 flex-col items-center justify-center gap-1 rounded-btn border-[1.5px] px-1 ${on === t.key ? 'border-chalk' : 'border-transparent bg-ink-2'}`}
          >
            <span className="flex gap-0.5">
              {[t.color.you, t.color.kim, t.color.ball, t.color.flag, t.color.alert].map((c) => (
                <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="truncate text-[11px] font-semibold">{t.short}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DemoSheet({ go }: { go: Dispatch<Action> }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-scrim/60" data-sheet>
      <button type="button" aria-label="Close" className="flex-1" onClick={() => go({ type: 'sheet', on: false })} />
      <div className="flex flex-col gap-1 rounded-t-[18px] border-t border-ink-3 bg-ink-1 px-3 pb-3 pt-2">
        <div className="flex h-9 items-center">
          <span className="title text-sm">Try a rally</span>
          <span className="ml-2 text-xs text-chalk-faint">taps already made</span>
          <div className="flex-1" />
          <button type="button" aria-label="Close" onClick={() => go({ type: 'sheet', on: false })} className="flex h-8 w-8 items-center justify-center rounded-btn bg-ink-2">
            <Icon name="close" size={14} />
          </button>
        </div>
        <ThemeRow />
        <button type="button" onClick={() => go({ type: 'scenario', key: 'live' })} className="flex h-10 items-center gap-2 rounded-btn bg-chalk px-3 text-left text-ink-0">
          <Icon name="play" size={14} />
          <span className="text-sm font-semibold">Live rally</span>
          <span className="truncate text-xs opacity-70">tap along with the ball</span>
        </button>
        <div className="grid grid-cols-2 gap-1">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.key}
              type="button"
              data-scenario={sc.key}
              onClick={() => go({ type: 'scenario', key: sc.key })}
              className="flex h-[52px] flex-col justify-center rounded-btn bg-ink-2 px-2.5 text-left"
            >
              <span className="text-sm font-semibold">{sc.name}</span>
              <span className="truncate text-[11px] text-chalk-mute">
                {plural(sc.taps.length, 'tap')}, {plural(sc.truth.length, 'shot')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
