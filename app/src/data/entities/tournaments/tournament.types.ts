/**
 * Tournament Entity Types
 */

export type TournamentType = 'friendly' | 'club' | 'local' | 'regional' | 'national' | 'international'

export interface DBTournament {
  id: string // Slug format: {name}-{yyyy}-{mm}-{id4}
  name: string
  location: string | null
  start_date: string // ISO date string
  end_date: string | null // ISO date string
  tournament_type: TournamentType
  tournament_host_club_id: string | null // FK to clubs (slug)
  notes: string | null
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export type NewTournament = Omit<DBTournament, 'id' | 'created_at' | 'updated_at'>

