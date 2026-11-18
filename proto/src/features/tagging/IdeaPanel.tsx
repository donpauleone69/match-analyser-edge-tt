import type { ReactNode } from 'react'
import { Answer, Name } from './AnswerCells'
import type { DetailQ } from './ideaFlow'
import type { Draft, Side } from './rally'

function Choice({ label, onClick }: { label: string; onClick: () => void }) {
  return <Answer label={label} on={false} onClick={onClick} />
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-row={label} className="space-y-1">
      <Name>{label}</Name>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

/** The spine result row, once the contacts have closed. */
export function IdeaLivePanel({
  draft,
  names,
  onResult,
  onLet,
}: {
  draft: Draft
  names: Record<Side, string>
  onResult: (result: string) => void
  onLet?: () => void
}) {
  const n = draft.contacts.length
  const last = n % 2 === 1 ? draft.server : draft.server === 'me' ? 'them' : 'me'
  return (
    <div className="flex flex-col gap-2.5 pt-2.5" data-idea-live="spine">
      <Row label={`Result, ${names[last]}`}>
        {['Winner', 'Net', 'Long', 'Wide'].map((label) => (
          <Choice key={label} label={label} onClick={() => onResult(label)} />
        ))}
      </Row>
      {onLet ? (
        <button type="button" className="self-start text-xs font-semibold text-muted underline-offset-2 hover:underline" onClick={onLet}>
          Let
        </button>
      ) : null}
    </div>
  )
}

/** One question in a sweep. */
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
