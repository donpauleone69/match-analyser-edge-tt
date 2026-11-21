import { useEffect, useRef } from 'react'
import { cn } from '@/helpers/utils'
import type { VideoScript } from '@/types/video'
import type { Side } from '@/types/rally'
import type { SceneAt } from '../models'

const MARKS = [0, 1, 2, 3]
/** How long a landing mark shows, in seconds of video. Matches the script. */
const MARK_SHOWN_S = 0.9

/**
 * Drawn table, players and ball that follow the script. Stands in for real
 * footage. Seen from above: the bat goes to the ball, the ball is red on an
 * attack, a mark shows where it lands, and the net shakes when it is hit.
 */
export function StandInBlock({
  script,
  offset,
  getTime,
  names,
  sceneAt,
}: {
  script: VideoScript
  offset: number
  getTime: () => number
  names: Record<Side, string>
  sceneAt: SceneAt
}) {
  const ball = useRef<HTMLDivElement>(null)
  const net = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const bats = useRef<Record<Side, HTMLDivElement | null>>({ me: null, them: null })
  const bodies = useRef<Record<Side, HTMLDivElement | null>>({ me: null, them: null })
  const marks = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const scene = sceneAt(script, getTime() - offset)
      const b = ball.current
      if (b) {
        if (scene.ball) {
          b.style.opacity = String(scene.ball.opacity)
          b.style.left = `${scene.ball.x * 100}%`
          b.style.top = `${scene.ball.y * 100}%`
          b.style.transform = `translate(-50%, -50%) scale(${scene.ball.scale})`
          b.style.backgroundColor = scene.ball.attack ? '#ef4444' : '#ffffff'
          b.style.boxShadow = scene.ball.attack
            ? '0 0 0 2px #7f1d1d, 0 0 12px 4px rgba(239, 68, 68, 0.8)'
            : '0 0 0 2px #fde047, 0 0 12px 4px rgba(253, 224, 71, 0.75)'
          b.dataset.attack = scene.ball.attack ? 'yes' : 'no'
        } else {
          b.style.opacity = '0'
        }
      }
      for (const side of ['me', 'them'] as const) {
        const at = scene.bats[side]
        const bat = bats.current[side]
        if (bat) {
          bat.style.left = `${at.x * 100}%`
          bat.style.top = `${at.y * 100}%`
          bat.style.transform = `translate(-50%, -50%) scale(${scene.hit === side ? 1.6 : 1})`
          bat.style.filter = scene.hit === side ? 'brightness(1.8)' : ''
        }
        const body = bodies.current[side]
        if (body) {
          body.style.left = `${(at.x + (side === 'me' ? -0.035 : 0.035)) * 100}%`
          body.style.top = `${(0.5 + (at.y - 0.5) * 0.2) * 100}%`
        }
      }
      MARKS.forEach((i) => {
        const el = marks.current[i]
        const m = scene.marks[i]
        if (!el) return
        if (!m) {
          el.style.opacity = '0'
          return
        }
        el.style.left = `${m.x * 100}%`
        el.style.top = `${m.y * 100}%`
        // Full for the first half, then gone by the end.
        el.style.opacity = String(Math.min(1, Math.max(0, 2 * (1 - m.age / MARK_SHOWN_S))))
      })
      if (net.current) {
        const hit = scene.net !== null
        net.current.style.transform = `translateX(-50%) scaleX(${hit ? 2.2 : 1})`
        net.current.style.filter = hit ? 'brightness(1.6)' : ''
        net.current.dataset.hit = hit ? 'yes' : 'no'
      }
      if (label.current) label.current.textContent = scene.label ?? ''
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [script, offset, getTime, sceneAt])

  return (
    <div className="absolute inset-0 bg-[#123524] overflow-hidden" aria-label="Demo video">
      <div className="absolute left-[15%] right-[15%] top-[24%] bottom-[24%] rounded-sm bg-[#1d4ed8] border-2 border-white/80">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/40" />
      </div>
      {/* The net stands proud of the table, with a post at each end. */}
      <div
        ref={net}
        data-net
        className="absolute left-1/2 top-[19%] bottom-[19%] w-1.5 rounded-sm border-x border-white bg-slate-300 shadow-[3px_0_4px_rgba(0,0,0,0.45)] transition-transform duration-75"
        style={{
          transform: 'translateX(-50%)',
          backgroundImage: 'repeating-linear-gradient(0deg, #f8fafc 0 2px, #64748b 2px 4px)',
        }}
      >
        <span className="absolute -left-1 -right-1 -top-1 h-2 rounded-sm bg-slate-900" />
        <span className="absolute -left-1 -right-1 -bottom-1 h-2 rounded-sm bg-slate-900" />
      </div>
      {MARKS.map((i) => (
        <div
          key={i}
          ref={(node) => {
            marks.current[i] = node
          }}
          data-bounce
          className="absolute h-[6%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/80"
          style={{ opacity: 0 }}
        />
      ))}
      {(['me', 'them'] as const).map((side) => (
        <div key={side}>
          <div
            ref={(node) => {
              bodies.current[side] = node
            }}
            className={cn(
              'absolute h-[9%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 opacity-60',
              side === 'me' ? 'bg-side-me' : 'bg-side-them'
            )}
            style={{ left: side === 'me' ? '6.5%' : '93.5%', top: '50%' }}
          />
          <div
            ref={(node) => {
              bats.current[side] = node
            }}
            data-bat={side}
            className={cn(
              'absolute h-[13%] w-[2%] rounded-full border border-white/70',
              side === 'me' ? 'bg-side-me' : 'bg-side-them'
            )}
            style={{ left: side === 'me' ? '10%' : '90%', top: '50%', transform: 'translate(-50%, -50%)' }}
          />
          <p
            className={cn(
              'absolute top-[64%] w-[14%] truncate text-center text-[10px] font-semibold text-white/80',
              side === 'me' ? 'left-0' : 'right-0'
            )}
          >
            {names[side]}
          </p>
        </div>
      ))}
      <div
        ref={ball}
        data-ball
        className="absolute z-10 h-[10%] aspect-square rounded-full bg-white"
        style={{
          opacity: 0,
          boxShadow: '0 0 0 2px #fde047, 0 0 12px 4px rgba(253, 224, 71, 0.75)',
        }}
      />
      <p
        ref={label}
        data-scene-label
        className="absolute left-1/2 top-[7%] -translate-x-1/2 rounded bg-black/40 px-1.5 text-xs font-semibold text-white empty:hidden"
      />
    </div>
  )
}
