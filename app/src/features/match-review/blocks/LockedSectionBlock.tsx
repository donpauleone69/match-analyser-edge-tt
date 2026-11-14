/**
 * LockedSectionBlock — grey shell for sections that are not available yet
 */

import { Badge, Card, Icon } from '@/ui-mine'

export interface LockedSectionBlockProps {
  /** Section letter, e.g. "B" */
  id: string
  title: string
  question: string
  note?: string
}

export function LockedSectionBlock({ id, title, question, note }: LockedSectionBlockProps) {
  return (
    <Card className="p-3 border border-dashed border-border bg-bg-card opacity-70">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-neutral-300">
          <span className="text-neutral-500 mr-2">{id}</span>
          {title}
        </h3>
        <Badge variant="outline" className="gap-1 text-neutral-500 border-border">
          <Icon name="clock" size="xs" />
          Coming
        </Badge>
      </div>
      <p className="mt-1 text-sm italic text-neutral-500">{question}</p>
      {note && <p className="mt-2 text-xs text-neutral-500">{note}</p>}
    </Card>
  )
}
