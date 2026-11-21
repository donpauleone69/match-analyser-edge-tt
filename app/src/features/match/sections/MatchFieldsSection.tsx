import { Card, CardTitle } from '@/ui-mine'
import type { MatchRecord } from '@/types/match'
import { inputClass, labelClass } from '../styles'

export function MatchFieldsSection({
  match,
  updateMatch,
}: {
  match: MatchRecord
  updateMatch: (id: string, patch: Partial<Pick<MatchRecord, 'opponent' | 'event' | 'date'>>) => void
}) {
  return (
    <Card className="space-y-3">
      <CardTitle>Match</CardTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block space-y-1">
          <span className={labelClass}>Opponent</span>
          <input
            className={inputClass}
            value={match.opponent}
            placeholder="Who you played"
            onChange={(e) => updateMatch(match.id, { opponent: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Event</span>
          <input
            className={inputClass}
            value={match.event}
            onChange={(e) => updateMatch(match.id, { event: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            className={inputClass}
            value={match.date}
            onChange={(e) => updateMatch(match.id, { date: e.target.value })}
          />
        </label>
      </div>
    </Card>
  )
}
