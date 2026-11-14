import { useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { BrandMark } from '@/layout/BrandMark'
import { WfBadge, WfField } from '@/layout/Wireframe'

/** Pre-Home gate — login / register / device session stubs. */
export function GatePage() {
  const navigate = useNavigate()
  const enter = () => navigate('/home')

  return (
    <div className="h-full overflow-y-auto bg-bg-app px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 max-w-prose">
            <h1 className="text-2xl font-bold text-primary">Match Analyser</h1>
            <p className="text-sm text-muted">
              Unlock a session, then land on Home. Auth is wireframe only — every path below
              enters the proto shell.
            </p>
          </div>
          <BrandMark className="pt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Login */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="log-in" size="sm" className="text-brand" />
                <CardTitle>Login</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>
              Sign in to your cloud account. Profile / reviewing-as finish in Account after ready.
            </CardDescription>
            <div className="space-y-2">
              <WfField label="Email" placeholder="you@example.com" />
              <WfField label="Password" placeholder="••••••••" />
            </div>
            <Button fullWidth disabled>
              Sign in (cloud) — not wired
            </Button>
            <Button fullWidth variant="secondary" onClick={enter}>
              Fake sign-in → Home
            </Button>
          </Card>

          {/* Registration */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="user" size="sm" className="text-brand" />
                <CardTitle>Registration</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>
              Create an account. No cloud call in proto — fields show the real form shape.
            </CardDescription>
            <div className="space-y-2">
              <WfField label="Display name" placeholder="Paul" />
              <WfField label="Email" placeholder="you@example.com" />
              <WfField label="Password" placeholder="••••••••" />
            </div>
            <Button fullWidth disabled>
              Create account — not wired
            </Button>
            <Button fullWidth variant="secondary" onClick={enter}>
              Fake register → Home
            </Button>
          </Card>

          {/* Device session */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="hard-drive" size="sm" className="text-brand" />
                <CardTitle>Device session</CardTitle>
              </div>
              <WfBadge>stub</WfBadge>
            </div>
            <CardDescription>
              Continue on this device without cloud. Local library + reviewing-as stay on device.
            </CardDescription>
            <ul className="space-y-1.5 text-sm text-muted list-disc pl-4">
              <li>No sign-in required</li>
              <li>Data stays on this browser / device</li>
              <li>Import / export / sync live under Account</li>
            </ul>
            <Button fullWidth variant="ghost" onClick={enter}>
              Continue on this device → Home
            </Button>
          </Card>
        </div>

        <p className="text-xs text-muted max-w-prose">
          Gate is pre-Home only. After ready: Home cards → Match / Insights / Account via bottom
          nav. No app chrome until you enter.
        </p>
      </div>
    </div>
  )
}
