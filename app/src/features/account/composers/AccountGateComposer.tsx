import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { matchDb, type DBMatch } from '@/data'
import { Button, Card } from '@/ui-mine'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'
import { useCloudStore } from '@/stores/cloudStore'
import { AccountComposer } from './AccountComposer'

interface AccountGateComposerProps {
  children: ReactNode
}

export function AccountGateComposer({ children }: AccountGateComposerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { ready, user, profile } = useCloudStore()
  const [routeMatch, setRouteMatch] = useState<DBMatch | null | undefined>(undefined)
  const rawMatchSegment = location.pathname.match(/^\/matches\/([^/]+)/)?.[1] ?? null
  const matchId =
    rawMatchSegment && rawMatchSegment !== 'create' ? rawMatchSegment : null
  const scope = deriveAccountScope(profile, [])

  useEffect(() => {
    let active = true
    if (!matchId || !user || scope.status !== 'ready') {
      setRouteMatch(null)
      return
    }
    setRouteMatch(undefined)
    matchDb.getById(matchId).then((match) => {
      if (active) setRouteMatch(match ?? null)
    })
    return () => {
      active = false
    }
  }, [matchId, user, scope.status, scope.focalPlayerId])

  if (!ready) {
    return <p className="p-4 text-xs text-muted">Checking account…</p>
  }

  // Cloud auth or a local device session both unlock the same AccountProfile scope.
  if (!user || scope.status !== 'ready') {
    return (
      <main className="min-h-dvh bg-bg-shell p-3 md:p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <Card className="p-2.5 shadow-sm">
            <h1 className="text-lg font-semibold text-primary">Account required</h1>
            <p className="mt-1 text-xs text-muted">
              Sign in or continue on this device, then choose who you’re reviewing.
            </p>
          </Card>
          <AccountComposer />
        </div>
      </main>
    )
  }

  if (matchId && routeMatch === undefined) {
    return <p className="p-4 text-xs text-muted">Checking match access…</p>
  }

  if (routeMatch && routeMatch.player1_id !== scope.focalPlayerId) {
    return (
      <main className="min-h-dvh bg-bg-shell p-3 md:p-4">
        <Card className="mx-auto max-w-lg p-2.5 space-y-2 shadow-sm">
          <h1 className="text-base font-semibold text-primary">Not in this library</h1>
          <p className="text-xs text-muted">
            Switch “Reviewing as” in Account to open this match.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/settings')}>
              Account
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/matches')}>
              Find matches
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  return children
}
