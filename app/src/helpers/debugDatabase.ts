/**
 * Database Debugging Utility
 * Run in browser console: import('./helpers/debugDatabase').then(m => m.inspectDatabase())
 */

import { db } from '@/data/db'

export async function inspectDatabase() {
  console.log('🔍 DATABASE INSPECTION REPORT')
  console.log('=' .repeat(80))
  
  // Get all data
  const matches = await db.matches.toArray()
  const sets = await db.sets.toArray()
  const rallies = await db.rallies.toArray()
  const shots = await db.shots.toArray()
  
  console.log('\n📊 COUNTS:')
  console.log(`  Matches: ${matches.length}`)
  console.log(`  Sets: ${sets.length}`)
  console.log(`  Rallies: ${rallies.length}`)
  console.log(`  Shots: ${shots.length}`)
  
  // Check for duplicate rally indices
  if (sets.length > 0) {
    console.log('\n🔢 RALLY INDEX ANALYSIS:')
    for (const set of sets) {
      const setRallies = rallies.filter(r => r.set_id === set.id)
      console.log(`\n  Set ${set.set_number} (ID: ${set.id}):`)
      console.log(`    Total rallies: ${setRallies.length}`)
      
      // Group by rally_index
      const indexGroups = new Map<number, any[]>()
      setRallies.forEach(r => {
        if (!indexGroups.has(r.rally_index)) {
          indexGroups.set(r.rally_index, [])
        }
        indexGroups.get(r.rally_index)!.push(r)
      })
      
      // Check for duplicates
      const duplicates = Array.from(indexGroups.entries()).filter(([_, rallies]) => rallies.length > 1)
      if (duplicates.length > 0) {
        console.log(`    ❌ DUPLICATE INDICES FOUND:`)
        duplicates.forEach(([index, rallies]) => {
          console.log(`      Index ${index}: ${rallies.length} rallies`)
          rallies.forEach(r => console.log(`        - ID: ${r.id}`))
        })
      } else {
        console.log(`    ✅ No duplicate indices`)
      }
      
      // Show index range
      const indices = setRallies.map(r => r.rally_index).sort((a, b) => a - b)
      console.log(`    Index range: ${indices[0]} to ${indices[indices.length - 1]}`)
      console.log(`    Expected: 1 to ${setRallies.length}`)
    }
  }
  
  // Check ID formats
  console.log('\n🔑 ID FORMAT ANALYSIS:')
  
  const sampleRally = rallies[0]
  const sampleShot = shots[0]
  
  if (sampleRally) {
    console.log(`  Rally ID example: ${sampleRally.id}`)
    console.log(`    Expected format: {set_id}-r{num}`)
    console.log(`    Is slug format: ${sampleRally.id.includes('-r')}`)
  }
  
  if (sampleShot) {
    console.log(`  Shot ID example: ${sampleShot.id}`)
    console.log(`    Expected format: {rally_id}-sh{num}`)
    console.log(`    Is slug format: ${sampleShot.id.includes('-sh')}`)
  }
  
  // Check shot timestamps
  console.log('\n⏱️ TIMESTAMP ANALYSIS:')
  const shotsWithoutEnd = shots.filter(s => s.timestamp_end === null)
  console.log(`  Shots with null timestamp_end: ${shotsWithoutEnd.length}/${shots.length}`)
  if (shotsWithoutEnd.length > 0) {
    console.log(`  ❌ timestamp_end not being calculated!`)
  }
  
  // Check rally scores
  console.log('\n🎯 SCORE ANALYSIS:')
  if (rallies.length > 0) {
    const ralliesWithScores = rallies.filter(r => 
      r.player1_score_before !== undefined && r.player2_score_before !== undefined
    )
    console.log(`  Rallies with scores: ${ralliesWithScores.length}/${rallies.length}`)
    
    if (ralliesWithScores.length > 0) {
      const firstRally = ralliesWithScores[0]
      console.log(`  First rally scores: ${firstRally.player1_score_before}-${firstRally.player2_score_before}`)
      console.log(`  Expected first rally: 0-0`)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  
  return {
    matches,
    sets,
    rallies,
    shots,
  }
}

/**
 * Export sample data for inspection
 */
export async function exportSampleData() {
  const data = await inspectDatabase()
  console.log('\n📋 SAMPLE DATA (first 3 items each):')
  console.log('\nRallies:', JSON.stringify(data.rallies.slice(0, 3), null, 2))
  console.log('\nShots:', JSON.stringify(data.shots.slice(0, 3), null, 2))
  return data
}

/**
 * Quick check in console
 */
if (typeof window !== 'undefined') {
  (window as any).inspectDB = inspectDatabase
  (window as any).exportDB = exportSampleData
  console.log('💡 Debug tools loaded! Run inspectDB() or exportDB() in console')
}

