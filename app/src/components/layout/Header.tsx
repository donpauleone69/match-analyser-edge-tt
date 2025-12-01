import { ArrowLeft, Settings, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'

interface HeaderProps {
  title: string
  showBack?: boolean
}

export function Header({ title, showBack = false }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Don't show back on root pages
  const shouldShowBack = showBack && location.pathname !== '/'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-700 bg-bg-surface px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-neutral-50">{title}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Profile">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}

