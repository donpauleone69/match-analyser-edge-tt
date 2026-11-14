import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Account hub: profile, reviewing-as, data, theme. */
export function AccountPage() {
  return (
    <div>
      <PageHeader title="Account" />
      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="settings" size="sm" className="text-brand" />
              <CardTitle>Look & feel</CardTitle>
            </div>
            <WfBadge>proto</WfBadge>
          </div>
          <CardDescription>Theme packs for this proto.</CardDescription>
          <ThemeSwitcher />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="user" size="sm" className="text-brand" />
                <CardTitle>Profile</CardTitle>
              </div>
              <WfBadge>identity</WfBadge>
            </div>
            <div className="space-y-2">
              <WfField label="Display name" value="Paul (stub)" />
              <WfField label="Role" value="Player / coach" />
              <WfField label="Linked player" value="Paul Overton" />
              <WfField label="Email" placeholder="Cloud email" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled>
                Save profile (stub)
              </Button>
              <Button size="sm" variant="secondary" disabled>
                Sign out (stub)
              </Button>
              <Button size="sm" variant="ghost" disabled>
                Switch session (stub)
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="users" size="sm" className="text-brand" />
                <CardTitle>Reviewing as</CardTitle>
              </div>
              <WfBadge>focal</WfBadge>
            </div>
            <CardDescription>Whose library you view.</CardDescription>
            <WfField label="Focal player" value="Paul Overton" />
            <ul className="space-y-2">
              <WfRow
                title="Paul Overton"
                meta="Linked player"
                trailing={<WfBadge>active</WfBadge>}
              />
              <WfRow title="Club teammate" meta="Shared later" />
            </ul>
            <Button size="sm" disabled>
              Change reviewing-as (stub)
            </Button>
          </Card>
        </div>

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
            <Button disabled>
              <Icon name="upload" size="xs" />
              Import (stub)
            </Button>
            <Button variant="secondary" disabled>
              <Icon name="download" size="xs" />
              Export (stub)
            </Button>
            <Button variant="secondary" disabled>
              <Icon name="cloud" size="xs" />
              Sync (stub)
            </Button>
            <Button variant="ghost" disabled>
              <Icon name="hard-drive" size="xs" />
              Storage (stub)
            </Button>
          </div>
          <WfEmpty title="No backup yet" body="Last export: never." />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="cloud" size="sm" className="text-brand" />
              <CardTitle>Permissions notes</CardTitle>
            </div>
            <WfBadge>notes</WfBadge>
          </div>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <span className="font-semibold text-primary">Device:</span> local matches, tags,
              video assets. Works offline after device session.
            </li>
            <li>
              <span className="font-semibold text-primary">Cloud:</span> login, optional sync.
              Needs Gate sign-in.
            </li>
            <li>
              <span className="font-semibold text-primary">Needs sign-in:</span> cross-device
              restore. Not required for local tagging.
            </li>
            <li>
              <span className="font-semibold text-primary">Not here:</span> video attach on Match
              Details. Reel download on Insights.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
