/**
 * MatchStorageBlock — backup status for the match and each set video.
 */

import { useState } from 'react'
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
  onArchiveVideo: (assetId: string) => void
  onRetrieveVideo: (assetId: string) => void
  onTrimVideo: (assetId: string, setNumber: number, sourceStart: number, sourceEnd: number) => void
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
  onArchiveVideo,
  onRetrieveVideo,
  onTrimVideo,
  onKeepDevice,
  onUseCloud,
  onSaveFile,
  onSignIn,
}: MatchStorageBlockProps) {
  const [trimFor, setTrimFor] = useState<string | null>(null)
  const [trimStart, setTrimStart] = useState('0')
  const [trimEnd, setTrimEnd] = useState('')

  const syncText =
    storage.sync === 'synced'
      ? `Backed up ${storage.syncedAtLabel ?? ''}`
      : storage.sync === 'changed'
        ? 'Changed since last backup'
        : 'Not backed up'
  const spin = (key: string) => (busy === key ? 'animate-spin' : undefined)

  const openTrim = (assetId: string, durationS: number | null) => {
    setTrimFor(assetId)
    setTrimStart('0')
    setTrimEnd(durationS && durationS > 0 ? String(Math.floor(durationS)) : '')
  }

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
          <span key={v.assetId} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-400">
            <Icon name="video" size="sm" />
            Set {v.setNumber} video: {VIDEO_LABEL[v.availability]}
            {v.archivedLocally && (
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-amber-300">archived</span>
            )}
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
            {(v.availability === 'device' || v.availability === 'device+cloud') && (
              <button
                type="button"
                onClick={() => onArchiveVideo(v.assetId)}
                disabled={busy !== null}
                className="flex items-center gap-1 text-neutral-300 hover:underline disabled:opacity-50"
                title="Remove the device copy after a cloud backup. Tags stay on source-video time."
              >
                <Icon name={busy === `archive-${v.assetId}` ? 'loader' : 'hard-drive'} size="xs" className={spin(`archive-${v.assetId}`)} />
                Archive device copy
              </button>
            )}
            {v.canRetrieve && v.availability !== 'device' && v.availability !== 'device+cloud' && (
              <button
                type="button"
                onClick={() => onRetrieveVideo(v.assetId)}
                disabled={busy !== null}
                className="flex items-center gap-1 text-brand-primary hover:underline disabled:opacity-50"
              >
                <Icon name={busy === `retrieve-${v.assetId}` ? 'loader' : 'cloud-download'} size="xs" className={spin(`retrieve-${v.assetId}`)} />
                Retrieve to device
              </button>
            )}
            {(v.availability === 'device' || v.availability === 'device+cloud') && (
              <button
                type="button"
                onClick={() => (trimFor === v.assetId ? setTrimFor(null) : openTrim(v.assetId, v.durationS))}
                disabled={busy !== null}
                className="flex items-center gap-1 text-neutral-300 hover:underline disabled:opacity-50"
                title="Cut a trimmed file for a source-seconds window. Tags stay in source seconds."
              >
                <Icon name={busy === `trim-${v.assetId}` ? 'loader' : 'scissors'} size="xs" className={spin(`trim-${v.assetId}`)} />
                {trimFor === v.assetId ? 'Cancel trim' : 'Trim…'}
              </button>
            )}
            {trimFor === v.assetId && (
              <span className="flex flex-wrap items-center gap-2 text-neutral-300">
                <label className="flex items-center gap-1">
                  Start
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    className="w-20 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
                  />
                  s
                </label>
                <label className="flex items-center gap-1">
                  End
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    className="w-20 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
                    placeholder={v.durationS ? String(Math.floor(v.durationS)) : 'end'}
                  />
                  s
                </label>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="flex items-center gap-1 text-brand-primary hover:underline disabled:opacity-50"
                  onClick={() => {
                    const start = Number(trimStart)
                    const end = Number(trimEnd)
                    onTrimVideo(v.assetId, v.setNumber, start, end)
                    setTrimFor(null)
                  }}
                >
                  Save trimmed asset
                </button>
              </span>
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
