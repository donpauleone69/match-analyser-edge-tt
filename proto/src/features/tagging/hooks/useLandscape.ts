import { useMediaQuery } from './useMediaQuery'

/** Any landscape window, and a square one. Portrait stays stacked. */
const LANDSCAPE_QUERY = '(orientation: landscape), (min-aspect-ratio: 1/1)'

export function useLandscape() {
  return useMediaQuery(LANDSCAPE_QUERY, false)
}
