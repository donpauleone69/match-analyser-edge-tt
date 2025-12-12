/**
 * Data Audit Feature - Type Definitions
 */

import type { DBSet, DBRally, DBShot, DBMatch } from '@/data'

export interface AuditData {
  match: DBMatch
  sets: SetAuditData[]
}

export interface SetAuditData {
  set: DBSet
  rallies: DBRally[]
  shots: DBShot[]
}

export type FieldCategory = 'setup' | 'tagging' | 'prepopulated'

export interface FieldConfig {
  key: string
  header: string
  category: FieldCategory
  defaultValue?: string
  description?: string
  render?: (value: any) => React.ReactNode
}




