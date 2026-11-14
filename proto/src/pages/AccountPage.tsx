import { Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'

/** Account hub — Profile · Reviewing as · Import/export · Permissions · Theme. */
export function AccountPage() {
  return (
    <div>
      <PageHeader title="Account" subtitle="Identity and library data (stub)." />
      <div className="px-4 space-y-3 pb-6">
        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="settings" size="sm" className="text-brand" />
            <CardTitle>Look & feel</CardTitle>
          </div>
          <CardDescription>
            Proto theme packs only — flip tokens across hubs; not a product setting.
          </CardDescription>
          <ThemeSwitcher />
        </Card>

        <Card className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon name="user" size="sm" className="text-brand" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Role · linked player · sign out (placeholder).</CardDescription>
        </Card>

        <Card className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon name="users" size="sm" className="text-brand" />
            <CardTitle>Reviewing as</CardTitle>
          </div>
          <CardDescription>Focal player / library scope (placeholder).</CardDescription>
        </Card>

        <Card className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon name="upload" size="sm" className="text-brand" />
            <CardTitle>Import / export / backup</CardTitle>
          </div>
          <CardDescription>Bundle import/export · sync · device storage (placeholder).</CardDescription>
        </Card>

        <Card className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon name="cloud" size="sm" className="text-brand" />
            <CardTitle>Permissions notes</CardTitle>
          </div>
          <CardDescription>
            What cloud vs device can do · what needs sign-in (placeholder).
          </CardDescription>
        </Card>
      </div>
    </div>
  )
}
