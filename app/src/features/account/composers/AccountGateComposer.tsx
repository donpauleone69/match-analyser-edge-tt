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
  const { configured, ready, user, profile } = useCloudStore()
  const [routeMatch, setRouteMatch] = useState<DBMatch | null | undefined>(undefined)
  const matchId = location.pathname.match(/^\/matches\/([^/]+)/)?.[1] ?? null
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
    return <p className="p-6 text-neutral-400">Checking account…</p>
  }

  if (!configured || !user || scope.status !== 'ready') {
    return (
      <main className="min-h-dvh bg-bg-shell p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Card className="p-5">
            <h1 className="text-2xl font-bold text-neutral-50">Account required</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Sign in and choose the player whose library you are reviewing to continue to {location.pathname}.
            </p>
          </Card>
          <AccountComposer />
        </div>
      </main>
    )
  }

  if (matchId && routeMatch === undefined) {
    return <p className="p-6 text-neutral-400">Checking match access…</p>
  }

  if (routeMatch && routeMatch.player1_id !== scope.focalPlayerId) {
    return (
      <main className="min-h-dvh bg-bg-shell p-4 md:p-8">
        <Card className="mx-auto max-w-lg p-6 space-y-4">
          <h1 className="text-xl font-bold text-neutral-50">Not in this player’s library</h1>
          <p className="text-sm text-neutral-400">
            This match was recorded for a different focal player. Switch “Reviewing as” in Account & data to open it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/settings')}>Account & data</Button>
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              Back to matches
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  return children
}
