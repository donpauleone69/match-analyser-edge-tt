import { useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardHead } from '@/ui-mine'
import { BrandMark } from '@/layout/BrandMark'
import { WfBadge, WfField } from '@/ui-mine'

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
            <CardHead icon="log-in" title="Login" badge={<WfBadge>stub</WfBadge>} />
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
            <CardHead icon="user" title="Registration" badge={<WfBadge>stub</WfBadge>} />
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
            <CardHead icon="hard-drive" title="Device session" badge={<WfBadge>stub</WfBadge>} />
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
