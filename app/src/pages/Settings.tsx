import { useState, useEffect } from 'react'
import { clearAllData, getDatabaseStats } from '@/data/db'
import { useClubStore } from '@/data/entities/clubs/club.store'
import { useTournamentStore } from '@/data/entities/tournaments/tournament.store'
import { usePlayerStore } from '@/data/entities/players/player.store'
import { useMatchStore } from '@/data/entities/matches/match.store'
import { populateDummyData } from '@/features/populate-dummy-data'
import { AccountComposer } from '@/features/account'
import { Button, Icon } from '@/ui-mine'

export function Settings() {
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [, setStats] = useState<{ [key: string]: number } | null>(null)
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false)
  const [isPopulating, setIsPopulating] = useState(false)

  const clubStore = useClubStore()
  const tournamentStore = useTournamentStore()
  const playerStore = usePlayerStore()
  const matchStore = useMatchStore()

  const checkDatabaseEmpty = async () => {
    const stats = await getDatabaseStats()
    const isEmpty = stats.players === 0 && stats.matches === 0
    setIsDatabaseEmpty(isEmpty)
  }

  useEffect(() => {
    checkDatabaseEmpty()
  }, [])

  const handleClearData = async () => {
    setIsClearing(true)
    try {
      const beforeStats = await getDatabaseStats()
      setStats(beforeStats)
      await clearAllData()
      await Promise.all([
        clubStore.load(),
        tournamentStore.load(),
        playerStore.load(),
        matchStore.load(),
      ])
      setShowConfirm(false)
      await checkDatabaseEmpty()
      alert('All data cleared.')
    } catch (error) {
      console.error('Failed to clear data:', error)
      alert('Failed to clear data. Check console for details.')
    } finally {
      setIsClearing(false)
    }
  }

  const handlePopulateDummyData = async () => {
    setIsPopulating(true)
    try {
      await populateDummyData()
      await Promise.all([playerStore.load(), matchStore.load()])
      await checkDatabaseEmpty()
      alert('Dummy data populated.')
    } catch (error) {
      console.error('Failed to populate dummy data:', error)
      alert('Failed to populate dummy data. Check console for details.')
    } finally {
      setIsPopulating(false)
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto p-3 md:p-4 space-y-3">
        <h1 className="text-lg md:text-xl font-semibold text-primary">Account</h1>

        <AccountComposer />

        <section className="rounded-lg bg-callout-danger-bg/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-callout-danger-border/50">
            <Icon name="warning" size="sm" className="text-callout-danger" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-callout-danger">Danger zone</h2>
          </div>

          <div className="p-3 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-primary mb-0.5">Clear all data</h3>
              <p className="text-[11px] text-muted mb-2">
                Deletes local clubs, players, matches, tags, and videos. Cannot be undone.
              </p>

              {!showConfirm ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirm(true)}
                  className="border-callout-danger-border text-callout-danger"
                >
                  <Icon name="trash" size="sm" /> Clear all data
                </Button>
              ) : (
                <div className="rounded-md bg-bg-surface p-3 space-y-3">
                  <p className="text-sm text-primary">
                    Delete everything on this device?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleClearData} disabled={isClearing}>
                      {isClearing ? 'Clearing…' : 'Yes, delete everything'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowConfirm(false)}
                      disabled={isClearing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-border">
              <h3 className="text-sm font-medium text-primary mb-0.5">Populate dummy data</h3>
              <p className="text-[11px] text-muted mb-2">
                Dev sample: 4 players, 2 matches. Only when empty.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePopulateDummyData}
                disabled={!isDatabaseEmpty || isPopulating}
              >
                <Icon name="database" size="sm" />
                {isPopulating ? 'Populating…' : 'Populate dummy data'}
              </Button>
              {!isDatabaseEmpty && (
                <p className="text-[11px] text-muted mt-2">Clear data first.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
