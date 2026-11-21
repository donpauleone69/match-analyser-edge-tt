import { useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { BrandMark } from '@/layout/BrandMark'
import { WfBadge, WfField } from '@/layout/Wireframe'

/** Pre-Home gate stubs. */
export function GateComposer() {
  const navigate = useNavigate()
  const enter = () => navigate('/matches')

  return (
    <div id="gate-scroll" className="h-full overflow-y-auto bg-bg-app px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 max-w-prose">
            <h1 className="text-2xl font-bold text-primary">Match Analyser</h1>
            <p className="text-sm text-muted">Unlock a session to reach Matches.</p>
          </div>
          <BrandMark className="pt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="log-in" size="sm" className="text-brand" />
                <CardTitle>Login</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>Cloud sign-in.</CardDescription>
            <div className="space-y-2">
              <WfField label="Email" placeholder="you@example.com" />
              <WfField label="Password" placeholder="••••••••" />
            </div>
            <Button fullWidth kind="main" disabled>
              Sign in (stub)
            </Button>
            <Button fullWidth kind="main" variant="secondary" onClick={enter}>
              Fake sign-in
            </Button>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="user" size="sm" className="text-brand" />
                <CardTitle>Registration</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>Create account.</CardDescription>
            <div className="space-y-2">
              <WfField label="Display name" placeholder="Paul" />
              <WfField label="Email" placeholder="you@example.com" />
              <WfField label="Password" placeholder="••••••••" />
            </div>
            <Button fullWidth kind="main" disabled>
              Create account (stub)
            </Button>
            <Button fullWidth kind="main" variant="secondary" onClick={enter}>
              Fake register
            </Button>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="hard-drive" size="sm" className="text-brand" />
                <CardTitle>Device session</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>Local only, no cloud.</CardDescription>
            <ul className="space-y-1.5 text-sm text-muted list-disc pl-4">
              <li>No sign-in</li>
              <li>Data stays on device</li>
              <li>Import / export in Account</li>
            </ul>
            <Button fullWidth kind="main" variant="ghost" onClick={enter}>
              Continue on this device
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
