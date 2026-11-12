/**
 * Video Asset DB Operations — direct Dexie access
 */

import { db } from '@/data/db'
import type { DBVideoAsset, NewVideoAsset } from './videoAsset.types'

function newAssetId(): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : Math.random().toString(36).slice(2, 18)
  return `va_${rand}`
}

export const videoAssetDb = {
  async getById(id: string): Promise<DBVideoAsset | undefined> {
    return db.video_assets.get(id)
  },

  async getByMatch(matchId: string): Promise<DBVideoAsset[]> {
    return db.video_assets.where('match_id').equals(matchId).toArray()
  },

  async getAll(): Promise<DBVideoAsset[]> {
    return db.video_assets.toArray()
  },

  /** Newest source asset for a set */
  async getSetSource(matchId: string, setNumber: number): Promise<DBVideoAsset | undefined> {
    const list = await db.video_assets
      .where('[match_id+set_number]')
      .equals([matchId, setNumber])
      .filter((a) => a.kind === 'source')
      .toArray()
    return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  },

  async create(data: NewVideoAsset, id: string = newAssetId()): Promise<DBVideoAsset> {
    const now = new Date().toISOString()
    const asset: DBVideoAsset = { ...data, id, created_at: now, updated_at: now }
    await db.video_assets.put(asset)
    return asset
  },

  async put(asset: DBVideoAsset): Promise<void> {
    await db.video_assets.put(asset)
  },

  async update(id: string, patch: Partial<Omit<DBVideoAsset, 'id' | 'created_at'>>): Promise<DBVideoAsset> {
    const existing = await db.video_assets.get(id)
    if (!existing) throw new Error(`Video asset ${id} not found`)
    const updated: DBVideoAsset = { ...existing, ...patch, updated_at: new Date().toISOString() }
    await db.video_assets.put(updated)
    return updated
  },

  async remove(id: string): Promise<void> {
    await db.video_assets.delete(id)
  },
}
