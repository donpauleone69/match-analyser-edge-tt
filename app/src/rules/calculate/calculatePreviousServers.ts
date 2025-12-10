/**
 * Work backwards from next server to determine who served each previous rally
 * Uses table tennis serve alternation rules:
 * - Every 2 points in normal play (0-0 to 10-9)
 * - Every 1 point in deuce (after 10-10)
 * 
 * @param totalPoints - Number of completed points (e.g., 5 for score 2-3)
 * @param nextServerId - Who serves the NEXT point
 * @param player1Id - ID for player 1
 * @param player2Id - ID for player 2
 * @returns Array of server IDs for rallies 1..totalPoints
 * 
 * @example
 * // Score 2-3, next server is player2
 * calculatePreviousServers(5, 'player2', 'p1', 'p2')
 * // Returns: ['player1', 'player1', 'player2', 'player2', 'player1']
 * // Rally 1-2: player1, Rally 3-4: player2, Rally 5: player1
 */
export function calculatePreviousServers(
  totalPoints: number,
  nextServerId: 'player1' | 'player2',
  player1Id: string,
  player2Id: string
): string[] {
  const servers: string[] = []
  
  // Determine if we're in deuce territory
  const isDeuce = totalPoints >= 20 // Both players at 10+ (20 total points minimum)
  
  // Work backwards from the next server
  let currentServer = nextServerId
  
  for (let point = totalPoints; point >= 1; point--) {
    // Determine server for this point (working backwards)
    if (isDeuce && point >= 20) {
      // In deuce: alternates every point
      // If next server is player2, then point N is player1, N-1 is player2, etc.
      const stepsBack = totalPoints - point + 1
      currentServer = stepsBack % 2 === 1 
        ? (nextServerId === 'player1' ? 'player2' : 'player1')
        : nextServerId
    } else {
      // Normal play: every 2 points
      const serveBlock = Math.ceil(point / 2) // Which "block" of 2 points
      const nextBlock = Math.ceil((totalPoints + 1) / 2)
      const blocksBack = nextBlock - serveBlock
      
      currentServer = blocksBack % 2 === 0 ? nextServerId : (nextServerId === 'player1' ? 'player2' : 'player1')
    }
    
    servers[point - 1] = currentServer === 'player1' ? player1Id : player2Id
  }
  
  return servers
}

