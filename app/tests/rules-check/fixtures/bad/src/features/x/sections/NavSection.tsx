import { useNavigate } from 'react-router-dom'

export function NavSection() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/tag')}>Go</button>
}
