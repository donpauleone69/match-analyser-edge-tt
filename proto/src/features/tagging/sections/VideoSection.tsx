import type { VideoSectionProps } from '../models'
import { Pressable, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { SPEED_STEPS, servesText } from '@/rules/rally'
import { type Segment } from '@/rules/timeline'
import { StandInBlock } from '../blocks/StandInBlock'
import { TransportBlock } from '../blocks/TransportBlock'

/** The picture, with the score, Settings and transport over it. */
export function VideoSection({
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
  sceneAt,
}: VideoSectionProps) {
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
          <StandInBlock
            script={video.script}
            offset={seg.offset}
            getTime={player.getTime}
            names={names}
            sceneAt={sceneAt}
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
              <Pressable type="button" className="shrink-0 font-bold underline" onClick={toast.extra.run}>
                {toast.extra.label}
              </Pressable>
            ) : null}
            {toast.undo ? (
              <Pressable type="button" className="shrink-0 font-bold underline" onClick={toast.undo}>
                Undo
              </Pressable>
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
          <TransportBlock label="Back 10 seconds" onClick={() => onSeek(player.getTime() - 10)}>
            <Icon name="rewind" size="sm" />
          </TransportBlock>
          <TransportBlock
            label={player.playing ? 'Pause' : 'Play video'}
            disabled={player.atEnd && !player.playing}
            onClick={() => (player.playing ? player.pause() : player.play())}
          >
            <Icon name={player.playing ? 'pause' : 'play'} size="sm" />
          </TransportBlock>
          <TransportBlock
            label="Forward 10 seconds"
            disabled={player.atEnd || noForward}
            onClick={() => onSeek(player.getTime() + 10)}
          >
            <Icon name="forward" size="sm" />
          </TransportBlock>
          <TransportBlock
            label={`Speed ${player.rate}x`}
            onClick={() => onRate(SPEED_STEPS[(speedIndex + 1) % SPEED_STEPS.length])}
          >
            {player.rate}x
          </TransportBlock>
          {video?.kind === 'file' ? (
            <TransportBlock
              label={player.muted ? 'Sound on' : 'Sound off'}
              onClick={() => player.setMuted(!player.muted)}
            >
              <Icon name={player.muted ? 'volume-off' : 'volume'} size="sm" />
            </TransportBlock>
          ) : null}
          {settings}
        </div>
      </div>
    </div>
  )
}
