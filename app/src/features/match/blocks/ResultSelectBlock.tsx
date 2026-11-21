import { buttonKindField } from '@/ui-mine'
import { formatScore } from '@/rules/format'
import { REAL_RESULTS } from '@/rules/matchStatus'
import type { MatchResult } from '@/types/match'
import { cn } from '@/helpers/utils'

const resultKey = (r: MatchResult) =>
  r.me !== null && r.them !== null ? `${r.me}-${r.them}` : ''

/** One picker that lists only results a match can end on. */
export function ResultSelectBlock({
  value,
  onChange,
}: {
  value: MatchResult
  onChange: (next: MatchResult) => void
}) {
  const key = resultKey(value)
  const listed = REAL_RESULTS.some((g) => g.results.some((r) => resultKey(r) === key))
  return (
    <select
      aria-label="Result"
      className={cn(
        buttonKindField,
        'rounded-md border border-border bg-bg-card px-2 text-sm font-semibold text-primary'
      )}
      value={key}
      onChange={(e) => {
        const [me, them] = e.target.value.split('-').map(Number)
        onChange(e.target.value === '' ? { me: null, them: null } : { me, them })
      }}
    >
      <option value="">Not entered</option>
      {/* A result saved from tagging that no match can end on still shows as it is. */}
      {key !== '' && !listed ? <option value={key}>{key.replace('-', ' - ')}</option> : null}
      {REAL_RESULTS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.results.map((r) => (
            <option key={resultKey(r)} value={resultKey(r)}>
              {formatScore(r)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
