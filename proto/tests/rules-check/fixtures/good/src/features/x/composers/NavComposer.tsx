import { useNavigate } from 'react-router-dom'

export function NavComposer() {
  const go = useNavigate()
  return go('/tag')
}
