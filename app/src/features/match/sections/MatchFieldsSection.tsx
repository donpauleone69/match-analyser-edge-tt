import { useEffect, useState } from 'react'
import { Card, CardTitle } from '@/ui-mine'
import type { MatchRecord } from '@/types/match'
import { inputClass, labelClass } from '../styles'

function NameField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(value)
  useEffect(() => {
    setText(value)
  }, [value])
  const commit = () => {
    if (text !== value) onCommit(text)
  }
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

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
        <NameField
          label="Opponent"
          value={match.opponent}
          placeholder="Who you played"
          onCommit={(opponent) => updateMatch(match.id, { opponent })}
        />
        <NameField label="Event" value={match.event} onCommit={(event) => updateMatch(match.id, { event })} />
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
