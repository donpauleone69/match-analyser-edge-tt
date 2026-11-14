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
    <Card className="p-2.5 shadow-sm bg-bg-card opacity-70">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted">
          <span className="text-muted/80 mr-1.5">{id}</span>
          {title}
        </h3>
        <Badge variant="outline" className="gap-1 text-muted text-[10px]">
          <Icon name="clock" size="xs" />
          Coming
        </Badge>
      </div>
      <p className="mt-0.5 text-xs italic text-muted">{question}</p>
      {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </Card>
  )
}
