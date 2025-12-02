import { useMemo } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { Button } from '@/ui-mine/Button'
import { Icon } from '@/ui-mine/Icon'

export function ExportControlsSection() {
  // Read individual values to avoid getSnapshot caching issues
  const matchId = useTaggingStore((state) => state.matchId)
  const player1Name = useTaggingStore((state) => state.player1Name)
  const player2Name = useTaggingStore((state) => state.player2Name)
  const matchDate = useTaggingStore((state) => state.matchDate)
  const firstServerId = useTaggingStore((state) => state.firstServerId)
  const taggingMode = useTaggingStore((state) => state.taggingMode)
  const matchFormat = useTaggingStore((state) => state.matchFormat)
  const tournament = useTaggingStore((state) => state.tournament)
  const matchResult = useTaggingStore((state) => state.matchResult)
  const finalSetScore = useTaggingStore((state) => state.finalSetScore)
  const finalPointsScore = useTaggingStore((state) => state.finalPointsScore)
  const videoCoverage = useTaggingStore((state) => state.videoCoverage)
  const sets = useTaggingStore((state) => state.sets)
  const rallies = useTaggingStore((state) => state.rallies)
  const shots = useTaggingStore((state) => state.shots)
  const player1Score = useTaggingStore((state) => state.player1Score)
  const player2Score = useTaggingStore((state) => state.player2Score)

  // Memoize the combined data object
  const matchData = useMemo(() => ({
    matchId,
    player1Name,
    player2Name,
    matchDate,
    firstServerId,
    taggingMode,
    matchFormat,
    tournament,
    matchResult,
    finalSetScore,
    finalPointsScore,
    videoCoverage,
    sets,
    rallies,
    shots,
    player1Score,
    player2Score,
  }), [
    matchId,
    player1Name,
    player2Name,
    matchDate,
    firstServerId,
    taggingMode,
    matchFormat,
    tournament,
    matchResult,
    finalSetScore,
    finalPointsScore,
    videoCoverage,
    sets,
    rallies,
    shots,
    player1Score,
    player2Score,
  ])

  const exportToJSON = () => {
    const dataStr = JSON.stringify(matchData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `match-data-${matchData.matchDate || 'unknown'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    const player1Name = matchData.player1Name
    const player2Name = matchData.player2Name

    // Create CSV for rallies
    const ralliesHeader = [
      'Rally #',
      'Set ID',
      'Server',
      'Receiver',
      'Winner',
      'Scoring',
      'Score After (P1-P2)',
      'Total Shots',
      'End Time (s)',
      'Point End Type',
      'Luck Type',
      'Highlight',
    ].join(',')

    const ralliesRows = matchData.rallies.map((rally) =>
      [
        rally.rallyIndex,
        rally.setId,
        rally.serverId === 'player1' ? player1Name : player2Name,
        rally.receiverId === 'player1' ? player1Name : player2Name,
        rally.winnerId
          ? rally.winnerId === 'player1'
            ? player1Name
            : player2Name
          : 'N/A',
        rally.isScoring ? 'Yes' : 'No',
        `${rally.player1ScoreAfter}-${rally.player2ScoreAfter}`,
        rally.shots.length,
        rally.endOfPointTime ? rally.endOfPointTime.toFixed(2) : 'N/A',
        rally.pointEndType || 'N/A',
        rally.luckType || 'N/A',
        rally.isHighlight ? 'Yes' : 'No',
      ].join(',')
    )

    const ralliesCSV = [ralliesHeader, ...ralliesRows].join('\n')

    // Create CSV for shots
    const contactsHeader = [
      'Shot ID',
      'Rally #',
      'Shot #',
      'Time (s)',
      'Player',
      'Serve Type',
      'Serve Spin',
      'Wing',
      'Shot Type',
      'Quality',
      'Landing Zone',
      'Landing Type',
      'Inferred Spin',
      'Tagged',
    ].join(',')

    const contactsRows = matchData.shots.map((shot) => {
      const rally = matchData.rallies.find((r) => r.id === shot.rallyId)
      const playerName = shot.playerId === 'player1' 
        ? player1Name 
        : shot.playerId === 'player2' 
        ? player2Name 
        : 'N/A'
      
      return [
        shot.id,
        rally ? rally.rallyIndex : 'N/A',
        shot.shotIndex,
        shot.time.toFixed(3),
        playerName,
        shot.serveType || '',
        shot.serveSpin || '',
        shot.wing || '',
        shot.shotType || '',
        shot.shotQuality || 'N/A',
        shot.landingZone || '',
        shot.landingType || '',
        shot.inferredSpin || '',
        shot.isTagged ? 'Yes' : 'No',
      ].join(',')
    })

    const contactsCSV = [contactsHeader, ...contactsRows].join('\n')

    // Create CSV for sets/sets
    const gamesHeader = [
      'Set #',
      'Set ID',
      'Final Score',
      'Winner',
      'Has Video',
      'End of Set Time (s)',
    ].join(',')

    const gamesRows = matchData.sets.map((game) =>
      [
        game.setNumber,
        game.id,
        `${player1Name} ${game.player1FinalScore}-${game.player2FinalScore} ${player2Name}`,
        game.winnerId === 'player1' 
          ? player1Name 
          : game.winnerId === 'player2' 
          ? player2Name 
          : 'N/A',
        game.hasVideo ? 'Yes' : 'No',
        game.endOfSetTimestamp ? game.endOfSetTimestamp.toFixed(3) : 'N/A',
      ].join(',')
    )

    const gamesCSV = [gamesHeader, ...gamesRows].join('\n')

    // Combine all CSVs with separators
    const fullCSV = `Match Metadata\nPlayer 1,${player1Name}\nPlayer 2,${player2Name}\nMatch Date,${matchData.matchDate || 'N/A'}\nMatch Result,${matchData.matchResult || 'N/A'}\nFinal Score,${matchData.finalSetScore || 'N/A'} (${matchData.finalPointsScore || 'N/A'})\n\nGames/Sets\n${gamesCSV}\n\nRallies\n${ralliesCSV}\n\nContacts\n${contactsCSV}`

    const dataBlob = new Blob([fullCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `match-data-${matchData.matchDate || 'unknown'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={exportToJSON}>
        <Icon name="download" className="w-4 h-4 mr-2" />
        Export JSON
      </Button>
      <Button variant="secondary" size="sm" onClick={exportToCSV}>
        <Icon name="download" className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
    </div>
  )
}

