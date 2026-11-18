import { useEffect, useRef, useState, type Dispatch } from 'react'
import { NAMES, cellOf, hit, isDone, isMis, nOf, other, questionsOf, scoreOf, summaryBits, type Draft } from '@/rules/rally'
import { loopOf } from '@/rules/loop'
import { Icon } from '@/ui/Icon'
import { BarBtn, Score, TopBar } from '@/features/shell/TopBar'
import { QuestionPanel } from './QuestionPanel'
import { RallyStrip } from './RallyStrip'
import { useClock } from './useClock'
import { VideoStage } from './VideoStage'
import type { Action, TagState } from './tagger'

const IDLE_S = 2

function QuestionHead({ d }: { d: Draft }) {
  const n = nOf(d)
  const left = questionsOf(d).filter((q) => !isDone(d, q)).length
  const k = d.q === null ? n : cellOf(d, d.q)
  const who = hit(d, k)
  const title = d.add ? 'Add missed' : d.check ? 'Check' : isMis(d) ? 'Fix the contacts' : d.q === 'end' ? 'End' : d.q === 'serve' ? 'Serve' : `Shot ${k}`
  const sub = d.add || d.check || isMis(d) ? `${n} ${n === 1 ? 'contact' : 'contacts'}` : d.q === 'end' ? (n === 1 ? 'The serve' : `Shot ${n}, the last`) : d.q === 'serve' ? 'Shot 1' : ''
  return (
    <div className="flex shrink-0 items-end gap-2" data-head>
      <div className="flex min-w-0 flex-col">
        <span className="title text-[22px] leading-7">{title}</span>
        <span className="text-xs text-chalk-mute">
          {sub}
          {sub && !(d.add || d.check || isMis(d)) ? ' · ' : ''}
          {d.add || d.check || isMis(d) ? null : <span className={who === 'me' ? 'text-you' : 'text-kim'}>{d.one && !d.point ? 'Server not known' : NAMES[who]}</span>}
        </span>
      </div>
      <div className="flex-1" />
      <span className="pb-0.5 font-mono text-xs text-chalk-faint">{d.add || d.check || isMis(d) ? '' : left > 1 ? `${left} left` : 'Saves on answer'}</span>
    </div>
  )
}

function SavedCard({ d, go }: { d: Draft; go: Dispatch<Action> }) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5 rounded-card bg-ink-1 p-2.5" data-saved-card>
      <RallyStrip d={d} onCell={(k) => go({ type: 'open', k })} onPart={(p) => go({ type: 'part', p })} onStar={() => go({ type: 'star' })} />
      <p className="truncate text-xs text-chalk-mute">{summaryBits(d).join(' · ')}</p>
    </div>
  )
}

function TapPad({ taps, playing, idle, server, onTap }: { taps: number; playing: boolean; idle: number; server: 'me' | 'them'; onTap: () => void }) {
  const [ripple, setRipple] = useState(0)
  return (
    <button
      type="button"
      data-tap-pad
      onPointerDown={() => {
        setRipple((r) => r + 1)
        onTap()
      }}
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-[1.5px] border-ink-3 bg-ink-1 active:bg-ink-2"
    >
      {ripple ? <span key={ripple} className="tap-ripple pointer-events-none absolute h-40 w-40 rounded-full border-2 border-ball" /> : null}
      {!playing ? (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-chalk text-ink-0">
            <Icon name="play" size={26} />
          </span>
          <span className="text-sm font-semibold text-chalk-mute">Play, then tap each contact</span>
        </>
      ) : taps === 0 ? (
        <>
          <span className="title text-base">Tap each contact</span>
          <span className="cap">Anywhere in this pad</span>
        </>
      ) : (
        <>
          <span className="font-mono text-[56px] font-bold leading-none">{taps}</span>
          <span className="cap">{taps === 1 ? 'contact' : 'contacts'}</span>
          <div className="flex max-w-[90%] flex-wrap justify-center gap-[3px]">
            {Array.from({ length: taps }, (_, i) => (
              <span key={i} className={`h-2 w-4 rounded-full ${(i % 2 === 0 ? server : other(server)) === 'me' ? 'bg-you' : 'bg-kim'}`} />
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-4 h-1 overflow-hidden rounded-full bg-ink-3">
            <div className="h-full bg-ball" style={{ width: `${Math.min(100, (idle / IDLE_S) * 100)}%` }} />
          </div>
        </>
      )}
    </button>
  )
}

export function TagScreen({ s, go }: { s: TagState; go: Dispatch<Action> }) {
  const d = s.mode === 'questions' ? s.draft : null
  const loop = d ? loopOf(d) : null
  const clock = useClock(
    d && loop
      ? { id: `q-${d.no}-${loop.label}-${loop.from}-${nOf(d)}`, start: loop.from, rate: loop.rate, playing: s.playing, loop }
      : { id: `live-${s.liveKey}`, start: 0, rate: 1, playing: s.playing },
  )
  const t = clock.t
  const lastTap = s.taps[s.taps.length - 1]
  const idle = lastTap !== undefined ? t - lastTap : 0
  const truthEnd = s.liveTruth[s.liveTruth.length - 1] ?? 0

  const fired = useRef('')
  useEffect(() => {
    if (s.mode !== 'live' || !s.playing) return
    if (s.taps.length && idle >= IDLE_S && fired.current !== `idle-${lastTap}`) {
      fired.current = `idle-${lastTap}`
      go({ type: 'idle' })
    } else if (!s.taps.length && t > truthEnd + 3.5 && fired.current !== `next-${s.liveKey}`) {
      fired.current = `next-${s.liveKey}`
      go({ type: 'nextLive' })
    }
  }, [t, s.mode, s.playing, s.taps.length, idle, lastTap, truthEnd, s.liveKey, go])

  const set = s.sets.find((x) => x.no === s.cur)!
  const score = d ? d.score : scoreOf(set.rallies)
  const server = d ? (d.one && !d.point ? null : d.server) : s.liveServer
  const playingCell = d ? d.contacts.findIndex((c) => Math.abs(c.t - t) < 0.14) + 1 || null : null
  const status = d ? loop!.label : !s.playing ? 'Paused' : s.taps.length ? 'Tagging' : s.lastSaved?.saved && s.lastSaved.no === set.rallies.length ? 'Playing on' : 'Live'

  return (
    <div className="flex h-full flex-col" data-screen="tag" data-mode={s.mode}>
      <TopBar
        left={<Score set={s.cur} score={score} server={server} />}
        right={
          <>
            <BarBtn onClick={() => go({ type: 'sheet', on: true })}>Demo</BarBtn>
            <BarBtn onClick={() => go({ type: 'screen', s: 'overview' })}>
              <Icon name="grid" size={13} />
              Overview
            </BarBtn>
          </>
        }
      />
      <VideoStage
        height={d ? 158 : 221}
        truth={d ? s.draftTruth : s.liveTruth}
        server={d ? s.truthServer : s.liveServer}
        t={t}
        taps={d ? d.contacts.map((c) => c.t) : s.taps}
        status={status}
        live={!d}
        playing={s.playing}
        onPlay={(on) => go({ type: 'play', on })}
        loop={loop ?? undefined}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 pb-3 pt-2" data-tag-body>
        {d ? (
          <>
            <RallyStrip
              d={d}
              playing={playingCell}
              onCell={(k) => go(d.check ? { type: 'minus', k } : { type: 'open', k })}
              onPart={(p) => go({ type: 'part', p })}
              onStar={() => go({ type: 'star' })}
              onCheck={() => go({ type: 'check' })}
            />
            <div className="h-px shrink-0 bg-ink-2" />
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-2" data-question>
              <QuestionHead d={d} />
              <QuestionPanel d={d} go={go} now={() => clock.ref.current} />
            </div>
          </>
        ) : (
          <>
            {s.lastSaved && !s.taps.length ? <SavedCard d={s.lastSaved} go={go} /> : null}
            <TapPad
              taps={s.taps.length}
              playing={s.playing}
              idle={idle}
              server={s.liveServer}
              onTap={() => (s.playing ? go({ type: 'tap', t: +clock.ref.current.toFixed(2) }) : go({ type: 'play', on: true }))}
            />
          </>
        )}
      </div>
    </div>
  )
}
