/**
 * Populate Dummy Data Service
 * 
 * Populates the database with test data for development and testing.
 */

import { usePlayerStore } from '@/data/entities/players'
import { useMatchStore } from '@/data/entities/matches'
import { setDb } from '@/data'
import type { DBPlayer } from '@/data/entities/players/player.types'
import { DUMMY_PLAYERS, generateDummyMatches } from './dummyData'

const { create: createSet } = setDb

/**
 * Populate the database with dummy data
 * 
 * Creates:
 * - 4 test players (Paul Overton, Ethan Overton, Ricardo Santos, Paulo Rocha)
 * - 2 test matches (Paul vs Ricardo, Ethan vs Paulo)
 * - All sets for each match (based on best_of value)
 * 
 * @returns Promise that resolves when all data is populated
 * @throws Error if population fails
 */
export async function populateDummyData(): Promise<void> {
  const playerStore = usePlayerStore.getState()
  const matchStore = useMatchStore.getState()

  try {
    // Step 1: Create players
    console.log('Creating dummy players...')
    const createdPlayers: DBPlayer[] = []
    
    for (const playerData of DUMMY_PLAYERS) {
      const player = await playerStore.create(playerData)
      createdPlayers.push(player)
      console.log(`✅ Created player: ${player.first_name} ${player.last_name}`)
    }

    // Step 2: Build player ID map
    const playerMap = new Map<string, string>()
    createdPlayers.forEach(player => {
      const fullName = `${player.first_name} ${player.last_name}`
      playerMap.set(fullName, player.id)
    })

    // Step 3: Create matches with sets
    console.log('Creating dummy matches...')
    const matchesData = generateDummyMatches(playerMap)
    
    for (const matchData of matchesData) {
      const match = await matchStore.create(matchData as any)
      const p1 = createdPlayers.find(p => p.id === match.player1_id)
      const p2 = createdPlayers.find(p => p.id === match.player2_id)
      console.log(`✅ Created match: ${p1?.first_name} ${p1?.last_name} v ${p2?.first_name} ${p2?.last_name}`)
      
      // Step 4: Create sets for this match (mirroring MatchFormSection.tsx logic)
      console.log(`   Creating ${match.best_of} sets for match...`)
      for (let setNumber = 1; setNumber <= match.best_of; setNumber++) {
        // Service alternation: odd sets (1,3,5,7) = player1, even sets (2,4,6) = player2
        const setFirstServerId = setNumber % 2 === 1 ? 'player1' : 'player2'
        
        await createSet({
          match_id: match.id,
          set_number: setNumber,
          set_first_server_id: setFirstServerId,
          player1_score_final: 0,
          player2_score_final: 0,
          winner_id: null,
          player1_sets_before: 0,
          player1_sets_after: 0,
          player2_sets_before: 0,
          player2_sets_after: 0,
          has_video: false,
          video_segments: [],
          video_contexts: null,
          end_of_set_timestamp: null,
          setup_starting_score_p1: null,
          setup_starting_score_p2: null,
          setup_next_server_id: null,
          setup_completed_at: null,
        })
        console.log(`   ✅ Created set ${setNumber}`)
      }
    }

    console.log('✅ Dummy data populated successfully!')
  } catch (error) {
    console.error('❌ Failed to populate dummy data:', error)
    throw error
  }
}

