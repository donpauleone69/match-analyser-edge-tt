import { Pressable, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { bestOpener, cellMark, partsOf } from '@/rules/bestFa'
import { PartLabel } from '../blocks/PartLabelBlock'
import { railCell, shotPaint, zoneButton, zonePressed, zoneRest } from '../styles'
import { hitterOf } from '@/rules/rally'
import type { RallyZoneView } from '../models'

/**
 * The Rally Zone. One layout for every state: a head, the score before the
 * point, a word when the row is a gap or an insert, then the actions. The
 * shot row and the part lines sit under it. Review fills the shot row with
 * part chips. A mode only changes what fills those places.
 */
export function RallyZoneSection({
  state,
  draft,
  at,
  rallyOne,
  saved,
  focus,
  flash,
  rallyNo,
  headDashed = false,
  names,
  server,
  score,
  word,
  tight,
  pressed,
  reviewFocus,
  starDim,
  onReviewPart,
  onEdit,
  onStar,
  onDiscard,
  onCancel,
  onServer,
}: RallyZoneView) {
  const n = draft?.contacts.length ?? 0
  const closed = Boolean(draft?.closed && n > 0)
  const parts = closed && draft ? partsOf(draft) : []
  const opener = closed && draft ? bestOpener(n, draft.shots, draft.best?.first) : null
  const fa = typeof opener === 'number' ? opener : null
  const tapping = state === 'tapping' || (state === 'insert' && n > 0) || (state === 'before' && n > 0)
  const groupOf = (shot: number) => parts.findIndex((p) => shot >= p.from && shot <= p.to)
  const showEnd = state === 'editing' && closed && parts.length > 0
  const columns = closed
    ? parts.map((p) => `repeat(${p.to - p.from + 1}, minmax(24px, var(--btn-kind-control)))`).join(' 0px ') +
      (showEnd ? ' minmax(24px, var(--btn-kind-control))' : '')
    : `repeat(${Math.max(n + 1, 1)}, minmax(24px, var(--btn-kind-control)))`
  const dashed = headDashed || state === 'gap' || state === 'insert' || state === 'before'
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
          <Pressable
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
          </Pressable>
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
            <Pressable type="button" data-rally-discard className={zoneButton} style={zoneRest()} onClick={onDiscard}>
              Discard
            </Pressable>
          ) : null}
          {onCancel ? (
            <Pressable type="button" data-insert-cancel className={zoneButton} style={zoneRest()} onClick={onCancel}>
              Cancel
            </Pressable>
          ) : null}
          {onStar ? (
            <Pressable
              type="button"
              data-best-star="rally"
              data-guard={starDim ? '' : undefined}
              aria-label="Review"
              aria-pressed={state === 'review'}
              className={cn(zoneButton, 'w-8 px-0', starDim && 'opacity-60')}
              style={state === 'review' ? zonePressed() : zoneRest()}
              onClick={() => {
                if (starDim) return
                onStar()
              }}
            >
              <Icon name="star" size="xs" />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable
              type="button"
              data-best-check
              aria-pressed={pressed}
              aria-label="Edit Rally"
              className={zoneButton}
              style={pressed ? zonePressed() : zoneRest()}
              onClick={onEdit}
            >
              Edit Rally
            </Pressable>
          ) : null}
        </span>
      </div>
      <div className="grid min-w-0 justify-start gap-x-1" style={{ gridTemplateColumns: columns, rowGap: 2 }} data-best-cells>
        {state === 'review' && closed && draft
          ? parts.map((p, g) => {
              const marked = Boolean(draft.best?.review?.includes(p.part))
              const focused = reviewFocus === p.part
              return (
                <Pressable
                  key={p.part}
                  type="button"
                  data-review-chip={p.part}
                  data-part-on={marked ? '' : undefined}
                  data-from={p.from}
                  data-to={p.to}
                  data-edit-focus={focused ? '' : undefined}
                  aria-current={focused ? 'step' : undefined}
                  aria-label={p.part}
                  className={cn(
                    'flex h-4 min-w-0 items-center justify-center whitespace-nowrap rounded-md border px-0 font-semibold',
                    focused && 'edit-stop-on',
                  )}
                  style={{
                    gridRow: 1,
                    gridColumn: `${p.from + g} / span ${p.to - p.from + 1}`,
                    ...(marked ? zonePressed() : zoneRest()),
                  }}
                  onClick={() => onReviewPart?.(p.part)}
                >
                  <PartLabel part={p.part} />
                </Pressable>
              )
            })
          : null}
        {state !== 'review' && draft
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
                  data-rally-grey={server ? undefined : ''}
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
                    mark === 'todo' && server && 'border-dashed',
                    mark === 'off' && 'opacity-45',
                    flash === i && 'ring-2 ring-warning',
                    focused && 'edit-stop-on',
                  )}
                  style={{
                    ...(server
                      ? shotPaint(side, open || focused, isFa, false)
                      : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }),
                    gridRow: 1,
                    gridColumn: closed ? shot + g : shot,
                    ...(server && mark === 'todo' && !isFa
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
        {showEnd && draft ? (
          <span
            data-edit-end=""
            data-edit-focus={focus === 'end' ? '' : undefined}
            aria-current={focus === 'end' ? 'step' : undefined}
            className={cn(railCell, 'min-w-0 px-0', focus === 'end' && 'edit-stop-on')}
            style={{
              gridRow: 1,
              gridColumn: n + parts.length,
              ...(server
                ? shotPaint(draft.best?.point ?? hitterOf(draft.server, Math.max(1, n)), focus === 'end', false, false)
                : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }),
            }}
          >
            End
          </span>
        ) : null}
        {state !== 'review' && (tapping || n === 0) ? (
          <span
            aria-hidden
            data-best-ghost
            className={cn(railCell, 'min-w-0 border-dashed border-border px-0 text-muted opacity-60')}
            style={{ gridRow: 1, gridColumn: n + 1 }}
          >
            {n + 1}
          </span>
        ) : null}
        <span aria-hidden data-best-phases style={{ gridRow: 2, gridColumn: '1 / -1' }} />
        {closed && draft && server
          ? parts.map((p, g) => {
              const marked = Boolean(draft.best?.review?.includes(p.part))
              return (
                <span
                  key={p.part}
                  data-best-part={p.part}
                  data-part-on={marked ? '' : undefined}
                  data-from={p.from}
                  data-to={p.to}
                  className="block min-w-0 rounded-full"
                  style={{
                    gridRow: 2,
                    gridColumn: `${p.from + g} / span ${p.to - p.from + 1}`,
                    backgroundColor: marked ? 'var(--color-warning)' : 'var(--color-border)',
                  }}
                />
              )
            })
          : null}
      </div>
    </div>
  )
}
