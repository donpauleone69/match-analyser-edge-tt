import { Undo2 } from 'lucide-react'
import { useTaggingStore } from '../../stores/taggingStore'
import { Button } from '../ui/Button'

export function TaggingControls() {
  const {
    addContact,
    endRallyScore,
    endRallyNoScore,
    undoLastContact,
    currentRallyContacts,
  } = useTaggingStore()

  const hasContacts = currentRallyContacts.length > 0

  return (
    <div className="bg-bg-card border-t border-neutral-700 p-4 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      {/* Primary CONTACT button */}
      <Button
        variant="primary"
        size="xl"
        className="w-full text-xl font-bold tracking-wide"
        onClick={addContact}
      >
        CONTACT
      </Button>

      {/* Rally end buttons */}
      <div className="flex gap-2">
        <Button
          variant="success"
          size="lg"
          className="flex-1"
          onClick={endRallyScore}
          disabled={!hasContacts}
        >
          END RALLY — SCORE
        </Button>
        <button
          onClick={endRallyNoScore}
          disabled={!hasContacts}
          className="flex-1 h-12 px-4 rounded-md bg-neutral-600 text-neutral-100 font-semibold
                     hover:bg-neutral-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          END RALLY — NO SCORE
        </button>
      </div>

      {/* Undo button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={undoLastContact}
          disabled={!hasContacts}
          className="text-neutral-400"
        >
          <Undo2 className="w-4 h-4 mr-1" />
          UNDO LAST
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-xs text-neutral-500 pt-2 border-t border-neutral-700">
        <span className="px-2">Space = Contact</span>
        <span className="px-2">S = End Score</span>
        <span className="px-2">N = End No Score</span>
        <span className="px-2">Ctrl+Z = Undo</span>
      </div>
    </div>
  )
}

