/**
 * ReelListBlock — exported reels: play, back up to the cloud, fetch to device.
 */

import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { ReelRowModel } from '../models'

export interface ReelListBlockProps {
  reels: ReelRowModel[]
  activeAssetId: string | null
  busyAssetId: string | null
  canUseCloud: boolean
  onPlay: (reel: ReelRowModel) => void
  onUpload: (reel: ReelRowModel) => void
  onDownload: (reel: ReelRowModel) => void
}

const AVAILABILITY: Record<
  ReelRowModel['availability'],
  { icon: 'hard-drive' | 'cloud' | 'cloud-off'; label: string; tone: string }
> = {
  device: { icon: 'hard-drive', label: 'Device', tone: 'text-muted' },
  'device+cloud': { icon: 'cloud', label: 'Synced', tone: 'text-result-winner' },
  cloud: { icon: 'cloud', label: 'Cloud', tone: 'text-callout-info' },
  missing: { icon: 'cloud-off', label: 'Missing', tone: 'text-review' },
}

export function ReelListBlock({
  reels,
  activeAssetId,
  busyAssetId,
  canUseCloud,
  onPlay,
  onUpload,
  onDownload,
}: ReelListBlockProps) {
  if (reels.length === 0) return null
  const iconBtn =
    'h-8 w-8 shrink-0 rounded-md border border-border flex items-center justify-center text-primary hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none'
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Saved reels</h3>
      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-bg-card">
        {reels.map((r) => {
          const a = AVAILABILITY[r.availability]
          const busy = busyAssetId === r.assetId
          return (
            <li
              key={r.assetId}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5',
                activeAssetId === r.assetId &&
                  'bg-contact-selected-bg ring-1 ring-inset ring-contact-selected/40'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-primary truncate">{r.label}</p>
                <p className="text-xs text-muted tabular-nums truncate">
                  {r.clipCount} · {r.durationLabel} · {r.sizeLabel}
                  <span className={cn('ml-1.5 inline-flex items-center gap-0.5', a.tone)}>
                    <Icon name={a.icon} size="xs" /> {a.label}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className={iconBtn}
                onClick={() => onPlay(r)}
                disabled={r.availability === 'missing'}
                aria-label={`Play ${r.label}`}
                title="Play"
              >
                <Icon name="play" size="sm" />
              </button>
              {canUseCloud && r.availability === 'device' && (
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => onUpload(r)}
                  disabled={busy}
                  aria-label={`Back up ${r.label}`}
                  title="Back up"
                >
                  <Icon name={busy ? 'loader' : 'cloud-upload'} size="sm" className={busy ? 'animate-spin' : undefined} />
                </button>
              )}
              {canUseCloud && r.availability === 'cloud' && (
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => onDownload(r)}
                  disabled={busy}
                  aria-label={`Save ${r.label} to device`}
                  title="Save to device"
                >
                  <Icon
                    name={busy ? 'loader' : 'cloud-download'}
                    size="sm"
                    className={busy ? 'animate-spin' : undefined}
                  />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
