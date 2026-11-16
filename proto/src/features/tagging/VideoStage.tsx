import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/ui-mine'
import type { VideoAsset } from '@/data/demoStore'
import { cn } from '@/helpers/utils'
import { buttonKindControlSquare } from '@/ui-mine/buttonKinds'
import { SPEED_STEPS, servesText, type Side } from './rally'
import { sceneAt, type VideoScript } from './script'
import { formatClock, totalDuration, type Segment } from './timeline'
import type { Player } from './usePlayer'

const MARKS = [0, 1, 2, 3]
/** How long a landing mark shows, in seconds of video. Matches the script. */
const MARK_SHOWN_S = 0.9

/**
 * Drawn table, players and ball that follow the script. Stands in for real
 * footage. Seen from above: the bat goes to the ball, the ball is red on an
 * attack, a mark shows where it lands, and the net shakes when it is hit.
 * A caption by the hitter names the wing and stroke until the next contact or 0.8s.
 */
function StandIn({
  script,
  offset,
  getTime,
  names,
  showCaptions,
}: {
  script: VideoScript
  offset: number
  getTime: () => number
  names: Record<Side, string>
  showCaptions: boolean
}) {
  const ball = useRef<HTMLDivElement>(null)
  const net = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const caption = useRef<HTMLParagraphElement>(null)
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
      const cap = caption.current
      if (cap) {
        if (showCaptions && scene.caption) {
          const at = scene.bats[scene.caption.side]
          cap.textContent = scene.caption.text
          cap.style.opacity = '1'
          cap.style.top = `${at.y * 100}%`
          cap.style.left = scene.caption.side === 'me' ? '16%' : 'auto'
          cap.style.right = scene.caption.side === 'them' ? '16%' : 'auto'
        } else {
          cap.textContent = ''
          cap.style.opacity = '0'
        }
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [script, offset, getTime, showCaptions])

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
        ref={caption}
        data-caption
        className="absolute z-20 -translate-y-1/2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white empty:hidden"
      />
      <p
        ref={label}
        data-scene-label
        className="absolute left-1/2 top-[7%] -translate-x-1/2 rounded bg-black/40 px-1.5 text-xs font-semibold text-white empty:hidden"
      />
    </div>
  )
}

export type TimelineBlock = { a: number; b: number; winner: Side; current: boolean }

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

/**
 * The picture, the score bug and transport over it, and the match timeline
 * under it: saved rallies as blocks, the open rally as a soft range with a
 * tick per contact, and a line where one video ends and the next begins.
 */
export function VideoStage({
  player,
  videos,
  names,
  bug,
  blocks,
  open,
  hint,
  onSeek,
  noForward = false,
  onRate,
  highlightOn = false,
  highlight = false,
  onHighlight,
  readOnlyHighlight = false,
  badge = null,
  className,
}: {
  player: Player
  videos: VideoAsset[]
  names: Record<Side, string>
  bug: { sets: Record<Side, number>; points: Record<Side, number>; server: Side; setId: number }
  blocks: TimelineBlock[]
  open: { a: number; b: number; ticks: number[] } | null
  /** A few words over the picture, such as why a step back stopped short. */
  hint: string | null
  /** Seeks go through the screen so it can say why one stopped short. */
  onSeek: (g: number) => void
  /** Tapping: a jump forward would lose the rally being tapped. */
  noForward?: boolean
  onRate: (rate: number) => void
  /** Highlight rally (show reel), top right under the clock on the picture. */
  highlightOn?: boolean
  highlight?: boolean
  onHighlight?: () => void
  readOnlyHighlight?: boolean
  /** Shot number on the picture at that shot's contact. Neighbours get none. */
  badge?: { shot: number; side: Side } | null
  className?: string
}) {
  const segs: Segment[] = player.segs
  const total = totalDuration(segs) || 1
  const seg = segs[player.segIndex]
  const video = videos[player.segIndex]
  const pct = (g: number) => `${Math.min(100, Math.max(0, (g / total) * 100))}%`
  const speedIndex = Math.max(0, SPEED_STEPS.indexOf(player.rate as (typeof SPEED_STEPS)[number]))
  const [captions, setCaptions] = useState(true)

  return (
    <div className={className}>
      <div className="tag-picture" data-video-kind={video?.kind}>
        {video?.kind === 'file' && video.src ? (
          <video
            key={video.id}
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
            showCaptions={captions}
          />
        ) : null}

        <div
          className="absolute left-2 top-2 rounded-md bg-black/70 text-white text-[11px] font-semibold tabular-nums overflow-hidden"
          role="status"
          aria-label={`Set ${bug.setId}: ${names.me} ${bug.points.me}, ${names.them} ${bug.points.them}. ${servesText(names, bug.server)}.`}
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

        <p className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {videos.length > 1 ? `Video ${player.segIndex + 1} of ${videos.length} · ` : ''}
          {formatClock(player.time - (seg?.offset ?? 0))}
        </p>

        {badge ? (
          <p
            data-shot-badge={badge.shot}
            className={cn(
              'absolute left-2 top-12 z-20 rounded-md px-3 py-1 text-2xl font-bold tabular-nums text-white',
              badge.side === 'me' ? 'bg-side-me' : 'bg-side-them'
            )}
          >
            {badge.shot}
          </p>
        ) : null}

        {highlightOn && onHighlight ? (
          <button
            type="button"
            aria-label="Highlight rally"
            aria-pressed={highlight}
            aria-disabled={readOnlyHighlight}
            onClick={readOnlyHighlight ? undefined : onHighlight}
            className={cn(
              'absolute right-2 top-10 inline-flex items-center justify-center rounded-md touch-manipulation select-none',
              buttonKindControlSquare,
              highlight
                ? 'bg-warning/90 text-neutral-950 hover:bg-warning'
                : 'bg-black/60 text-white hover:bg-black/80',
              readOnlyHighlight && 'opacity-40 hover:bg-black/60'
            )}
          >
            <Icon name="star" size="sm" />
          </button>
        ) : null}

        {hint ? (
          <p
            role="status"
            data-video-hint
            className="absolute left-2 bottom-2 max-w-[55%] rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white"
          >
            {hint}
          </p>
        ) : null}

        <button
          type="button"
          role="switch"
          aria-checked={captions}
          aria-label={captions ? 'Captions on' : 'Captions off'}
          onClick={() => setCaptions((on) => !on)}
          className="btn-kind-control absolute left-2 bottom-2 px-2 inline-flex items-center justify-center rounded-md bg-black/60 text-[11px] font-semibold text-white hover:bg-black/80"
        >
          {captions ? 'Captions on' : 'Captions off'}
        </button>
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
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
        </div>
      </div>

      <button
        type="button"
        aria-label="Match timeline"
        className="relative block h-7 w-full shrink-0 cursor-pointer"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          onSeek(((e.clientX - box.left) / box.width) * total)
        }}
      >
        {/* The stripe fills the 28px strip. */}
        <span className="relative block h-full bg-bg-elevated border-b border-border overflow-hidden">
        {blocks.map((b, i) => (
          <span
            key={i}
            className={cn(
              'absolute top-1 bottom-1 rounded-[1px]',
              b.winner === 'me' ? 'bg-side-me' : 'bg-side-them',
              !b.current && 'opacity-40'
            )}
            style={{ left: pct(b.a), width: `max(2px, ${((b.b - b.a) / total) * 100}%)` }}
          />
        ))}
        {open ? (
          <>
            <span
              className="absolute top-0 bottom-0 bg-warning/40"
              style={{ left: pct(open.a), width: `max(3px, ${((open.b - open.a) / total) * 100}%)` }}
            />
            {open.ticks.map((g, i) => (
              <span key={i} className="absolute top-0 bottom-0 w-px bg-warning" style={{ left: pct(g) }} />
            ))}
          </>
        ) : null}
        {segs.slice(1).map((s) => (
          <span
            key={s.id}
            className="absolute top-0 bottom-0 w-0.5 bg-border-strong"
            style={{ left: pct(s.offset) }}
          />
        ))}
        <span
          className="absolute top-0 bottom-0 w-0.5 bg-brand-primary"
          style={{ left: pct(player.time) }}
        />
        </span>
      </button>
    </div>
  )
}
