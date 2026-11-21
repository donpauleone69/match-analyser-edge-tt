import { useEffect } from 'react'
import { useMatchStore } from '@/stores/matchStore'

/** The same light chip the tagger uses, for a save the database refused. */
export function SaveNotice() {
  const notice = useMatchStore((s) => s.notice)
  const dismissNotice = useMatchStore((s) => s.dismissNotice)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(dismissNotice, 4000)
    return () => window.clearTimeout(id)
  }, [notice, dismissNotice])

  if (!notice) return null
  return (
    <div
      role="status"
      className="fixed bottom-16 left-2 z-50 max-w-[70%] rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-950"
    >
      {notice}
    </div>
  )
}
