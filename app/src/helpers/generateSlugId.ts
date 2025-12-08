/**
 * Generate slug-based IDs for database entities
 * 
 * Slug format ensures human-readable, hierarchical IDs with random suffixes for uniqueness:
 * - Player: {first}-{last}-{id4}
 * - Club: {name}-{city}-{id4}
 * - Tournament: {name}-{yyyy}-{mm}-{id4}
 * - Match: {p1short}-vs-{p2short}-{yyyymmdd}-{id4}
 * - MatchVideo: {match_id}-v{num}
 * - Set: {match_id}-s{num}
 * - Rally: {set_id}-r{num}
 * - Shot: {rally_id}-sh{num}
 */

/**
 * Generate a 4-character random ID suffix using alphanumeric characters
 */
function generateId4(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Slugify a string for use in IDs
 * Converts to lowercase, replaces spaces/special chars with hyphens
 * Preserves full text (doesn't truncate)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') // Collapse multiple hyphens
}

/**
 * Shorten player name for match slugs
 * "John" "Smith" → "jsmith"
 */
function shortenPlayerName(firstName: string, lastName: string): string {
  const firstInitial = firstName.trim().charAt(0).toLowerCase()
  const lastSlug = slugify(lastName)
  return `${firstInitial}${lastSlug}`
}

/**
 * Generate rally ID: {set_id}-r{num}
 */
export function generateRallyId(setId: string, rallyNumber: number): string {
  return `${setId}-r${rallyNumber}`
}

/**
 * Generate shot ID: {rally_id}-sh{num}
 */
export function generateShotId(rallyId: string, shotNumber: number): string {
  return `${rallyId}-sh${shotNumber}`
}

/**
 * Generate match ID: {p1short}-vs-{p2short}-{yyyymmdd}-{id4}
 * Example: "jsmith-vs-mgarcia-20251208-a3f2"
 * 
 * Note: Requires full player names (first and last) to generate shortened versions
 */
export function generateMatchId(
  player1FirstName: string,
  player1LastName: string,
  player2FirstName: string,
  player2LastName: string,
  matchDate: Date
): string {
  const p1Short = shortenPlayerName(player1FirstName, player1LastName)
  const p2Short = shortenPlayerName(player2FirstName, player2LastName)
  
  const year = matchDate.getFullYear()
  const month = String(matchDate.getMonth() + 1).padStart(2, '0')
  const day = String(matchDate.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  const id4 = generateId4()
  
  return `${p1Short}-vs-${p2Short}-${dateStr}-${id4}`
}

/**
 * Generate set ID: {match_id}-s{num}
 */
export function generateSetId(matchId: string, setNumber: number): string {
  return `${matchId}-s${setNumber}`
}

/**
 * Generate player ID: {first}-{last}-{id4}
 * Example: "john-smith-a3f2"
 */
export function generatePlayerId(firstName: string, lastName: string): string {
  const first = slugify(firstName) || 'player'
  const last = slugify(lastName) || 'unknown'
  const id4 = generateId4()
  
  return `${first}-${last}-${id4}`
}

/**
 * Generate club ID: {name}-{city}-{id4}
 * Example: "riverside-tt-london-a3f2"
 */
export function generateClubId(name: string, city: string): string {
  const clubName = slugify(name) || 'club'
  const citySlug = slugify(city) || 'city'
  const id4 = generateId4()
  
  return `${clubName}-${citySlug}-${id4}`
}

/**
 * Generate tournament ID: {name}-{yyyy}-{mm}-{id4}
 * Example: "spring-champs-2025-03-a3f2"
 */
export function generateTournamentId(name: string, startDate: Date): string {
  const nameSlug = slugify(name) || 'tournament'
  const year = startDate.getFullYear()
  const month = String(startDate.getMonth() + 1).padStart(2, '0')
  const id4 = generateId4()
  
  return `${nameSlug}-${year}-${month}-${id4}`
}

/**
 * Generate match video ID: {match_id}-v{num}
 */
export function generateMatchVideoId(matchId: string, videoNumber: number): string {
  return `${matchId}-v${videoNumber}`
}

/**
 * Generate shot inference ID: {shot_id}-{field_name}-{id4}
 */
export function generateShotInferenceId(shotId: string, fieldName: string): string {
  const id4 = generateId4()
  return `${shotId}-${fieldName}-${id4}`
}

