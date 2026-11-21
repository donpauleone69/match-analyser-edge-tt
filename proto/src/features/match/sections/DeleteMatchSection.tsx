import { useState } from 'react'
import { Button } from '@/ui-mine'
import { isUntouched } from '@/rules/match'
import type { MatchRecord } from '@/types/match'
import { ConfirmBlock } from '../blocks/ConfirmBlock'

export function DeleteMatchSection({
  match,
  archiving,
  onDelete,
}: {
  match: MatchRecord
  archiving: boolean
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming || archiving) {
    return (
      <Button
        kind="control"
        variant="ghost"
        disabled={archiving}
        onClick={() => (isUntouched(match) ? onDelete() : setConfirming(true))}
      >
        Delete match
      </Button>
    )
  }

  return (
    <ConfirmBlock label="Delete match">
      <p>Delete this match and its tagging? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <Button kind="control" onClick={onDelete}>
          Delete
        </Button>
        <Button kind="control" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </ConfirmBlock>
  )
}
