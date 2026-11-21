import { useEffect, useState } from 'react'

export function useMediaQuery(query: string, initial: boolean) {
  const [on, setOn] = useState(initial)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const apply = () => setOn(mq.matches)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [query])
  return on
}
