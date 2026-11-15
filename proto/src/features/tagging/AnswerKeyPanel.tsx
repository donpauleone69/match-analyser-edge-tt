import { useSyncExternalStore } from 'react'
import { cn } from '@/helpers/utils'
import {
  KEY_FIELDS,
  KEY_FIELD_LABEL,
  answerKey,
  type KeyRally,
  type KeyVideo,
  type RallyKey,
} from './answerKey'
import type { Side } from './rally'
import { formatClock } from './timeline'

/** Off until switched on. Kept outside the panel so it survives the list closing. */
let shown = false
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
function setShown(next: boolean) {
  shown = next
  listeners.forEach((fn) => fn())
}

const signed = (late: number) => {
  const hundredths = Math.round(Math.abs(late) * 100)
  if (hundredths < 1) return 'on time'
  const text = hundredths % 10 === 0 ? (hundredths / 100).toFixed(1) : (hundredths / 100).toFixed(2)
  return `${text}s ${late > 0 ? 'late' : 'early'}`
}

function RallyRow({ k, names }: { k: RallyKey; names: Record<Side, string> }) {
  const wrong = k.checks.filter((c) => !c.ok)
  const allRight = wrong.length === 0
  return (
    <li
      className={cn(
        'rounded-md border bg-bg-card px-2 py-1.5',
        allRight ? 'border-border' : 'border-danger/60'
      )}
      data-key-rally={k.index + 1}
      data-key-right={k.right}
      data-key-of={k.of}
    >
      <p className="flex items-center justify-between gap-2 text-xs text-primary">
        <span className="font-semibold tabular-nums">
          Rally {k.index + 1}
          <span className="ml-1.5 font-normal text-muted">{formatClock(k.at)}</span>
        </span>
        <span className={cn('font-semibold tabular-nums', allRight ? 'text-success' : 'text-danger')}>
          {k.right} of {k.of}
        </span>
      </p>
      {wrong.flatMap((c) => {
        const lines = c.notes?.length ? c.notes : [`was ${c.want}, tagged ${c.got}`]
        const bare = Boolean(c.notes?.length)
        return lines.map((line, i) => (
          <p key={`${c.field}-${i}`} className="mt-0.5 text-xs text-muted" data-key-wrong={c.field}>
            {bare ? (
              line
            ) : (
              <>
                <span className="font-semibold text-primary">{KEY_FIELD_LABEL[c.field]}</span> {line}
              </>
            )}
          </p>
        ))
      })}
      {k.checks.every((c) => c.field !== 'taps' || c.ok) && k.taggedWinner !== null && k.taggedWinner !== k.winner ? (
        <p className="mt-0.5 text-xs text-muted" data-key-wrong="point">
          <span className="font-semibold text-primary">Point</span> was {names[k.winner]}, tagged{' '}
          {names[k.taggedWinner]}
        </p>
      ) : null}
    </li>
  )
}

/**
 * The switch and, when it is on, what the demo video really played against
 * what was tagged: a total, a count per field, then each rally with what is
 * wrong on it. Shows nothing for a match with no demo video.
 */
export function AnswerKeyPanel({
  videos,
  rallies,
  names,
  className,
}: {
  videos: KeyVideo[]
  /** The saved rallies to mark, in list order. */
  rallies: KeyRally[]
  names: Record<Side, string>
  className?: string
}) {
  const on = useSyncExternalStore(subscribe, () => shown)
  if (!videos.some((v) => v.script)) return null
  const key = on ? answerKey(videos, rallies, names) : null
  const pct = key && key.total.of > 0 ? Math.round((key.total.right / key.total.of) * 100) : 0

  return (
    <section className={cn('px-3 py-2 space-y-2', className)} aria-label="Answer key" data-answer-key={on ? 'on' : 'off'}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setShown(!on)}
        className="flex min-h-11 lg:min-h-8 w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Answer key</span>
        <span
          aria-hidden
          className={cn(
            'relative h-6 w-10 shrink-0 rounded-full border transition-colors',
            on ? 'bg-brand-primary border-brand-primary' : 'bg-pill-idle border-pill-idle-border'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-[left]',
              on ? 'left-[18px]' : 'left-0.5'
            )}
          />
        </span>
      </button>

      {key ? (
        key.rallies.length + key.extra.length === 0 ? (
          <p className="text-xs text-muted">Nothing saved to mark yet.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-primary tabular-nums" data-key-total>
              {key.total.right} of {key.total.of} right · {pct}%
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted tabular-nums" data-key-fields>
              {KEY_FIELDS.filter((f) => key.byField[f].of > 0).map((f) => (
                <span key={f} className={cn(key.byField[f].right < key.byField[f].of && 'text-danger')}>
                  {KEY_FIELD_LABEL[f]} {key.byField[f].right}/{key.byField[f].of}
                </span>
              ))}
            </p>
            {key.timing ? (
              <p className="text-xs text-muted tabular-nums" data-key-timing>
                Timing {signed(key.timing.late)} at worst
              </p>
            ) : null}
            {key.missed.length > 0 ? (
              <p className="text-xs text-danger" data-key-missed>
                {key.missed.length} {key.missed.length === 1 ? 'rally' : 'rallies'} in the video not tagged:{' '}
                {key.missed.map((m) => formatClock(m.at)).join(', ')}
              </p>
            ) : null}
            {key.extra.length > 0 ? (
              <p className="text-xs text-danger" data-key-extra>
                Tagged where the video has no rally: {key.extra.map((e) => `Rally ${e.index + 1}`).join(', ')}
              </p>
            ) : null}
            <ul className="space-y-1">
              {[...key.rallies].reverse().map((k) => (
                <RallyRow key={k.id} k={k} names={names} />
              ))}
            </ul>
          </>
        )
      ) : null}
    </section>
  )
}
