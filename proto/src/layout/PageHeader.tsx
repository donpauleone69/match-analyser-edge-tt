import { Link } from 'react-router-dom'
import { Icon } from '@/ui-mine'
import { BrandMark } from '@/layout/BrandMark'

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
    <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
        </div>
        <BrandMark className="pt-1" />
      </div>
    </header>
  )
}
