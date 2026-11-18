import { hit, markOf, nOf, openerOf, partsOf, type Draft, type Mark, type Part } from '@/rules/rally'
import { Icon } from '@/ui/Icon'

const CELL: Record<'me' | 'them', Record<Mark, string>> = {
  me: {
    now: 'bg-you text-you-ink border-you',
    done: 'bg-you/20 text-chalk border-you/50',
    todo: 'bg-transparent text-chalk-mute border-you/70 border-dashed',
    off: 'bg-you/[0.07] text-chalk-faint border-transparent',
  },
  them: {
    now: 'bg-kim text-kim-ink border-kim',
    done: 'bg-kim/20 text-chalk border-kim/50',
    todo: 'bg-transparent text-chalk-mute border-kim/70 border-dashed',
    off: 'bg-kim/[0.07] text-chalk-faint border-transparent',
  },
}

type Props = {
  d: Draft
  onCell?: (k: number) => void
  onPart?: (p: Part) => void
  onStar?: () => void
  onCheck?: () => void
  playing?: number | null
  title?: string
}

export function RallyStrip({ d, onCell, onPart, onStar, onCheck, playing, title }: Props) {
  const n = nOf(d)
  const o = openerOf(d)
  const minus = d.check && n > 1
  return (
    <div className="flex flex-col gap-1.5" data-strip>
      <div className="flex h-8 items-center gap-2">
        <span className="title text-sm">{title ?? `Rally ${d.no}`}</span>
        {d.saved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-you/15 px-2 py-0.5 text-[11px] font-semibold text-you">
            <Icon name="check" size={11} />
            Saved
          </span>
        ) : null}
        {d.kept ? <span className="rounded-full bg-alert/15 px-2 py-0.5 text-[11px] font-semibold text-alert">Check the point</span> : null}
        <div className="flex-1" />
        {onStar ? (
          <button
            type="button"
            aria-label="Star"
            aria-pressed={d.star}
            onClick={onStar}
            className={`flex h-8 w-9 items-center justify-center rounded-btn border-[1.5px] ${d.star ? 'border-flag bg-flag/15 text-flag' : 'border-transparent bg-ink-2 text-chalk-mute'}`}
          >
            <Icon name="star" size={16} fill={d.star} />
          </button>
        ) : null}
        {onCheck ? (
          <button
            type="button"
            aria-pressed={d.check}
            onClick={onCheck}
            className={`h-8 rounded-btn border-[1.5px] px-3 text-xs font-semibold ${d.check ? 'border-chalk bg-chalk text-ink-0' : 'border-transparent bg-ink-2 text-chalk'}`}
          >
            Check
          </button>
        ) : null}
      </div>
      <div className={`flex w-full gap-1.5 ${minus ? 'pr-1.5' : ''}`}>
        {partsOf(d).map((g) => {
          const k = g.to - g.from + 1
          const marked = d.review.includes(g.part)
          const cells: number[] = []
          for (let i = g.from; i <= g.to; i++) cells.push(i)
          return (
            <div key={g.part} className="flex min-w-max flex-col gap-1" style={{ flex: `${k} ${k} 0`, maxWidth: k * 40 + (k - 1) * 3 }}>
              <div className="flex gap-[3px]">
                {cells.map((i) => {
                  const side = hit(d, i)
                  const mark = d.check ? 'done' : markOf(d, i)
                  const fa = typeof o === 'number' && o === i
                  return (
                    <button
                      key={d.contacts[i - 1].id}
                      type="button"
                      data-cell={i}
                      data-mark={mark}
                      onClick={() => onCell?.(i)}
                      className={`relative flex h-10 min-w-[22px] flex-1 items-center justify-center rounded-cell border-[1.5px] font-mono text-[13px] font-bold ${CELL[side][mark]} ${playing === i ? 'outline outline-2 outline-offset-1 outline-chalk' : ''}`}
                    >
                      {fa ? <span className={`absolute inset-x-1.5 top-[3px] h-[3px] rounded-full ${mark === 'now' ? 'bg-ink-0/70' : 'bg-chalk'}`} /> : null}
                      {i}
                      {mark === 'done' && !d.check ? <span className={`absolute bottom-[3px] h-1 w-1 rounded-full ${side === 'me' ? 'bg-you' : 'bg-kim'}`} /> : null}
                      {minus ? (
                        <span
                          role="button"
                          aria-label={`Delete contact ${i}`}
                          className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-alert text-alert-ink"
                        >
                          <Icon name="minus" size={12} />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {onPart ? (
                <button
                  type="button"
                  aria-pressed={marked}
                  data-part={g.part}
                  onClick={() => onPart(g.part)}
                  className={`flex h-7 items-center justify-center gap-1 rounded-md border px-1.5 text-cap font-bold uppercase ${marked ? 'border-flag bg-flag text-flag-ink' : 'border-ink-4 bg-ink-1 text-chalk-mute'}`}
                >
                  {marked ? <Icon name="flag" size={11} /> : null}
                  {g.part}
                </button>
              ) : (
                <div className={`flex items-center gap-1 border-t-2 pt-0.5 text-cap font-bold uppercase ${marked ? 'border-flag text-flag' : 'border-ink-4 text-chalk-faint'}`}>
                  {marked ? <Icon name="flag" size={10} /> : null}
                  {g.part}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
