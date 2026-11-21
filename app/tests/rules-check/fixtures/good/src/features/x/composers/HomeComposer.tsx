import { useMatchStore } from '@/stores/useMatch'
import { ListSection } from '../sections/ListSection'
import { useDeriveList } from '../derive/deriveList'
import { usePlayer } from '../hooks/usePlayer'

export function HomeComposer() {
  return ListSection({ n: useMatchStore.length + useDeriveList() + usePlayer() })
}
