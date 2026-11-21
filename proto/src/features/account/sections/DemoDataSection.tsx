import { Card, CardDescription, CardTitle } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
import type { DemoMode } from '@/types/match'
import { cn } from '@/helpers/utils'

export function DemoDataSection({
  mode,
  setMode,
}: {
  mode: DemoMode
  setMode: (mode: DemoMode) => void
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Prototype</CardTitle>
        <WfBadge>demo data</WfBadge>
      </div>
      <CardDescription>
        Empty shows only empty states. Filled restores the seed matches.
      </CardDescription>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Demo data">
        {(['empty', 'filled'] as DemoMode[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setMode(opt)}
            className={cn(
              'btn-kind-control rounded-md border px-3 text-sm font-semibold capitalize',
              mode === opt
                ? 'border-brand-primary bg-brand-primary-muted text-primary'
                : 'border-border bg-bg-card text-muted hover:bg-bg-elevated'
            )}
            aria-pressed={mode === opt}
          >
            {opt}
          </button>
        ))}
      </div>
    </Card>
  )
}
