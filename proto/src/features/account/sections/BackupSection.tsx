import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { WfBadge } from '@/ui-mine'

export function BackupSection({ empty }: { empty: boolean }) {
  return empty ? null : (
    <>
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="upload" size="sm" className="text-brand" />
            <CardTitle>Import / export / backup</CardTitle>
          </div>
          <WfBadge>data</WfBadge>
        </div>
        <CardDescription>Bundle and sync. Reel download stays on Insights.</CardDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Button kind="control" disabled>
            <Icon name="upload" size="xs" />
            Import (stub)
          </Button>
          <Button kind="control" variant="secondary" disabled>
            <Icon name="download" size="xs" />
            Export (stub)
          </Button>
          <Button kind="control" variant="secondary" disabled>
            <Icon name="cloud" size="xs" />
            Sync (stub)
          </Button>
          <Button kind="control" variant="ghost" disabled>
            <Icon name="hard-drive" size="xs" />
            Storage (stub)
          </Button>
        </div>
        <p className="text-sm text-muted">Last export: never (stub).</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="cloud" size="sm" className="text-brand" />
          <CardTitle>Permissions notes</CardTitle>
        </div>
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
