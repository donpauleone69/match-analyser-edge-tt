import { other, type Side } from '@/rules/rally'
import { Icon } from '@/ui/Icon'

const LANES = [0.42, 0.6, 0.36, 0.64, 0.47, 0.55, 0.33, 0.68, 0.5, 0.4, 0.62, 0.45]
const endY = (s: Side) => (s === 'them' ? 0.1 : 0.9)

function ballAt(truth: number[], server: Side, t: number) {
  const n = truth.length
  const side = (i: number) => (i % 2 === 0 ? server : other(server))
  if (!n) return { x: 0.5, y: endY(server), lift: 0, alpha: 1 }
  if (t < truth[0]) {
    const toss = Math.max(0, Math.sin(Math.min(1, (truth[0] - t) / 0.9) * Math.PI))
    return { x: LANES[0], y: endY(server), lift: t > truth[0] - 0.9 ? toss : 0, alpha: 1 }
  }
  for (let i = 0; i < n - 1; i++) {
    if (t >= truth[i] && t < truth[i + 1]) {
      const p = (t - truth[i]) / (truth[i + 1] - truth[i])
      const lift = p < 0.6 ? Math.sin((Math.PI * p) / 0.6) * 0.8 : Math.sin((Math.PI * (p - 0.6)) / 0.4) * 0.4
      return {
        x: LANES[i % LANES.length] + (LANES[(i + 1) % LANES.length] - LANES[i % LANES.length]) * p,
        y: endY(side(i)) + (endY(side(i + 1)) - endY(side(i))) * p,
        lift,
        alpha: 1,
      }
    }
  }
  const p = Math.min(1.6, (t - truth[n - 1]) / 0.75)
  const from = endY(side(n - 1))
  const to = endY(side(n))
  return { x: LANES[(n - 1) % LANES.length] + 0.12 * p, y: from + (to - from) * p, lift: Math.sin(Math.min(1, p) * Math.PI) * 0.6, alpha: Math.max(0, 1 - Math.max(0, p - 1) * 1.6) }
}

type Props = {
  height: number
  truth: number[]
  server: Side
  t: number
  taps: number[]
  status: string
  live?: boolean
  playing: boolean
  onPlay?: (on: boolean) => void
  loop?: { from: number; to: number }
}

const fmt = (t: number) => {
  const s = Math.max(0, t)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

export function VideoStage({ height, truth, server, t, taps, status, live, playing, onPlay, loop }: Props) {
  const b = ballAt(truth, server, t)
  const span0 = Math.min(truth[0] ?? 0, taps[0] ?? Infinity) - 1
  const span1 = Math.max(truth[truth.length - 1] ?? 4, taps[taps.length - 1] ?? 0) + 1.5
  const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - span0) / (span1 - span0)) * 100))}%`
  return (
    <div className="relative shrink-0 overflow-hidden bg-vid-bg transition-[height] duration-300" style={{ height }} data-video>
      <div className="absolute inset-x-[24%] inset-y-[13%] rounded-[3px] border border-vid-line/40 bg-vid-table">
        <div className="absolute inset-y-0 left-1/2 w-px bg-vid-line/25" />
        <div className="absolute inset-x-[-6%] top-1/2 h-[3px] -translate-y-1/2 bg-vid-line/60" />
      </div>
      <span className="absolute right-[8%] top-[26%] text-cap font-bold uppercase text-vid-line/70">Kim</span>
      <span className="absolute bottom-[26%] right-[8%] text-cap font-bold uppercase text-vid-line/70">You</span>
      <div
        className="absolute rounded-full bg-ball"
        style={{
          left: `${b.x * 100}%`,
          top: `${b.y * 100}%`,
          width: 9,
          height: 9,
          opacity: b.alpha,
          transform: `translate(-50%, -50%) scale(${1 + b.lift * 0.7})`,
        }}
      />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-ink-2/90 px-2 py-1 text-xs font-semibold">
        {live ? <span className={`h-1.5 w-1.5 rounded-full ${playing ? 'bg-alert' : 'bg-chalk-faint'}`} /> : null}
        <span>{status}</span>
      </div>
      <span className="absolute right-2 top-2 rounded bg-ink-2/90 px-1.5 py-0.5 font-mono text-[11px] text-chalk-mute">{fmt(t)}</span>
      {live && onPlay ? (
        <button
          type="button"
          onClick={() => onPlay(!playing)}
          className="absolute bottom-6 left-2 flex h-9 items-center gap-1.5 rounded-full bg-ink-2/90 px-3 text-xs font-semibold text-chalk"
        >
          <Icon name={playing ? 'pause' : 'play'} size={14} />
          {playing ? 'Pause' : 'Play'}
        </button>
      ) : null}
      <div className="absolute inset-x-2 bottom-2 h-2">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-vid-line/15" />
        {loop ? <div className="absolute top-0 h-full rounded-sm bg-vid-line/15" style={{ left: pos(loop.from), width: `calc(${pos(loop.to)} - ${pos(loop.from)})` }} /> : null}
        {taps.map((x, i) => (
          <div key={i} className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-ball" style={{ left: pos(x) }} />
        ))}
        <div className="absolute -top-0.5 h-3 w-[2px] -translate-x-1/2 bg-vid-line" style={{ left: pos(t) }} />
      </div>
    </div>
  )
}
