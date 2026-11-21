import { Pressable, Card, CardDescription, CardHead } from '@/ui-mine'
import { WfBadge } from '@/ui-mine'
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
      <CardHead title="Prototype" badge={<WfBadge>demo data</WfBadge>} />
      <CardDescription>
        Empty is your own matches, saved on this device. Filled is the demo matches, reset each time you pick it.
      </CardDescription>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Demo data">
        {(['empty', 'filled'] as DemoMode[]).map((opt) => (
          <Pressable
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
          </Pressable>
        ))}
      </div>
    </Card>
  )
}
