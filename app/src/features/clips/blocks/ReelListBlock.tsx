/**
 * ReelListBlock — exported reels: play, back up to the cloud, fetch to device.
 */

import { Button, Icon } from '@/ui-mine'
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

const AVAILABILITY: Record<ReelRowModel['availability'], { icon: 'hard-drive' | 'cloud' | 'cloud-off'; label: string; tone: string }> = {
  device: { icon: 'hard-drive', label: 'This device', tone: 'text-neutral-400' },
  'device+cloud': { icon: 'cloud', label: 'Device + cloud', tone: 'text-result-winner' },
  cloud: { icon: 'cloud', label: 'Cloud only', tone: 'text-sky-300' },
  missing: { icon: 'cloud-off', label: 'Missing', tone: 'text-review' },
}

export function ReelListBlock({ reels, activeAssetId, busyAssetId, canUseCloud, onPlay, onUpload, onDownload }: ReelListBlockProps) {
  if (reels.length === 0) return null
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-200">Saved reels</h3>
      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-700 bg-bg-card">
        {reels.map((r) => {
          const a = AVAILABILITY[r.availability]
          const busy = busyAssetId === r.assetId
          return (
            <li key={r.assetId} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5', activeAssetId === r.assetId && 'bg-contact-selected-bg ring-1 ring-inset ring-contact-selected/40')}>
              <Icon name="film" size="sm" className="text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-100 truncate">{r.label}</p>
                <p className="text-xs text-neutral-500">
                  {r.clipCount} clips · {r.durationLabel} · {r.sizeLabel} · {r.createdLabel}
                </p>
              </div>
              <span className={cn('flex items-center gap-1 text-xs', a.tone)}>
                <Icon name={a.icon} size="xs" /> {a.label}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => onPlay(r)} disabled={r.availability === 'missing'}>
                  <Icon name="play" size="sm" /> Play
                </Button>
                {canUseCloud && r.availability === 'device' && (
                  <Button size="sm" variant="secondary" onClick={() => onUpload(r)} disabled={busy}>
                    <Icon name={busy ? 'loader' : 'cloud-upload'} size="sm" className={busy ? 'animate-spin' : undefined} /> Back up
                  </Button>
                )}
                {canUseCloud && r.availability === 'cloud' && (
                  <Button size="sm" variant="secondary" onClick={() => onDownload(r)} disabled={busy}>
                    <Icon name={busy ? 'loader' : 'cloud-download'} size="sm" className={busy ? 'animate-spin' : undefined} /> Save to device
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
