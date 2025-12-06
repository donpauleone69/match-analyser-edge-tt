import { useState } from 'react'
import { clearAllData, getDatabaseStats } from '@/data/db'
import { useClubStore } from '@/data/entities/clubs/club.store'
import { useTournamentStore } from '@/data/entities/tournaments/tournament.store'
import { usePlayerStore } from '@/data/entities/players/player.store'
import { useMatchStore } from '@/data/entities/matches/match.store'
import { AlertTriangle, Trash2 } from 'lucide-react'

export function Settings() {
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [stats, setStats] = useState<{ [key: string]: number } | null>(null)

  const clubStore = useClubStore()
  const tournamentStore = useTournamentStore()
  const playerStore = usePlayerStore()
  const matchStore = useMatchStore()

  const handleClearData = async () => {
    setIsClearing(true)
    try {
      // Get stats before clearing
      const beforeStats = await getDatabaseStats()
      setStats(beforeStats)

      // Clear all data from IndexedDB
      await clearAllData()

      // Reload all stores to sync with empty DB
      await Promise.all([
        clubStore.load(),
        tournamentStore.load(),
        playerStore.load(),
        matchStore.load(),
      ])

      setShowConfirm(false)
      alert('✅ All data cleared successfully!')
    } catch (error) {
      console.error('Failed to clear data:', error)
      alert('❌ Failed to clear data. Check console for details.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-50">Settings</h1>
          <p className="text-neutral-400 mt-2">
            Manage your application settings and data
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-bg-card rounded-lg border border-red-500/30 overflow-hidden">
          <div className="p-6 bg-red-500/10 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-neutral-50 mb-2">
                  Clear All Data
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  This will permanently delete all clubs, tournaments, players, matches,
                  sets, rallies, and shots from your local database. This action cannot be
                  undone.
                </p>

                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All Data
                  </button>
                ) : (
                  <div className="bg-bg-shell rounded-lg p-4 border border-neutral-700">
                    <p className="text-neutral-300 mb-4 font-medium">
                      Are you absolutely sure? This will delete:
                    </p>
                    <ul className="text-sm text-neutral-400 space-y-1 mb-4 ml-4">
                      <li>• All clubs</li>
                      <li>• All tournaments</li>
                      <li>• All players</li>
                      <li>• All matches</li>
                      <li>• All match videos</li>
                      <li>• All sets</li>
                      <li>• All rallies</li>
                      <li>• All shots</li>
                    </ul>
                    <div className="flex gap-3">
                      <button
                        onClick={handleClearData}
                        disabled={isClearing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        {isClearing ? 'Clearing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isClearing}
                        className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed text-neutral-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings (Future) */}
        <div className="mt-6 bg-bg-card rounded-lg border border-neutral-700 p-6">
          <h2 className="text-xl font-semibold text-neutral-50 mb-2">
            Application Settings
          </h2>
          <p className="text-neutral-400 text-sm">
            Additional settings will be added here in future updates.
          </p>
        </div>
      </div>
    </div>
  )
}

