/**
 * Player Entity Types
 */

export type Handedness = 'right' | 'left'
export type Playstyle = 'attacker' | 'all_rounder' | 'defender' | 'disruptive'

export interface DBPlayer {
  id: string
  first_name: string
  last_name: string
  handedness: Handedness
  playstyle: Playstyle | null
  club_id: string | null // FK to clubs
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type NewPlayer = Omit<DBPlayer, 'id' | 'created_at' | 'updated_at'>

