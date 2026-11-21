import { Link, useLocation } from 'react-router-dom'

export function LinkSection() {
  const { pathname } = useLocation()
  return <Link to={pathname}>Here</Link>
}
