import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reset shell (and Gate) scroll to top on every route change. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const shell = document.getElementById('shell-scroll')
    if (shell) shell.scrollTop = 0
    const gate = document.getElementById('gate-scroll')
    if (gate) gate.scrollTop = 0
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
