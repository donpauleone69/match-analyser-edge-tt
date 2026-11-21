import { useEffect, useState } from 'react'

/**
 * A media query. `initial` is the first paint: pass false to stay false until
 * the effect, or a function to read matchMedia during the first render.
 */
export function useMediaQuery(query: string, initial: boolean | (() => boolean)) {
  const [matches, setMatches] = useState<boolean>(initial)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const apply = () => setMatches(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [query])
  return matches
}
