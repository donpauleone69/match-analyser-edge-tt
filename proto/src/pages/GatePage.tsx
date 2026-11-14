import { useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'

/** Pre-Home gate — login / register / device session stubs. */
export function GatePage() {
  const navigate = useNavigate()
  const enter = () => navigate('/home')

  return (
    <div className="h-full overflow-y-auto bg-bg-app px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-brand">Edge TT</p>
          <h1 className="text-2xl font-bold text-primary">Match Analyser</h1>
          <p className="text-sm text-muted">Unlock a session to reach Home.</p>
        </div>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="log-in" size="sm" className="text-brand" />
            <CardTitle>Login</CardTitle>
          </div>
          <CardDescription>Sign in to your cloud account (stub).</CardDescription>
          <Button fullWidth onClick={enter}>
            Sign in
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="user" size="sm" className="text-brand" />
            <CardTitle>Registration</CardTitle>
          </div>
          <CardDescription>Create an account (stub).</CardDescription>
          <Button fullWidth variant="secondary" onClick={enter}>
            Create account
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="hard-drive" size="sm" className="text-brand" />
            <CardTitle>Device session</CardTitle>
          </div>
          <CardDescription>Continue on this device without cloud (stub).</CardDescription>
          <Button fullWidth variant="ghost" onClick={enter}>
            Continue on this device
          </Button>
        </Card>
      </div>
    </div>
  )
}
