import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { VideoAsset } from '@/types/match'
import type { Side } from '@/types/rally'
import type { VideoScript } from '@/types/video'
import { SPEED_STEPS, servesText } from '@/rules/rally'
import { sceneAt } from '@/data/seed/script'
import { type Segment } from '@/rules/timeline'
import type { SeekSpan } from './models'
import type { Player } from './hooks/usePlayer'

const MARKS = [0, 1, 2, 3]
/** How long a landing mark shows, in seconds of video. Matches the script. */
const MARK_SHOWN_S = 0.9

/**
 * Drawn table, players and ball that follow the script. Stands in for real
 * footage. Seen from above: the bat goes to the ball, the ball is red on an
 * attack, a mark shows where it lands, and the net shakes when it is hit.
 */
function StandIn({
  script,
  offset,
  getTime,
  names,
}: {
  script: VideoScript
  offset: number
  getTime: () => number
  names: Record<Side, string>
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
  }, [script, offset, getTime])

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

function Transport({
  onClick,
  label,
  disabled = false,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md bg-black/60 text-white text-xs font-semibold hover:bg-black/80 disabled:opacity-40 disabled:hover:bg-black/60"
    >
      {children}
    </button>
  )
}

/** Seek bar along the bottom of the picture. Rally spans, one knob, no played fill. */
export function PictureSeek({
  span,
  time,
  spans,
  band,
  onSeek,
  onPick,
}: {
  /** Global times the bar covers. A set's mark, start to end. */
  span: { a: number; b: number }
  time: number
  /** This set's rallies, first contact to last. */
  spans: SeekSpan[]
  /** A gap or the open rally, drawn as a warning band. */
  band: { a: number; b: number } | null
  onSeek: (g: number) => void
  /** Edit Set: a tap picks the rally or gap under the finger. */
  onPick?: (g: number) => void
}) {
  const width = Math.max(0.001, span.b - span.a)
  const pct = (g: number) => `${Math.min(100, Math.max(0, ((g - span.a) / width) * 100))}%`
  const fromX = (clientX: number, box: DOMRect) => span.a + ((clientX - box.left) / Math.max(1, box.width)) * width
  return (
    <div
      className="tag-seek"
      data-seek=""
      aria-label="Seek"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const node = e.currentTarget
        const box = node.getBoundingClientRect()
        const g = fromX(e.clientX, box)
        if (onPick) {
          onPick(g)
          return
        }
        node.setPointerCapture(e.pointerId)
        onSeek(g)
        const move = (ev: PointerEvent) => onSeek(fromX(ev.clientX, box))
        const end = () => {
          node.removeEventListener('pointermove', move)
          node.removeEventListener('pointerup', end)
          node.removeEventListener('pointercancel', end)
          node.removeEventListener('lostpointercapture', end)
          if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId)
        }
        node.addEventListener('pointermove', move)
        node.addEventListener('pointerup', end)
        node.addEventListener('pointercancel', end)
        node.addEventListener('lostpointercapture', end)
      }}
    >
      <span className="tag-seek-track">
        {spans.map((block, i) => (
          <span
            key={i}
            className="tag-seek-span"
            data-seek-span=""
            data-on={block.on ? '' : undefined}
            data-likely={block.likely ? '' : undefined}
            style={{ left: pct(block.a), width: `max(2px, ${((Math.max(block.a, block.b) - block.a) / width) * 100}%)` }}
          />
        ))}
        {band ? (
          <span
            className="tag-seek-band"
            data-seek-band=""
            style={{ left: pct(band.a), width: `max(3px, ${((Math.max(band.a, band.b) - band.a) / width) * 100}%)` }}
          />
        ) : null}
        <span className="tag-seek-head" style={{ left: pct(time) }} />
      </span>
    </div>
  )
}

/** The picture, with the score, Settings and transport over it. */
export function VideoStage({
  player,
  videos,
  names,
  bug,
  hint,
  toast = null,
  onSeek,
  noForward = false,
  onRate,
  settings = null,
  leading = null,
  seek,
  className,
}: {
  player: Player
  videos: VideoAsset[]
  names: Record<Side, string>
  bug: { sets: Record<Side, number>; points: Record<Side, number>; server: Side | null; setId: number }
  /** A few words over the picture, such as why a step back stopped short. */
  hint: string | null
  /** A toast on the picture. While it is up, it takes the hint's place. */
  toast?: { text: string; undo?: () => void; extra?: { label: string; run: () => void } } | null
  /** Seeks go through the screen so it can say why one stopped short. */
  onSeek: (g: number) => void
  /** Tapping: a jump forward would lose the rally being tapped. */
  noForward?: boolean
  onRate: (rate: number) => void
  /** Last control in the playback row, after Mute. */
  settings?: ReactNode
  /** Top left of the picture, such as Back. The score sits to its right. */
  leading?: ReactNode
  /** The picture's seek bar. There is no other one. */
  seek: ReactNode
  className?: string
}) {
  const segs: Segment[] = player.segs
  const seg = segs[player.segIndex]
  const video = videos[player.segIndex]
  const speedIndex = Math.max(0, SPEED_STEPS.indexOf(player.rate as (typeof SPEED_STEPS)[number]))
  return (
    <div className={className}>
      <div className="tag-picture" data-video-kind={video?.kind}>
        {video?.kind === 'file' && video.src ? (
          <video
            ref={player.bindVideo}
            data-vid={video.id}
            src={video.src}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : video?.script && seg ? (
          <StandIn
            script={video.script}
            offset={seg.offset}
            getTime={player.getTime}
            names={names}
          />
        ) : null}

        {leading ? <div className="absolute left-1.5 top-1.5 z-20">{leading}</div> : null}

        <div
          className={cn(
            'absolute top-2 z-10 rounded-md bg-black/70 text-white text-[11px] font-semibold tabular-nums overflow-hidden',
            leading ? 'left-14' : 'left-2'
          )}
          role="status"
          data-bug-server={bug.server ?? ''}
          aria-label={
            bug.server
              ? `Set ${bug.setId}: ${names.me} ${bug.points.me}, ${names.them} ${bug.points.them}. ${servesText(names, bug.server)}.`
              : `Set ${bug.setId}: ${names.me} ${bug.points.me}, ${names.them} ${bug.points.them}.`
          }
        >
          {(['me', 'them'] as const).map((side) => (
            <div key={side} className="flex items-center gap-1.5 px-1.5 py-0.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  bug.server === side ? (side === 'me' ? 'bg-side-me' : 'bg-side-them') : 'bg-transparent'
                )}
              />
              <span className="w-16 truncate">{names[side]}</span>
              <span className="w-3 text-center text-white/70">{bug.sets[side]}</span>
              <span className="w-4 text-center">{bug.points[side]}</span>
            </div>
          ))}
        </div>

        {toast ? (
          <div
            role="status"
            data-tag-toast
            className="absolute bottom-9 left-2 z-20 flex max-w-[70%] items-center gap-2 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-950"
          >
            <span className="min-w-0 flex-1">{toast.text}</span>
            {toast.extra ? (
              <button type="button" className="shrink-0 font-bold underline" onClick={toast.extra.run}>
                {toast.extra.label}
              </button>
            ) : null}
            {toast.undo ? (
              <button type="button" className="shrink-0 font-bold underline" onClick={toast.undo}>
                Undo
              </button>
            ) : null}
          </div>
        ) : hint ? (
          <p
            role="status"
            data-video-hint
            className="absolute left-2 bottom-9 max-w-[55%] rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white"
          >
            {hint}
          </p>
        ) : null}

        {seek}

        <div className="tag-playback absolute right-2 bottom-7 z-20 flex items-center gap-1">
          <Transport label="Back 10 seconds" onClick={() => onSeek(player.getTime() - 10)}>
            <Icon name="rewind" size="sm" />
          </Transport>
          <Transport
            label={player.playing ? 'Pause' : 'Play video'}
            disabled={player.atEnd && !player.playing}
            onClick={() => (player.playing ? player.pause() : player.play())}
          >
            <Icon name={player.playing ? 'pause' : 'play'} size="sm" />
          </Transport>
          <Transport
            label="Forward 10 seconds"
            disabled={player.atEnd || noForward}
            onClick={() => onSeek(player.getTime() + 10)}
          >
            <Icon name="forward" size="sm" />
          </Transport>
          <Transport
            label={`Speed ${player.rate}x`}
            onClick={() => onRate(SPEED_STEPS[(speedIndex + 1) % SPEED_STEPS.length])}
          >
            {player.rate}x
          </Transport>
          {video?.kind === 'file' ? (
            <Transport
              label={player.muted ? 'Sound on' : 'Sound off'}
              onClick={() => player.setMuted(!player.muted)}
            >
              <Icon name={player.muted ? 'volume-off' : 'volume'} size="sm" />
            </Transport>
          ) : null}
          {settings}
        </div>
      </div>
    </div>
  )
}
