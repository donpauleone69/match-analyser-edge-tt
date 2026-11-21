import { Link, type NavigateFunction } from 'react-router-dom'
import { Button } from '@/ui-mine'
import { formatMatchRowLine } from '@/rules/format'
import { formatMatchName, deriveMatchRowStatus } from '@/rules/matchStatus'
import type { MatchRecord } from '@/types/match'

export function MatchRowBlock({ m, navigate }: { m: MatchRecord; navigate: NavigateFunction }) {
  const status = deriveMatchRowStatus(m)
  const line = formatMatchRowLine(m)
  const to =
    status.tab === 'details'
      ? `/matches/${m.id}/details#result`
      : `/matches/${m.id}/${status.tab}`
  return (
    <li className="flex items-center border-b border-border" data-match-row={m.id} data-row-status={status.kind}>
      <Link
        to={to}
        className="flex min-h-[62px] min-w-0 flex-1 items-center px-4 py-3 hover:bg-bg-elevated sm:px-6 lg:px-8"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-primary">{formatMatchName(m)}</span>
          <span className="mt-0.5 block h-4 truncate text-xs text-muted">{line}</span>
        </span>
        {status.kind === 'continue' ? null : (
          <span className="ml-3 shrink-0 text-right text-xs text-muted">{status.text}</span>
        )}
      </Link>
      {status.kind === 'continue' && status.setId !== null ? (
        <div className="shrink-0 pr-4 sm:pr-6 lg:pr-8">
          <Button
            kind="control"
            variant="secondary"
            data-continue-set={status.setId}
            onClick={() => navigate(`/matches/${m.id}/tag/${status.setId}`)}
          >
            {status.text}
          </Button>
        </div>
      ) : null}
    </li>
  )
}
