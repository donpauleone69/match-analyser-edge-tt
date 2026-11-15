import { Link } from 'react-router-dom'
import { Icon, buttonKindClass, buttonKindControlSquare } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { BrandMark } from '@/layout/BrandMark'

/**
 * Shared header. Always reserves a left back slot (same row height) so hub tabs
 * never shift. Pass backTo only when Back should show (up one level).
 */
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
        <div className="min-w-0 flex items-start gap-2">
          <div
            className={cn(
              buttonKindControlSquare,
              'shrink-0 flex items-center justify-center mt-0.5'
            )}
          >
            {backTo ? (
              <Link
                to={backTo}
                className={cn(
                  buttonKindClass.control,
                  'inline-flex h-full w-full items-center justify-center rounded-md text-brand hover:bg-pill-idle'
                )}
                aria-label="Back"
              >
                <Icon name="chevron-left" size="sm" />
              </Link>
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-primary leading-8">{title}</h1>
            {subtitle ? <p className="text-sm text-muted mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
        {/* Brand on phone; md+ brand lives in the top nav bar */}
        <BrandMark className="pt-1 md:hidden" />
      </div>
    </header>
  )
}
