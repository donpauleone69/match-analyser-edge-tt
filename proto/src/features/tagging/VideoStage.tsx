import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/ui-mine'
import type { VideoAsset } from '@/data/demoStore'
import { cn } from '@/helpers/utils'
import { SPEED_STEPS, servesText, type Side } from './rally'
import { sceneAt, type VideoScript } from './script'
import { formatClock, totalDuration, type Segment } from './timeline'
import type { Player } from './usePlayer'

/** Drawn table and ball that follow the script. Stands in for real footage. */
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
  const label = useRef<HTMLParagraphElement>(null)
  const bats = useRef<Record<Side, HTMLDivElement | null>>({ me: null, them: null })

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
        } else {
          b.style.opacity = '0'
        }
      }
      for (const side of ['me', 'them'] as const) {
        const bat = bats.current[side]
        if (bat) {
          bat.style.transform = `translateY(-50%) scale(${scene.hit === side ? 1.6 : 1})`
          bat.style.filter = scene.hit === side ? 'brightness(1.8)' : ''
        }
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
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white/90" />
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/40" />
      </div>
      {(['me', 'them'] as const).map((side) => (
        <div key={side}>
          <div
            ref={(node) => {
              bats.current[side] = node
            }}
            className={cn(
              'absolute top-1/2 h-[18%] w-[2.2%] rounded-full transition-transform duration-75',
              side === 'me' ? 'left-[10%] bg-side-me' : 'right-[10%] bg-side-them'
            )}
            style={{ transform: 'translateY(-50%)' }}
          />
          <p
            className={cn(
              'absolute top-[62%] w-[14%] truncate text-center text-[10px] font-semibold text-white/80',
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

export type TimelineBlock = { a: number; b: number; winner: Side; current: boolean }

function Transport({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-md bg-black/60 text-white text-xs font-semibold hover:bg-black/80"
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
  className,
}: {
  player: Player
  videos: VideoAsset[]
  names: Record<Side, string>
  bug: { sets: Record<Side, number>; points: Record<Side, number>; server: Side; setId: number }
  blocks: TimelineBlock[]
  open: { a: number; b: number; ticks: number[] } | null
  className?: string
}) {
  const segs: Segment[] = player.segs
  const total = totalDuration(segs) || 1
  const seg = segs[player.segIndex]
  const video = videos[player.segIndex]
  const pct = (g: number) => `${Math.min(100, Math.max(0, (g / total) * 100))}%`
  const speedIndex = Math.max(0, SPEED_STEPS.indexOf(player.rate as (typeof SPEED_STEPS)[number]))

  return (
    <div className={className}>
      <div className="relative w-full aspect-video bg-black overflow-hidden" data-video-kind={video?.kind}>
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
          <StandIn script={video.script} offset={seg.offset} getTime={player.getTime} names={names} />
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

        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <Transport label="Back 10 seconds" onClick={() => player.seek(player.getTime() - 10)}>
            <Icon name="rewind" size="sm" />
          </Transport>
          <Transport
            label={player.playing ? 'Pause' : 'Play video'}
            onClick={() => (player.playing ? player.pause() : player.play())}
          >
            <Icon name={player.playing ? 'pause' : 'play'} size="sm" />
          </Transport>
          <Transport label="Forward 10 seconds" onClick={() => player.seek(player.getTime() + 10)}>
            <Icon name="forward" size="sm" />
          </Transport>
          <Transport
            label={`Speed ${player.rate}x`}
            onClick={() => player.setRate(SPEED_STEPS[(speedIndex + 1) % SPEED_STEPS.length])}
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
        className="relative block h-5 w-full bg-bg-elevated border-b border-border overflow-hidden cursor-pointer"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          player.seek(((e.clientX - box.left) / box.width) * total)
        }}
      >
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
      </button>
    </div>
  )
}
