import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { restStyle } from './AnswerCells'
import { bestOpener, cellMark, PART_LABEL, partsOf, type BestAt } from './bestFlow'
import { filled, PartLabel, railCell, shotPaint } from './BestPanel'
import { hitterOf, type Draft, type Side } from './rally'
import { zoneButton, zonePressed, zoneRest } from './zoneButton'

/**
 * The Rally Zone. One layout for every state: a head, the score before the
 * point, a word when the row is a gap or an insert, then the actions. The
 * shot row and the part row sit under it. A mode only changes what fills
 * those places.
 */
export type RallyState = 'before' | 'gap' | 'insert' | 'tapping' | 'answering' | 'saved' | 'editing'

export function RallyZone({
  state,
  draft,
  at,
  rallyOne,
  saved,
  focus,
  flash,
  rallyNo,
  names,
  server,
  score,
  word,
  tight,
  pressed,
  onEdit,
  onStar,
  onDiscard,
  onCancel,
  onServer,
}: {
  state: RallyState
  draft: Draft | null
  at: BestAt | null
  rallyOne: boolean
  saved: boolean
  focus: number | 'end' | null
  flash: number
  rallyNo: number
  names: Record<Side, string>
  /** Null before the first serve is picked. The head is then grey and numbered. */
  server: Side | null
  /** Score before this point, already formatted, such as "6 - 4". */
  score: string
  /** "Gap 7 s", "Gap, overlap", or "Insert". Empty on a rally. */
  word: string | null
  tight: boolean
  pressed: boolean
  onEdit?: () => void
  onStar?: () => void
  onDiscard?: () => void
  onCancel?: () => void
  /** The insert head switches the server. */
  onServer?: () => void
}) {
  const n = draft?.contacts.length ?? 0
  const closed = Boolean(draft?.closed && n > 0)
  const parts = closed && draft ? partsOf(draft) : []
  const opener = closed && draft ? bestOpener(n, draft.shots, draft.best?.first) : null
  const fa = typeof opener === 'number' ? opener : null
  const tapping = state === 'tapping' || (state === 'insert' && n > 0) || (state === 'before' && n > 0)
  const groupOf = (shot: number) => parts.findIndex((p) => shot >= p.from && shot <= p.to)
  const columns = closed
    ? parts.map((p) => `repeat(${p.to - p.from + 1}, minmax(24px, var(--btn-kind-control)))`).join(' 0px ')
    : `repeat(${Math.max(n + 1, 1)}, minmax(24px, var(--btn-kind-control)))`
  const dashed = server === null || state === 'gap' || state === 'insert' || (state === 'before' && n === 0)
  const headClass = cn(
    'inline-flex h-8 min-w-0 items-center gap-1 rounded-md border px-2 text-sm font-semibold',
    tight ? 'max-w-[36%]' : 'max-w-[40%]',
    dashed && 'border-dashed',
  )
  const headStyle = server
    ? shotPaint(server, false, false, false)
    : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }
  const head = (
    <>
      <span className="shrink-0">{rallyNo}</span>
      {server ? <span className="min-w-0 truncate">{names[server]}</span> : null}
      {onServer ? <Icon name="swap" size="xs" /> : null}
    </>
  )

  return (
    <div data-rally-zone data-rally-state={state} data-best-rail data-best-saved={saved ? '' : undefined} className="flex min-w-0 flex-col gap-1">
      <div className="flex h-8 min-w-0 items-center gap-1.5">
        {onServer ? (
          <button
            type="button"
            data-rally-head
            data-best-server={server ?? undefined}
            data-rally-grey={server ? undefined : ''}
            aria-label="Switch server"
            className={headClass}
            style={headStyle}
            onClick={onServer}
          >
            {head}
          </button>
        ) : (
          <span
            data-rally-head
            data-best-server={server ?? undefined}
            data-rally-grey={server ? undefined : ''}
            className={headClass}
            style={headStyle}
          >
            {head}
          </span>
        )}
        <span data-rally-score className="shrink-0 text-sm text-primary">
          at {score}
        </span>
        {word ? (
          <span data-rally-word className="shrink-0 text-sm text-primary">
            {word}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          {onDiscard ? (
            <button type="button" data-rally-discard className={zoneButton} style={zoneRest()} onClick={onDiscard}>
              Discard
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" data-insert-cancel className={zoneButton} style={zoneRest()} onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          {onStar ? (
            <button
              type="button"
              data-best-star="rally"
              aria-label="Highlight this rally"
              aria-pressed={Boolean(draft?.highlight)}
              className={cn(zoneButton, 'w-8 px-0')}
              style={draft?.highlight ? zonePressed() : zoneRest()}
              onClick={onStar}
            >
              <Icon name="star" size="xs" />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              data-best-check
              aria-pressed={pressed}
              aria-label="Edit Rally"
              className={zoneButton}
              style={pressed ? zonePressed() : zoneRest()}
              onClick={onEdit}
            >
              Edit Rally
            </button>
          ) : null}
        </span>
      </div>
      <div className="grid min-w-0 justify-start gap-x-1 gap-y-1" style={{ gridTemplateColumns: columns }} data-best-cells>
        {draft
          ? draft.contacts.map((_, i) => {
              const shot = i + 1
              const side = hitterOf(draft.server, shot)
              const g = groupOf(shot)
              const mark = closed ? cellMark(draft, shot, rallyOne, at) : null
              const open = mark === 'now'
              const isFa = fa === shot && !open
              const tags = draft.shots[i]
              const focused = focus === shot
              return (
                <span
                  key={shot}
                  data-best-chip={shot}
                  data-best-mark={mark ?? ''}
                  data-best-wing={tags?.wing ?? ''}
                  data-best-stroke={tags?.stroke ?? ''}
                  data-best-flash={flash === i ? '' : undefined}
                  data-edit-focus={focused ? '' : undefined}
                  aria-current={open || focused ? 'step' : undefined}
                  className={cn(
                    railCell,
                    'min-w-0 px-0',
                    isFa && 'border-2',
                    mark === 'todo' && 'border-dashed',
                    mark === 'off' && 'opacity-45',
                    flash === i && 'ring-2 ring-warning',
                    focused && 'edit-stop-on',
                  )}
                  style={{
                    ...shotPaint(side, open || focused, isFa, false),
                    gridRow: 1,
                    gridColumn: closed ? shot + g : shot,
                    ...(mark === 'todo' && !isFa
                      ? { borderColor: side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)' }
                      : {}),
                  }}
                >
                  {shot}
                  {mark === 'done' ? (
                    <span aria-hidden className="absolute right-0.5 top-0 text-[9px] font-bold leading-3" data-best-done>
                      ✓
                    </span>
                  ) : null}
                </span>
              )
            })
          : null}
        {tapping || n === 0 ? (
          <span
            aria-hidden
            data-best-ghost
            className={cn(railCell, 'min-w-0 border-dashed border-border px-0 text-muted opacity-60')}
            style={{ gridRow: 1, gridColumn: n + 1 }}
          >
            {n + 1}
          </span>
        ) : null}
        <span aria-hidden data-best-phases className="h-4" style={{ gridRow: 2, gridColumn: '1 / -1' }} />
        {closed && draft
          ? parts.map((p, g) => {
              const marked = Boolean(draft.best?.review?.includes(p.part))
              return (
                <span
                  key={p.part}
                  data-best-part={p.part}
                  data-best-flag={marked ? '' : undefined}
                  data-label={marked ? `⚑ ${PART_LABEL[p.part]}` : PART_LABEL[p.part]}
                  data-from={p.from}
                  data-to={p.to}
                  className={cn(
                    'flex h-4 min-w-0 items-center justify-center whitespace-nowrap rounded-md border px-0 font-semibold',
                    focus === 'end' && p.part === 'end' && 'edit-stop-on',
                  )}
                  style={{
                    gridRow: 2,
                    gridColumn: `${p.from + g} / span ${p.to - p.from + 1}`,
                    ...(marked ? filled() : { ...restStyle(), color: 'var(--color-text)' }),
                  }}
                >
                  <PartLabel part={p.part} marked={marked} />
                </span>
              )
            })
          : null}
      </div>
    </div>
  )
}
