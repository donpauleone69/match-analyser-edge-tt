import { useRef, type ChangeEvent } from 'react'
import { Button, Card, CardDescription, CardHead, Icon } from '@/ui-mine'
import { WfBadge } from '@/ui-mine'

export function BackupSection({
  empty,
  storageLine,
  exportLine,
  showKeep,
  report,
  onExport,
  onImport,
  onKeep,
}: {
  empty: boolean
  storageLine: string
  exportLine: string
  showKeep: boolean
  report: string
  onExport: () => void
  onImport: (files: File[]) => void
  onKeep: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  if (empty) return null

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? [...e.target.files] : []
    e.target.value = ''
    if (files.length) onImport(files)
  }

  return (
    <>
      <Card className="space-y-3">
        <CardHead icon="upload" title="Import / export / backup" badge={<WfBadge>data</WfBadge>} />
        <CardDescription>Bundle and sync. Reel download stays on Insights.</CardDescription>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button kind="control" onClick={() => input.current?.click()}>
            <Icon name="upload" size="xs" />
            Import
          </Button>
          <Button kind="control" variant="secondary" onClick={onExport}>
            <Icon name="download" size="xs" />
            Export
          </Button>
          <Button kind="control" variant="secondary" disabled>
            <Icon name="cloud" size="xs" />
            Sync (stub)
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          aria-label="Import match files"
          onChange={onFiles}
        />
        <p className="text-sm text-muted">{storageLine}</p>
        {showKeep ? (
          <Button kind="control" variant="ghost" onClick={onKeep}>
            <Icon name="hard-drive" size="xs" />
            Keep on device
          </Button>
        ) : null}
        <p className="text-sm text-muted">{exportLine}</p>
        {report ? (
          <p className="text-sm text-muted" role="status">
            {report}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <CardHead icon="cloud" title="Permissions notes" />
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-primary">Device:</span> local matches, tags,
            video.
          </li>
          <li>
            <span className="font-semibold text-primary">Cloud:</span> login and optional sync.
          </li>
          <li>
            <span className="font-semibold text-primary">Not here:</span> video is added on the
            match. Reel download on Insights.
          </li>
        </ul>
      </Card>
    </>
  )
}
