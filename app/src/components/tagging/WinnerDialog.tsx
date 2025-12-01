import * as Dialog from '@radix-ui/react-dialog'
import { useTaggingStore } from '../../stores/taggingStore'

export function WinnerDialog() {
  const {
    showWinnerDialog,
    player1Name,
    player2Name,
    selectWinner,
  } = useTaggingStore()

  return (
    <Dialog.Root open={showWinnerDialog}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[400px] p-6 bg-bg-elevated rounded-xl shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-neutral-50 text-center mb-6">
            Who won the point?
          </Dialog.Title>

          <div className="space-y-3">
            <button
              onClick={() => selectWinner('player1')}
              className="w-full h-[60px] rounded-lg bg-brand-primary text-neutral-50 font-semibold text-lg
                         hover:bg-brand-primary-hover transition-colors
                         focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-elevated"
            >
              {player1Name}
            </button>
            <button
              onClick={() => selectWinner('player2')}
              className="w-full h-[60px] rounded-lg bg-brand-primary text-neutral-50 font-semibold text-lg
                         hover:bg-brand-primary-hover transition-colors
                         focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-elevated"
            >
              {player2Name}
            </button>
          </div>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Press 1 or 2 to select quickly
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

