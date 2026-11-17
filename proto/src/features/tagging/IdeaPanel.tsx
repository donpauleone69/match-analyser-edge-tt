import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import type { DetailQ } from './ideaFlow'
import type { Draft, Side } from './rally'

const cell =
  'h-8 shrink-0 rounded-md border px-2.5 text-sm font-semibold inline-flex items-center justify-center whitespace-nowrap'

function rest(): React.CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)' }
}

function Name({ children }: { children: string }) {
  return <p className="h-3 text-[10px] font-bold uppercase leading-3 tracking-[0.025em] text-muted">{children}</p>
}

function Choice({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" data-cell={label} onClick={onClick} className={cn(cell, 'text-primary')} style={rest()}>
      {label}
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-row={label} className="space-y-1">
      <Name>{label}</Name>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

/** Winner buttons, or the spine result row, once the contacts have closed. */
export function IdeaLivePanel({
  flow,
  draft,
  names,
  onWinner,
  onResult,
  onLet,
}: {
  flow: 'openend' | 'spine'
  draft: Draft
  names: Record<Side, string>
  onWinner: (side: Side) => void
  onResult: (result: string) => void
  onLet?: () => void
}) {
  const n = draft.contacts.length
  const last = n % 2 === 1 ? draft.server : draft.server === 'me' ? 'them' : 'me'
  return (
    <div className="flex flex-col gap-2.5 pt-2.5" data-idea-live={flow}>
      {flow === 'openend' ? (
        <Row label="Point to">
          <Choice label={names.me} onClick={() => onWinner('me')} />
          <Choice label={names.them} onClick={() => onWinner('them')} />
        </Row>
      ) : (
        <Row label={`Result, ${names[last]}`}>
          {['Winner', 'Net', 'Long', 'Wide'].map((label) => (
            <Choice key={label} label={label} onClick={() => onResult(label)} />
          ))}
        </Row>
      )}
      {onLet ? (
        <button type="button" className="self-start text-xs font-semibold text-muted underline-offset-2 hover:underline" onClick={onLet}>
          Let
        </button>
      ) : null}
    </div>
  )
}

/** One question in the detail pass or a sweep. */
export function IdeaDetailPanel({
  q,
  onPick,
  onBack,
}: {
  q: DetailQ
  onPick: (code: string) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-2.5" data-idea-detail="" data-idea-q={q.kind}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted">Rally {q.index + 1}</p>
        <button type="button" className="text-xs font-semibold text-primary" onClick={onBack} data-idea-back="">
          Back
        </button>
      </div>
      <Row label={q.title}>
        {q.options.map((label) => (
          <Choice key={label} label={label} onClick={() => onPick(label)} />
        ))}
      </Row>
      {q.hint ? <p className="text-xs text-muted">{q.hint}</p> : null}
    </div>
  )
}
