import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Account hub — Profile · Reviewing as · Import/export · Permissions · Theme. */
export function AccountPage() {
  return (
    <div>
      <PageHeader
        title="Account"
        subtitle="Identity + library data. Gate auth stays pre-Home — this is the logged-in hub."
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        {/* Look & feel first so theme stays easy to find */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="settings" size="sm" className="text-brand" />
              <CardTitle>Look & feel</CardTitle>
            </div>
            <WfBadge>proto</WfBadge>
          </div>
          <CardDescription>
            Theme packs flip tokens across hubs. Not a product setting — wireframe control only.
          </CardDescription>
          <ThemeSwitcher />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile */}
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
              <WfField label="Role" value="Player / coach (stub)" />
              <WfField label="Linked player" value="Paul Overton (library)" />
              <WfField label="Email" placeholder="Signed-in cloud email (stub)" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled>
                Save profile — not wired
              </Button>
              <Button size="sm" variant="secondary" disabled>
                Sign out — not wired
              </Button>
              <Button size="sm" variant="ghost" disabled>
                Switch session — not wired
              </Button>
            </div>
          </Card>

          {/* Reviewing as */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="users" size="sm" className="text-brand" />
                <CardTitle>Reviewing as</CardTitle>
              </div>
              <WfBadge>focal</WfBadge>
            </div>
            <CardDescription>
              Whose library you’re in — scopes Home, Match, Insights. Not the same as Profile role.
            </CardDescription>
            <WfField label="Focal player" value="Paul Overton" />
            <ul className="space-y-2">
              <WfRow
                title="Paul Overton"
                meta="Your linked player · active"
                trailing={<WfBadge>active</WfBadge>}
              />
              <WfRow title="Club teammate (stub)" meta="Shared library later" />
            </ul>
            <Button size="sm" disabled>
              Change reviewing-as — not wired
            </Button>
          </Card>
        </div>

        {/* Import / export */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="upload" size="sm" className="text-brand" />
              <CardTitle>Import / export / backup</CardTitle>
            </div>
            <WfBadge>data</WfBadge>
          </div>
          <CardDescription>
            Bundle on/off device · cloud sync · storage. Clip/reel download stays on Insights Reels
            / Match Insights — not here.
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Button disabled>
              <Icon name="upload" size="xs" />
              Import bundle — not wired
            </Button>
            <Button variant="secondary" disabled>
              <Icon name="download" size="xs" />
              Export backup — not wired
            </Button>
            <Button variant="secondary" disabled>
              <Icon name="cloud" size="xs" />
              Sync now — not wired
            </Button>
            <Button variant="ghost" disabled>
              <Icon name="hard-drive" size="xs" />
              Device storage — not wired
            </Button>
          </div>
          <WfEmpty
            title="No backup yet"
            body="Empty state: last export — never. Dev clear-all / dummy-data stay optional under backup (hidden or light in MVP)."
          />
        </Card>

        {/* Permissions */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="cloud" size="sm" className="text-brand" />
              <CardTitle>Permissions notes</CardTitle>
            </div>
            <WfBadge>plain notes</WfBadge>
          </div>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <span className="font-semibold text-primary">Device:</span> local matches, tags, video
              assets (OPFS) — works offline after Gate device session.
            </li>
            <li>
              <span className="font-semibold text-primary">Cloud:</span> account login, optional sync
              / backup — needs Sign in on Gate.
            </li>
            <li>
              <span className="font-semibold text-primary">Needs sign-in:</span> cross-device restore,
              shared reviewing-as (later) — not required for local tagging.
            </li>
            <li>
              <span className="font-semibold text-primary">Not here:</span> raw match video attach →
              Match Details · reel download → Insights / Match Insights.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
