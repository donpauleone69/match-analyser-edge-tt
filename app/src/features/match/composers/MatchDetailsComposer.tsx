import { useNavigate } from 'react-router-dom'
import { useArchiveStep, useMatchRecord, useMatchStore } from '@/stores/matchStore'
import { DeleteMatchSection } from '../sections/DeleteMatchSection'
import { MatchFieldsSection } from '../sections/MatchFieldsSection'
import { ResultSection } from '../sections/ResultSection'

/** Details: who and when, then result and set scores as one area. Videos live on Tag. */
export function MatchDetailsComposer({ matchId }: { matchId: string }) {
  const match = useMatchRecord(matchId)
  const updateMatch = useMatchStore((s) => s.updateMatch)
  const setResult = useMatchStore((s) => s.setResult)
  const setEnteredScore = useMatchStore((s) => s.setEnteredScore)
  const mutateMatch = useMatchStore((s) => s.mutateMatch)
  const deleteMatch = useMatchStore((s) => s.deleteMatch)
  const archiveStep = useArchiveStep(matchId)
  const navigate = useNavigate()
  if (!match) return null

  const onDelete = () => {
    deleteMatch(matchId)
    navigate('/matches')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <MatchFieldsSection match={match} updateMatch={updateMatch} />
        </div>
        <ResultSection
          match={match}
          setResult={setResult}
          setEnteredScore={setEnteredScore}
          mutateMatch={mutateMatch}
        />
      </div>
      <DeleteMatchSection match={match} archiving={archiveStep !== null} onDelete={onDelete} />
    </div>
  )
}
