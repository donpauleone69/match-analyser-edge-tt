import { db } from '@/data/db'
import type { DBTrainingPost, NewTrainingPost } from './trainingPost.types'

function newId(): string {
  const hex = crypto.getRandomValues(new Uint8Array(8))
  return `tp_${Array.from(hex, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export const trainingPostDb = {
  async getById(id: string): Promise<DBTrainingPost | undefined> {
    return db.training_posts.get(id)
  },

  async getByPlayer(playerId: string): Promise<DBTrainingPost[]> {
    const rows = await db.training_posts.where('player_id').equals(playerId).toArray()
    return rows.sort((a, b) => b.month.localeCompare(a.month) || b.created_at.localeCompare(a.created_at))
  },

  async create(data: NewTrainingPost): Promise<DBTrainingPost> {
    const now = new Date().toISOString()
    const post: DBTrainingPost = { ...data, id: newId(), created_at: now, updated_at: now }
    await db.training_posts.add(post)
    return post
  },

  async update(id: string, patch: Partial<NewTrainingPost>): Promise<DBTrainingPost> {
    const existing = await db.training_posts.get(id)
    if (!existing) throw new Error(`Training post ${id} not found`)
    const updated: DBTrainingPost = { ...existing, ...patch, updated_at: new Date().toISOString() }
    await db.training_posts.put(updated)
    return updated
  },

  async remove(id: string): Promise<void> {
    await db.training_posts.delete(id)
  },
}
