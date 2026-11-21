import { useEffect, useState } from 'react'

/** Any landscape window, and a square one. Portrait stays stacked. */
export const LANDSCAPE_QUERY = '(orientation: landscape), (min-aspect-ratio: 1/1)'

export function useLandscape() {
  const [land, setLand] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY)
    const apply = () => setLand(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return land
}
