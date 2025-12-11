/**
 * Phase1AuditComposer - Main audit page for Phase 1 data
 * Shows all database writes during Phase 1 tagging for a complete match
 */

import { useState, useEffect } from 'react'
import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'
import { matchDb, setDb, rallyDb, shotDb, usePlayerStore } from '@/data'
import { 
  AuditHeaderSection, 
  SchemaReferenceSection,
  SetAuditSection 
} from '../sections'

interface Phase1AuditComposerProps {
  matchId: string
}

interface MatchWithPlayerNames extends DBMatch {
  player1_name: string
  player2_name: string
}

export function Phase1AuditComposer({ matchId }: Phase1AuditComposerProps) {
  const [matchRecord, setMatchRecord] = useState<MatchWithPlayerNames | null>(null)
  const [sets, setSets] = useState<DBSet[]>([])
  const [ralliesBySet, setRalliesBySet] = useState<Map<string, DBRally[]>>(new Map())
  const [shotsBySet, setShotsBySet] = useState<Map<string, DBShot[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Access player store for player names
  const getPlayerById = usePlayerStore(state => state.getById)
  
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('[Phase1Audit] Loading data for match:', matchId)
      
      // Load match
      const match = await matchDb.getById(matchId)
      if (!match) {
        throw new Error('Match not found')
      }
      
      // Get player names
      const player1 = getPlayerById(match.player1_id)
      const player2 = getPlayerById(match.player2_id)
      
      const matchWithNames: MatchWithPlayerNames = {
        ...match,
        player1_name: player1 ? `${player1.first_name} ${player1.last_name}` : 'Player 1',
        player2_name: player2 ? `${player2.first_name} ${player2.last_name}` : 'Player 2',
      }
      
      // Load all sets for this match
      const allSets = await setDb.getByMatchId(matchId)
      allSets.sort((a, b) => a.set_number - b.set_number)
      
      console.log('[Phase1Audit] Found', allSets.length, 'sets')
      
      // Load rallies and shots for each set
      const ralliesMap = new Map<string, DBRally[]>()
      const shotsMap = new Map<string, DBShot[]>()
      
      for (const set of allSets) {
        const rallies = await rallyDb.getBySetId(set.id)
        rallies.sort((a, b) => a.rally_index - b.rally_index)
        ralliesMap.set(set.id, rallies)
        
        console.log(`[Phase1Audit] Set ${set.set_number}: ${rallies.length} rallies`)
        
        // Get shots for all rallies in this set
        const setShots: DBShot[] = []
        for (const rally of rallies) {
          const rallyShots = await shotDb.getByRallyId(rally.id)
          setShots.push(...rallyShots)
        }
        setShots.sort((a, b) => {
          // Sort by rally, then by shot_index
          const rallyA = rallies.find(r => r.id === a.rally_id)
          const rallyB = rallies.find(r => r.id === b.rally_id)
          if (rallyA && rallyB && rallyA.rally_index !== rallyB.rally_index) {
            return rallyA.rally_index - rallyB.rally_index
          }
          return a.shot_index - b.shot_index
        })
        shotsMap.set(set.id, setShots)
        
        console.log(`[Phase1Audit] Set ${set.set_number}: ${setShots.length} shots`)
      }
      
      setMatchRecord(matchWithNames)
      setSets(allSets)
      setRalliesBySet(ralliesMap)
      setShotsBySet(shotsMap)
      
      console.log('[Phase1Audit] Data loaded successfully')
    } catch (err) {
      console.error('[Phase1Audit] Failed to load audit data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    if (matchId) {
      loadData()
    }
  }, [matchId])
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading audit data...</div>
          <div className="text-sm text-neutral-500">Please wait</div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error || !matchRecord) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-red-400">Error</div>
          <div className="text-sm text-neutral-400">{error || 'Match not found'}</div>
          <a 
            href="/data-viewer" 
            className="mt-4 inline-block text-brand-primary hover:underline"
          >
            Back to Data Viewer
          </a>
        </div>
      </div>
    )
  }
  
  // Main content
  return (
    <div className="min-h-screen bg-neutral-950">
      <AuditHeaderSection 
        matchRecord={matchRecord}
        onRefresh={loadData} 
      />
      
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Schema Reference - shown once at top with sample data */}
        <SchemaReferenceSection 
          matchRecord={matchRecord}
          sampleSet={sets[0] || null}
          sampleRally={sets[0] ? ralliesBySet.get(sets[0].id)?.[0] || null : null}
          sampleShot={sets[0] ? shotsBySet.get(sets[0].id)?.[0] || null : null}
        />
        
        {/* Each set */}
        {sets.length > 0 ? (
          sets.map((set, idx) => {
            const rallies = ralliesBySet.get(set.id) || []
            const shots = shotsBySet.get(set.id) || []
            
            return (
              <SetAuditSection
                key={set.id}
                set={set}
                rallies={rallies}
                shots={shots}
                isFirst={idx === 0}
              />
            )
          })
        ) : (
          <div className="text-neutral-500 text-center py-12 text-lg">
            No sets found for this match
          </div>
        )}
      </div>
    </div>
  )
}

