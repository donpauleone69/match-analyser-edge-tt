/**
 * Development Database Inspection API
 * 
 * Provides programmatic access to database state for testing and debugging.
 * Agents can use these functions to verify database operations without DevTools.
 * 
 * Usage in browser console:
 * ```javascript
 * import { inspectSet, inspectMatch, inspectAllData } from '@/helpers/devInspectDB'
 * 
 * // Inspect specific set
 * const setData = await inspectSet('match-123-s1')
 * console.table(setData.rallies)
 * console.table(setData.shots)
 * 
 * // Inspect entire match
 * const matchData = await inspectMatch('match-123')
 * console.log(matchData.summary)
 * 
 * // Get everything
 * const allData = await inspectAllData()
 * console.log(allData.summary)
 * ```
 */

import { 
  rallyDb, 
  shotDb, 
  setDb, 
  matchDb, 
  shotInferenceDb,
  db
} from '@/data'

export interface SetInspectionResult {
  setRecord: any
  rallies: any[]
  shots: any[]
  shotInferences: any[]
  summary: {
    rallyCount: number
    shotCount: number
    inferenceCount: number
    taggingPhase: string | null
    phase1Progress: string
    phase2Progress: string
  }
}

export interface MatchInspectionResult {
  matchRecord: any
  sets: any[]
  allRallies: any[]
  allShots: any[]
  summary: {
    setCount: number
    totalRallies: number
    totalShots: number
    totalInferences: number
    hasVideo: boolean
  }
}

export interface DatabaseSummary {
  players: number
  clubs: number
  tournaments: number
  matches: number
  matchVideos: number
  sets: number
  rallies: number
  shots: number
  shotInferences: number
}

/**
 * Inspect a specific set with all related data
 */
export async function inspectSet(setId: string): Promise<SetInspectionResult> {
  const setRecord = await setDb.getById(setId)
  const rallies = await rallyDb.getBySetId(setId)
  const shots = await shotDb.getBySetId(setId)
  const shotInferences = await shotInferenceDb.getBySetId(setId)

  return {
    setRecord,
    rallies,
    shots,
    shotInferences,
    summary: {
      rallyCount: rallies.length,
      shotCount: shots.length,
      inferenceCount: shotInferences.length,
      taggingPhase: setRecord?.tagging_phase || null,
      phase1Progress: setRecord?.phase1_last_rally 
        ? `${setRecord.phase1_last_rally}/${setRecord.phase1_total_rallies || '?'}` 
        : 'Not started',
      phase2Progress: setRecord?.phase2_last_shot_index 
        ? `${setRecord.phase2_last_shot_index}/${setRecord.phase2_total_shots || '?'}` 
        : 'Not started',
    }
  }
}

/**
 * Inspect a specific match with all sets and data
 */
export async function inspectMatch(matchId: string): Promise<MatchInspectionResult> {
  const matchRecord = await matchDb.getById(matchId)
  const sets = await setDb.getByMatchId(matchId)
  
  // Get all rallies and shots for all sets in this match
  const allRallies: any[] = []
  const allShots: any[] = []
  const allInferences: any[] = []
  
  for (const set of sets) {
    const rallies = await rallyDb.getBySetId(set.id)
    const shots = await shotDb.getBySetId(set.id)
    const inferences = await shotInferenceDb.getBySetId(set.id)
    allRallies.push(...rallies)
    allShots.push(...shots)
    allInferences.push(...inferences)
  }

  return {
    matchRecord,
    sets,
    allRallies,
    allShots,
    summary: {
      setCount: sets.length,
      totalRallies: allRallies.length,
      totalShots: allShots.length,
      totalInferences: allInferences.length,
      hasVideo: matchRecord?.has_video || false,
    }
  }
}

/**
 * Get counts for all database entities
 */
export async function inspectAllData(): Promise<{ summary: DatabaseSummary }> {
  const [players, clubs, tournaments, matches, matchVideos, sets, rallies, shots, shotInferences] = await Promise.all([
    db.players.toArray(),
    db.clubs.toArray(),
    db.tournaments.toArray(),
    matchDb.getAll(),
    db.match_videos.toArray(),
    setDb.getAll(),
    rallyDb.getAll(),
    shotDb.getAll(),
    shotInferenceDb.getAll(),
  ])

  return {
    summary: {
      players: players.length,
      clubs: clubs.length,
      tournaments: tournaments.length,
      matches: matches.length,
      matchVideos: matchVideos.length,
      sets: sets.length,
      rallies: rallies.length,
      shots: shots.length,
      shotInferences: shotInferences.length,
    }
  }
}

/**
 * Verify specific rally data
 */
export async function inspectRally(rallyId: string) {
  const rally = await rallyDb.getById(rallyId)
  const shots = rally ? await shotDb.getByRallyId(rallyId) : []
  
  return {
    rally,
    shots,
    summary: {
      shotCount: shots.length,
      serverCorrect: rally?.server_corrected || false,
      scoreCorrect: rally?.score_corrected || false,
      isStubRally: rally?.is_stub_rally || false,
    }
  }
}

/**
 * Verify shot details are complete
 */
export async function verifyShotDetails(setId: string) {
  const shots = await shotDb.getBySetId(setId)
  
  const incomplete = shots.filter(shot => {
    // Phase 2 fields that should be filled for non-stub shots
    if (shot.shot_index === 1) {
      // Serve: should have direction, length, spin
      return !shot.shot_origin || !shot.shot_target || !shot.shot_length || !shot.serve_spin_family
    } else {
      // Regular shot: should have direction, stroke, intent
      return !shot.shot_origin || !shot.shot_target || !shot.shot_wing || !shot.intent
    }
  })
  
  return {
    total: shots.length,
    complete: shots.length - incomplete.length,
    incomplete: incomplete.length,
    incompleteShots: incomplete.map(s => ({
      id: s.id,
      shotIndex: s.shot_index,
      playerId: s.player_id,
      missingFields: [
        !s.shot_origin && 'shot_origin',
        !s.shot_target && 'shot_target',
        s.shot_index === 1 && !s.shot_length && 'shot_length',
        s.shot_index === 1 && !s.serve_spin_family && 'serve_spin_family',
        s.shot_index > 1 && !s.shot_wing && 'shot_wing',
        s.shot_index > 1 && !s.intent && 'intent',
      ].filter(Boolean)
    }))
  }
}

/**
 * Check for data consistency issues
 */
export async function checkConsistency(setId: string) {
  const setRecord = await setDb.getById(setId)
  const rallies = await rallyDb.getBySetId(setId)
  const shots = await shotDb.getBySetId(setId)
  
  const issues: string[] = []
  
  // Check: Rally indices should be sequential
  const rallyIndices = rallies.map(r => r.rally_index).sort((a, b) => a - b)
  const expectedIndices = Array.from({ length: rallies.length }, (_, i) => i + 1)
  if (JSON.stringify(rallyIndices) !== JSON.stringify(expectedIndices)) {
    issues.push('Rally indices are not sequential')
  }
  
  // Check: Each rally should have shots
  for (const rally of rallies) {
    const rallyShots = shots.filter(s => s.rally_id === rally.id)
    if (rallyShots.length === 0 && !rally.is_stub_rally) {
      issues.push(`Rally ${rally.rally_index} has no shots`)
    }
  }
  
  // Check: Shot timestamps should be within rally timestamps
  for (const rally of rallies) {
    if (!rally.timestamp_start || !rally.timestamp_end) continue
    
    const rallyShots = shots.filter(s => s.rally_id === rally.id)
    for (const shot of rallyShots) {
      if (shot.timestamp_start < rally.timestamp_start || shot.timestamp_start > rally.timestamp_end) {
        issues.push(`Shot ${shot.shot_index} in rally ${rally.rally_index} timestamp outside rally bounds`)
      }
    }
  }
  
  // Check: Scores should progress correctly
  let prevScoreP1 = setRecord?.setup_starting_score_p1 || 0
  let prevScoreP2 = setRecord?.setup_starting_score_p2 || 0
  
  for (const rally of rallies.sort((a, b) => a.rally_index - b.rally_index)) {
    if (rally.player1_score_before !== prevScoreP1 || rally.player2_score_before !== prevScoreP2) {
      issues.push(`Rally ${rally.rally_index} score before (${rally.player1_score_before}-${rally.player2_score_before}) doesn't match previous score after (${prevScoreP1}-${prevScoreP2})`)
    }
    prevScoreP1 = rally.player1_score_after
    prevScoreP2 = rally.player2_score_after
  }
  
  return {
    isConsistent: issues.length === 0,
    issueCount: issues.length,
    issues
  }
}

/**
 * Export full set data as JSON (for debugging)
 */
export async function exportSetData(setId: string) {
  const data = await inspectSet(setId)
  
  const json = JSON.stringify(data, null, 2)
  
  // Create download link
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `set-${setId}-export.json`
  a.click()
  URL.revokeObjectURL(url)
  
  return data
}

// Expose functions globally for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).dbInspect = {
    inspectSet,
    inspectMatch,
    inspectRally,
    inspectAllData,
    verifyShotDetails,
    checkConsistency,
    exportSetData,
  }
  
  console.log('📊 Database Inspection API loaded. Available at window.dbInspect')
  console.log('Example: await window.dbInspect.inspectSet("your-set-id")')
}

