import type { Dispatch, ReactNode } from 'react'
import {
  ENDS,
  NAMES,
  depthOf,
  hintOf,
  hit,
  isMis,
  isWin,
  mismatchText,
  nOf,
  nobodyHidden,
  pointDone,
  rallyPage,
  roleOf,
  tagAt,
  type Code,
  type Draft,
  type Side,
} from '@/rules/rally'
import { Btn, Cap, Field } from '@/ui/Btn'
import type { Action } from './tagger'

const SIDES: Side[] = ['me', 'them']
const tone = (s: Side) => (s === 'me' ? 'you' : 'kim')

function Who({ s }: { s: Side }) {
  return <span className={s === 'me' ? 'text-you' : 'text-kim'}>{NAMES[s]}</span>
}

function ShotLabel({ d, k, extra }: { d: Draft; k: number; extra?: string }) {
  return (
    <>
      Shot {k}
      {extra ? `, ${extra}` : ''} <span className="text-chalk-faint">·</span> <Who s={hit(d, k)} />
    </>
  )
}

function StrokeGrid({ d, k, label, go }: { d: Draft; k: number; label: ReactNode; go: Dispatch<Action> }) {
  const cur = tagAt(d, k)
  const rows: Code[][] = [
    ['BHA', 'FHA'],
    ['BHC', 'FHC'],
  ]
  return (
    <div className="flex flex-col gap-1" data-q="stroke">
      <Cap>{label}</Cap>
      {rows.map((r) => (
        <div key={r[0]} className="flex gap-1.5">
          {r.map((c) => (
            <Btn key={c} grow on={cur === c} label={`${c.slice(0, 2)} ${roleOf(d, k, c)}`} onClick={() => go({ type: 'stroke', k, c })}>
              <span className="font-bold">{c.slice(0, 2)}</span>
              <span className="font-medium opacity-80">{roleOf(d, k, c)}</span>
            </Btn>
          ))}
        </div>
      ))}
    </div>
  )
}

function Alert({ children }: { children: ReactNode }) {
  return <div className="border-l-[3px] border-alert pl-2.5 text-sm font-semibold text-alert">{children}</div>
}

export function QuestionPanel({ d, go, now }: { d: Draft; go: Dispatch<Action>; now: () => number }) {
  const n = nOf(d)
  const mis = isMis(d)
  const hint = hintOf(d)

  if (d.add)
    return (
      <div className="flex flex-1 flex-col gap-2" data-panel="add">
        <Cap>Add missed</Cap>
        <p className="text-sm text-chalk-mute">The video plays from the serve. Tap as the missed shot is played.</p>
        <button
          type="button"
          data-add-pad
          onPointerDown={() => go({ type: 'addTap', t: +now().toFixed(2) })}
          className="flex min-h-0 flex-1 items-center justify-center rounded-card border-[1.5px] border-ball bg-ball/10 text-base font-semibold text-ball"
        >
          Tap the missed shot
        </button>
        <Btn onClick={() => go({ type: 'addCancel' })}>Cancel</Btn>
      </div>
    )

  if (d.check)
    return (
      <div className="flex flex-col gap-3" data-panel="check">
        <Cap>Check</Cap>
        {mis ? <Alert>{mismatchText(d)}</Alert> : <p className="text-sm font-semibold text-you">It adds up now.</p>}
        <p className="text-sm text-chalk-mute">Half speed. Tap the minus on an extra contact.</p>
        <Btn tone="ball" on={!mis} onClick={() => go({ type: 'check' })}>
          Done
        </Btn>
      </div>
    )

  if (d.q === 'end') {
    const strokeOk = !mis && n >= 2 && pointDone(d)
    return (
      <div className="flex flex-col gap-2.5" data-panel="end">
        <Field label="End">
          {ENDS.map((e) => (
            <Btn key={e} grow on={d.end === e} tone={isWin(e) ? 'chalk' : 'alert'} onClick={() => go({ type: 'end', e })}>
              {e}
            </Btn>
          ))}
        </Field>
        <Field label="Point to">
          {SIDES.map((s) => (
            <Btn key={s} grow on={d.point === s} tone={tone(s)} hint={hint === s && d.point !== s} disabled={!d.end} onClick={() => go({ type: 'point', s })}>
              {NAMES[s]}
            </Btn>
          ))}
        </Field>
        {mis ? (
          <div className="flex flex-col gap-2" data-mismatch>
            <Alert>{mismatchText(d)}</Alert>
            {n >= 2 ? (
              <div className="flex gap-1.5" data-fixes>
                <Btn grow on tone="ball" onClick={() => go({ type: 'deleteLast' })}>
                  Delete last
                </Btn>
                <Btn grow onClick={() => go({ type: 'deleteFirst' })}>
                  Delete first
                </Btn>
                <Btn onClick={() => go({ type: 'check' })}>Check</Btn>
                <Btn on={d.more} onClick={() => go({ type: 'more' })}>
                  More
                </Btn>
              </div>
            ) : null}
            {n < 2 || d.more ? (
              <div className="flex gap-1.5" data-more>
                <Btn size="sm" grow onClick={() => go({ type: 'addStart' })}>
                  Add missed
                </Btn>
                <Btn size="sm" grow onClick={() => go({ type: 'switchServer' })}>
                  Switch server
                </Btn>
                <Btn size="sm" grow onClick={() => go({ type: 'keep' })}>
                  Keep as is
                </Btn>
              </div>
            ) : null}
          </div>
        ) : null}
        {strokeOk ? <StrokeGrid d={d} k={n} label={<ShotLabel d={d} k={n} extra="last" />} go={go} /> : null}
        {d.note ? <p className="text-xs font-semibold text-ball">{d.note}</p> : null}
        {d.one && !d.point ? <p className="text-xs text-chalk-mute">Rally one. Point to sets the server.</p> : null}
      </div>
    )
  }

  if (d.q === 'serve')
    return (
      <div className="flex flex-col gap-2.5" data-panel="serve">
        {d.one ? null : (
          <Field label="Server">
            {SIDES.map((s) => (
              <Btn key={s} grow on={d.server === s} tone={tone(s)} onClick={() => go({ type: 'server', s })}>
                {NAMES[s]}
              </Btn>
            ))}
          </Field>
        )}
        <Field label="Length">
          {(['Short', 'Long'] as const).map((v) => (
            <Btn key={v} grow on={depthOf(d) === v} onClick={() => go({ type: 'serve', v })}>
              {v}
            </Btn>
          ))}
        </Field>
        {d.cut ? (
          <div className="flex items-center gap-2" data-toss>
            <span className="text-sm font-semibold text-ball">Shot 1 the toss?</span>
            <div className="flex-1" />
            <Btn size="sm" onClick={() => go({ type: 'toss' })}>
              Delete first instead
            </Btn>
          </div>
        ) : null}
        {d.note ? <p className="text-xs font-semibold text-ball">{d.note}</p> : null}
      </div>
    )

  if (typeof d.q === 'number') {
    const k = d.q
    return (
      <div className="flex flex-col gap-2.5" data-panel={`shot-${k}`}>
        {rallyPage(d, k) ? (
          <Field label={`Who attacked first? Optional, shots 5 to ${n - 3}`}>
            {SIDES.map((s) => (
              <Btn key={s} grow on={d.first === s} tone={tone(s)} onClick={() => go({ type: 'first', w: s })}>
                {NAMES[s]}
              </Btn>
            ))}
            {nobodyHidden(d) ? null : (
              <Btn grow on={d.first === 'none'} onClick={() => go({ type: 'first', w: 'none' })}>
                Nobody
              </Btn>
            )}
          </Field>
        ) : null}
        <StrokeGrid d={d} k={k} label="Stroke" go={go} />
      </div>
    )
  }
  return null
}
