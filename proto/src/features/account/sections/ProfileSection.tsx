import { Button, Card, CardDescription, CardHead, CardTitle } from '@/ui-mine'
import { WfBadge, WfField, WfRow } from '@/ui-mine'

export function ProfileSection({ empty }: { empty: boolean }) {
  return empty ? (
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
        <CardHead icon="user" title="Profile" badge={<WfBadge>identity</WfBadge>} />
        <div className="space-y-2">
          <WfField label="Display name" value="Paul (stub)" />
          <WfField label="Role" value="Player / coach" />
          <WfField label="Linked player" value="Paul Overton" />
          <WfField label="Email" placeholder="Cloud email" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button kind="control" disabled>
            Save profile (stub)
          </Button>
          <Button kind="control" variant="secondary" disabled>
            Sign out (stub)
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardHead icon="users" title="Reviewing as" badge={<WfBadge>focal</WfBadge>} />
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
        <Button kind="control" disabled>
          Change reviewing-as (stub)
        </Button>
      </Card>
    </div>
  )
}
