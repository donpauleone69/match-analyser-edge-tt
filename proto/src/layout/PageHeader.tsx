import { Link } from 'react-router-dom'
import { Icon } from '@/ui-mine'

export function PageHeader({
  title,
  subtitle,
  backTo,
}: {
  title: string
  subtitle?: string
  backTo?: string
}) {
  return (
    <header className="px-4 pt-4 pb-2">
      {backTo ? (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand mb-2"
        >
          <Icon name="chevron-left" size="sm" />
          Back
        </Link>
      ) : null}
      <h1 className="text-xl font-bold text-primary">{title}</h1>
      {subtitle ? <p className="text-sm text-muted mt-0.5">{subtitle}</p> : null}
    </header>
  )
}
