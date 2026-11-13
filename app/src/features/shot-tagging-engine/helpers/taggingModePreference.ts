/**
 * Device preference for tagging mode (Simple vs Pass 1 Focus).
 * Pure localStorage helpers — no React.
 */

export type SessionTaggingMode = 'simple' | 'pass1focus'

const LAST_MODE_KEY = 'edge-tt-tagging-mode:v1:last'
const RALLY_MODE_PREFIX = 'edge-tt-rally-tagging-mode:v1:'

function isMode(value: unknown): value is SessionTaggingMode {
  return value === 'simple' || value === 'pass1focus'
}

/** Last mode chosen on this device (defaults to Pass 1 until first pick). */
export function loadLastTaggingMode(): SessionTaggingMode {
  try {
    const raw = localStorage.getItem(LAST_MODE_KEY)
    if (isMode(raw)) return raw
  } catch {
    // ignore
  }
  return 'pass1focus'
}

export function saveLastTaggingMode(mode: SessionTaggingMode): void {
  try {
    localStorage.setItem(LAST_MODE_KEY, mode)
  } catch {
    // ignore
  }
}

function rallyModeKey(rallyId: string): string {
  return `${RALLY_MODE_PREFIX}${rallyId}`
}

/** Mode used when the rally was saved (same-device reopen). */
export function loadRallyTaggingMode(rallyId: string): SessionTaggingMode | null {
  try {
    const raw = localStorage.getItem(rallyModeKey(rallyId))
    if (isMode(raw)) return raw
  } catch {
    // ignore
  }
  return null
}

export function saveRallyTaggingMode(
  rallyId: string,
  mode: SessionTaggingMode
): void {
  try {
    localStorage.setItem(rallyModeKey(rallyId), mode)
  } catch {
    // ignore
  }
}

export function buildTagPath(
  matchId: string,
  setNumber: number,
  mode?: SessionTaggingMode,
  redo = false
): string {
  const resolved = mode ?? loadLastTaggingMode()
  const params = new URLSearchParams({
    set: String(setNumber),
    mode: resolved,
  })
  if (redo) params.set('redo', 'true')
  return `/matches/${matchId}/tag?${params.toString()}`
}
