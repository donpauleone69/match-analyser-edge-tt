import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDemo } from '@/data/demoStore'

/**
 * A new match nobody filled in is discarded as soon as it is left, however it
 * is left (header Back, main nav, browser Back).
 */
export function DiscardUntouched() {
  const { pathname } = useLocation()
  const { removeUntouchedMatches } = useDemo()
  const openId = pathname.match(/^\/matches\/([^/]+)/)?.[1]

  useEffect(() => {
    removeUntouchedMatches(openId)
  }, [openId, removeUntouchedMatches])

  return null
}
