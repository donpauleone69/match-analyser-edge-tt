import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { WfBadge, WfField, WfRow } from '@/layout/Wireframe'
import { useDemo, type DemoMode } from '@/data/demoStore'
import { cn } from '@/helpers/utils'

export function AccountPage() {
  const { mode, setMode } = useDemo()
  const empty = mode === 'empty'

  return (
    <div>
      <StickyChrome>
        <PageHeader title="Account" />
      </StickyChrome>
      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        {empty ? (
          <Card className="space-y-3">
            <CardTitle>Profile</CardTitle>
            <div className="space-y-2">
              <WfField label="Display name" placeholder="Empty" />
              <WfField label="Role" placeholder="Empty" />
              <WfField label="Linked player" placeholder="Empty" />
              <WfField label="Email" placeholder="Empty" />
            </div>
          </Card>
        ) : (
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
        )}

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

        {empty ? null : (
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
                  <span className="font-semibold text-primary">Not here:</span> video attach on Match
                  Details. Reel download on Insights.
                </li>
              </ul>
            </Card>
          </>
        )}

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Prototype</CardTitle>
            <WfBadge>demo data</WfBadge>
          </div>
          <CardDescription>
            Empty shows only empty states. Filled restores the three seed matches.
          </CardDescription>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Demo data">
            {(['empty', 'filled'] as DemoMode[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMode(opt)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-semibold capitalize',
                  mode === opt
                    ? 'border-brand-primary bg-brand-primary-muted text-primary'
                    : 'border-border bg-bg-card text-muted hover:bg-bg-elevated'
                )}
                aria-pressed={mode === opt}
              >
                {opt}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
