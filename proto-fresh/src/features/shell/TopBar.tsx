import type { ReactNode } from 'react'
import type { Side } from '@/rules/rally'

export function TopBar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-ink-2 bg-ink-0 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
      <div className="flex items-center gap-1.5">{right}</div>
    </div>
  )
}

export function Score({ set, score, server }: { set: number; score: [number, number]; server: Side | null }) {
  const dot = (s: Side) => (server === s ? <span className="h-1.5 w-1.5 rounded-full bg-ball" aria-label="serving" /> : <span className="h-1.5 w-1.5" />)
  return (
    <div className="flex items-center gap-2" data-score>
      <span className="rounded bg-ink-2 px-1.5 py-0.5 text-cap font-bold uppercase text-chalk-mute">Set {set}</span>
      <span className="flex items-center gap-1 text-xs font-semibold text-you">
        {dot('me')}You
      </span>
      <span className="font-mono text-[17px] font-bold">
        {score[0]}
        <span className="px-1 text-chalk-faint">:</span>
        {score[1]}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-kim">
        Kim{dot('them')}
      </span>
    </div>
  )
}

export function BarBtn({ children, onClick, on }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-btn px-2.5 text-xs font-semibold ${on ? 'bg-chalk text-ink-0' : 'bg-ink-2 text-chalk'}`}
    >
      {children}
    </button>
  )
}
