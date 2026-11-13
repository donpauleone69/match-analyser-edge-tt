/**
 * MatchStorageBlock — backup, guided trim (cut dead air), archive device copy.
 */

import { useState } from 'react'
import { Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { validateTrimWindow } from '@/rules/derive/clips/deriveClipEdl'
import type { SetJumpMarkers } from '@/rules/videoLifecycle'
import type { MatchStorageModel } from '../derive/useDeriveMatchStorage'

export interface MatchStorageBlockProps {
  storage: MatchStorageModel
  /** Per-set jump / guided-trim markers from tagged rallies */
  setMarkers?: SetJumpMarkers[]
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

function formatClock(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function MatchStorageBlock({
  storage,
  setMarkers = [],
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
  const [trimError, setTrimError] = useState<string | null>(null)

  const syncText =
    storage.sync === 'synced'
      ? `Backed up ${storage.syncedAtLabel ?? ''}`
      : storage.sync === 'changed'
        ? 'Changed since last backup'
        : 'Not backed up'
  const spin = (key: string) => (busy === key ? 'animate-spin' : undefined)

  const markersFor = (setNumber: number) => setMarkers.find((m) => m.setNumber === setNumber)

  const openTrim = (assetId: string, setNumber: number, durationS: number | null) => {
    const m = markersFor(setNumber)
    setTrimFor(assetId)
    setTrimError(null)
    setTrimStart(
      m?.suggestedTrimStartS != null ? String(m.suggestedTrimStartS) : '0'
    )
    setTrimEnd(
      m?.suggestedTrimEndS != null
        ? String(m.suggestedTrimEndS)
        : durationS && durationS > 0
          ? String(Math.floor(durationS))
          : ''
    )
  }

  const applyPlayWindow = (setNumber: number, durationS: number | null) => {
    const m = markersFor(setNumber)
    if (!m || (m.suggestedTrimStartS == null && m.suggestedTrimEndS == null)) return
    if (m.suggestedTrimStartS != null) setTrimStart(String(m.suggestedTrimStartS))
    if (m.suggestedTrimEndS != null) {
      const end =
        durationS && durationS > 0
          ? Math.min(m.suggestedTrimEndS, Math.floor(durationS))
          : m.suggestedTrimEndS
      setTrimEnd(String(end))
    }
    setTrimError(null)
  }

  const handleArchive = (assetId: string, setNumber: number) => {
    const ok = window.confirm(
      `Archive Set ${setNumber} device copy?\n\nRequires a cloud backup. Tags stay on source-video time so you can retrieve later. The original file is removed from this phone/computer only.`
    )
    if (ok) onArchiveVideo(assetId)
  }

  const handleSaveTrim = (
    assetId: string,
    setNumber: number,
    durationS: number | null
  ) => {
    const start = Number(trimStart)
    const end = Number(trimEnd)
    const check = validateTrimWindow({ sourceStart: start, sourceEnd: end, durationS })
    if (!check.ok) {
      setTrimError(check.error)
      return
    }
    const m = markersFor(setNumber)
    const coversPlay =
      m?.firstServeS == null ||
      m?.lastActionS == null ||
      (check.sourceStart <= m.firstServeS && check.sourceEnd >= m.lastActionS)
    if (!coversPlay) {
      const proceed = window.confirm(
        `This trim window may cut into tagged play (first serve ${m?.firstServeS != null ? formatClock(m.firstServeS) : '?'} → last action ${m?.lastActionS != null ? formatClock(m.lastActionS) : '?'}).\n\nTags stay in source seconds, but the trimmed file may miss some contacts. Continue anyway?`
      )
      if (!proceed) return
    }
    onTrimVideo(assetId, setNumber, check.sourceStart, check.sourceEnd)
    setTrimFor(null)
    setTrimError(null)
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-bg-card px-4 py-3 space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={cn(
            'flex items-center gap-1.5',
            storage.sync === 'synced'
              ? 'text-emerald-400'
              : storage.sync === 'changed'
                ? 'text-amber-300'
                : 'text-neutral-400'
          )}
        >
          <Icon name={storage.sync === 'never' ? 'cloud-off' : 'cloud'} size="sm" />
          {cloudAvailable ? syncText : 'Saved on this device'}
        </span>

        {cloudAvailable && signedIn && storage.sync !== 'synced' && !conflict && (
          <Button size="sm" variant="secondary" onClick={onBackUpMatch} disabled={busy !== null}>
            <Icon name={busy === 'match' ? 'loader' : 'cloud-upload'} size="sm" className={spin('match')} /> Back up
            match
          </Button>
        )}
        {cloudAvailable && !signedIn && (
          <button type="button" onClick={onSignIn} className="text-brand-primary hover:underline">
            Sign in to back up
          </button>
        )}

        <span className="flex-1" />
        <button
          type="button"
          onClick={onSaveFile}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-100"
        >
          <Icon name="file-down" size="sm" /> Save match file
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Tournament captures often have long intro and gaps. Trim keeps tags on source time; archive
        removes the device original after cloud backup.
      </p>

      <ul className="space-y-3">
        {storage.setVideos.map((v) => {
          const m = markersFor(v.setNumber)
          const onDevice = v.availability === 'device' || v.availability === 'device+cloud'
          return (
            <li
              key={v.assetId}
              className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2.5 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-300">
                <Icon name="video" size="sm" />
                <span className="font-semibold text-neutral-100">Set {v.setNumber}</span>
                <span className="text-neutral-500">{VIDEO_LABEL[v.availability]}</span>
                {v.archivedLocally && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-amber-300">
                    archived
                  </span>
                )}
                {m?.firstServeS != null && (
                  <span className="text-[11px] text-neutral-500">
                    Play {formatClock(m.firstServeS)}–{m.lastActionS != null ? formatClock(m.lastActionS) : '?'}
                    {m.gapToNextSetS != null && m.gapToNextSetS >= 15
                      ? ` · ${Math.round(m.gapToNextSetS)}s gap after`
                      : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {cloudAvailable && signedIn && v.availability === 'device' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onBackUpVideo(v.assetId)}
                    disabled={busy !== null}
                  >
                    <Icon
                      name={busy === v.assetId ? 'loader' : 'cloud-upload'}
                      size="sm"
                      className={spin(v.assetId)}
                    />
                    {busy === v.assetId && uploadPercent !== null
                      ? `Uploading ${uploadPercent}%`
                      : `Back up (${v.sizeLabel})`}
                  </Button>
                )}
                {onDevice && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      trimFor === v.assetId
                        ? (setTrimFor(null), setTrimError(null))
                        : openTrim(v.assetId, v.setNumber, v.durationS)
                    }
                    disabled={busy !== null}
                  >
                    <Icon
                      name={busy === `trim-${v.assetId}` ? 'loader' : 'scissors'}
                      size="sm"
                      className={spin(`trim-${v.assetId}`)}
                    />
                    {trimFor === v.assetId ? 'Cancel trim' : 'Trim dead air'}
                  </Button>
                )}
                {onDevice && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleArchive(v.assetId, v.setNumber)}
                    disabled={busy !== null || !v.canRetrieve}
                    title={
                      v.canRetrieve
                        ? 'Remove device copy after cloud backup'
                        : 'Back up to cloud before archiving'
                    }
                  >
                    <Icon
                      name={busy === `archive-${v.assetId}` ? 'loader' : 'hard-drive'}
                      size="sm"
                      className={spin(`archive-${v.assetId}`)}
                    />
                    Archive device copy
                  </Button>
                )}
                {v.canRetrieve && !onDevice && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRetrieveVideo(v.assetId)}
                    disabled={busy !== null}
                  >
                    <Icon
                      name={busy === `retrieve-${v.assetId}` ? 'loader' : 'cloud-download'}
                      size="sm"
                      className={spin(`retrieve-${v.assetId}`)}
                    />
                    Retrieve to device
                  </Button>
                )}
              </div>

              {trimFor === v.assetId && (
                <div className="space-y-2 rounded border border-neutral-700 bg-bg-card p-3">
                  <p className="text-xs text-neutral-400">
                    Source-seconds window. Tags are not rewritten — keep play inside the window.
                  </p>
                  {m?.suggestedTrimStartS != null && m.suggestedTrimEndS != null && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => applyPlayWindow(v.setNumber, v.durationS)}
                    >
                      <Icon name="target" size="sm" /> Use play window (
                      {formatClock(m.suggestedTrimStartS)}–{formatClock(m.suggestedTrimEndS)})
                    </Button>
                  )}
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-neutral-400">
                      Start (s)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={trimStart}
                        onChange={(e) => {
                          setTrimStart(e.target.value)
                          setTrimError(null)
                        }}
                        className="w-24 rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-neutral-400">
                      End (s)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={trimEnd}
                        onChange={(e) => {
                          setTrimEnd(e.target.value)
                          setTrimError(null)
                        }}
                        className="w-24 rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
                        placeholder={v.durationS ? String(Math.floor(v.durationS)) : 'end'}
                      />
                    </label>
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => handleSaveTrim(v.assetId, v.setNumber, v.durationS)}
                    >
                      <Icon name="scissors" size="sm" /> Save trimmed asset
                    </Button>
                  </div>
                  {trimError && <p className="text-xs text-result-error">{trimError}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>

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
