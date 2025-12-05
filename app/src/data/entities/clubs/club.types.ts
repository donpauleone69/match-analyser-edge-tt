/**
 * Club Entity Types
 */

export interface DBClub {
  id: string
  name: string
  location: string | null
  created_at: string
  updated_at: string
}

export type NewClub = Omit<DBClub, 'id' | 'created_at' | 'updated_at'>

