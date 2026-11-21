import { useMatchStore } from '@/stores/matchStore'
import { SEED } from '../data/seed'

export function Home() {
  return useMatchStore.length + SEED.length
}
