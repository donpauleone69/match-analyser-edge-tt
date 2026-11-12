/**
 * MatchStorageBlock — backup status for the match and each set video.
 */

import { Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { MatchStorageModel } from '../derive/useDeriveMatchStorage'

export interface MatchStorageBlockProps {
  storage: MatchStorageModel
  signedIn: boolean
  cloudAvailable: boolean
  busy: string | null
  /** Progress of the video upload named by `busy` */
  uploadPercent: number | null
  conflict: boolean
  onBackUpMatch: () => void
  onBackUpVideo: (assetId: string) => void
  onKeepDevice: () => void
  onUseCloud: () => void
  onSaveFile: () => void
  onSignIn: () => void
}

const VIDEO_LABEL = {
  device: 'on this device',
  'device+cloud': 'device + cloud',
  cloud: 'cloud only',
  missing: 'not on this device',
} as const

export function MatchStorageBlock({
  storage,
  signedIn,
  cloudAvailable,
  busy,
  uploadPercent,
  conflict,
  onBackUpMatch,
  onBackUpVideo,
  onKeepDevice,
  onUseCloud,
  onSaveFile,
  onSignIn,
}: MatchStorageBlockProps) {
  const syncText =
    storage.sync === 'synced'
      ? `Backed up ${storage.syncedAtLabel ?? ''}`
      : storage.sync === 'changed'
        ? 'Changed since last backup'
        : 'Not backed up'
  const spin = (key: string) => (busy === key ? 'animate-spin' : undefined)

  return (
    <div className="rounded-lg border border-neutral-700 bg-bg-card px-4 py-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={cn(
            'flex items-center gap-1.5',
            storage.sync === 'synced' ? 'text-emerald-400' : storage.sync === 'changed' ? 'text-amber-300' : 'text-neutral-400'
          )}
        >
          <Icon name={storage.sync === 'never' ? 'cloud-off' : 'cloud'} size="sm" />
          {cloudAvailable ? syncText : 'Saved on this device'}
        </span>

        {cloudAvailable && signedIn && storage.sync !== 'synced' && !conflict && (
          <Button size="sm" variant="secondary" onClick={onBackUpMatch} disabled={busy !== null}>
            <Icon name={busy === 'match' ? 'loader' : 'cloud-upload'} size="sm" className={spin('match')} /> Back up match
          </Button>
        )}
        {cloudAvailable && !signedIn && (
          <button type="button" onClick={onSignIn} className="text-brand-primary hover:underline">
            Sign in to back up
          </button>
        )}

        {storage.setVideos.map((v) => (
          <span key={v.assetId} className="flex items-center gap-1.5 text-neutral-400">
            <Icon name="video" size="sm" />
            Set {v.setNumber} video: {VIDEO_LABEL[v.availability]}
            {cloudAvailable && signedIn && v.availability === 'device' && (
              <button
                type="button"
                onClick={() => onBackUpVideo(v.assetId)}
                disabled={busy !== null}
                className="ml-1 flex items-center gap-1 text-brand-primary hover:underline disabled:opacity-50"
                title={`Upload ${v.sizeLabel} to your private cloud storage`}
              >
                <Icon name={busy === v.assetId ? 'loader' : 'cloud-upload'} size="xs" className={spin(v.assetId)} />
                {busy === v.assetId && uploadPercent !== null ? `Uploading ${uploadPercent}%` : `Back up (${v.sizeLabel})`}
              </button>
            )}
          </span>
        ))}

        <span className="flex-1" />
        <button type="button" onClick={onSaveFile} className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-100">
          <Icon name="file-down" size="sm" /> Save match file
        </button>
      </div>

      {conflict && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-amber-100">
          <Icon name="warning" size="sm" />
          <span className="flex-1">This match was also changed on another device. Which copy should win?</span>
          <Button size="sm" variant="secondary" onClick={onKeepDevice} disabled={busy !== null}>
            Keep this device’s
          </Button>
          <Button size="sm" variant="secondary" onClick={onUseCloud} disabled={busy !== null}>
            Use the cloud copy
          </Button>
        </div>
      )}
    </div>
  )
}
