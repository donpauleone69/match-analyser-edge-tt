/**
 * Generate a unique ID for database records
 * Uses a combination of timestamp and random string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

