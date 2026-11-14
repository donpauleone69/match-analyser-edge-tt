/**
 * MatchStorageBlock — backup, guided trim (cut dead air), archive device copy.
 */

import { useState } from 'react'
import { Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { validateTrimWindow } from '@/rules/derive/clips/deriveClipEdl'
import type { MatchJumpMarkers, SetJumpMarkers } from '@/rules/videoLifecycle'
import type { MatchStorageModel } from '../derive/useDeriveMatchStorage'

export interface MatchStorageBlockProps {
  storage: MatchStorageModel
  /** Per-set jump / guided-trim markers from tagged rallies */
  setMarkers?: SetJumpMarkers[]
  /** Flat chips (first serve / set end / gap) for the trim section header */
  jumpChips?: MatchJumpMarkers['chips']
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
  jumpChips = [],
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
    setTrimStart(m?.suggestedTrimStartS != null ? String(m.suggestedTrimStartS) : '0')
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
      `Archive Set ${setNumber} device copy?\n\nNeeds a cloud backup first. Tags stay on source time so you can retrieve later. Only the file on this device is removed.`
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
        `This trim may cut tagged play (${m?.firstServeS != null ? formatClock(m.firstServeS) : '?'} → ${m?.lastActionS != null ? formatClock(m.lastActionS) : '?'}).\n\nTags stay in source seconds; the file may miss contacts. Continue?`
      )
      if (!proceed) return
    }
    onTrimVideo(assetId, setNumber, check.sourceStart, check.sourceEnd)
    setTrimFor(null)
    setTrimError(null)
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-3 sm:px-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={cn(
            'flex items-center gap-1.5',
            storage.sync === 'synced'
              ? 'text-result-winner'
              : storage.sync === 'changed'
                ? 'text-callout-warning'
                : 'text-muted'
          )}
        >
          <Icon name={storage.sync === 'never' ? 'cloud-off' : 'cloud'} size="sm" />
          {cloudAvailable ? syncText : 'Saved on this device'}
        </span>

        {cloudAvailable && signedIn && storage.sync !== 'synced' && !conflict && (
          <Button size="sm" variant="secondary" onClick={onBackUpMatch} disabled={busy !== null}>
            <Icon name={busy === 'match' ? 'loader' : 'cloud-upload'} size="sm" className={spin('match')} />{' '}
            Back up
          </Button>
        )}
        {cloudAvailable && !signedIn && (
          <button type="button" onClick={onSignIn} className="text-brand-primary hover:underline text-xs">
            Sign in to back up
          </button>
        )}

        <span className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          onClick={onSaveFile}
          disabled={busy !== null}
          title="Download a portable JSON backup of this match (no account needed to restore)"
        >
          <Icon name={busy === 'file' ? 'loader' : 'file-down'} size="sm" className={spin('file')} />
          <span className="sm:hidden">File</span>
          <span className="hidden sm:inline">Save match file</span>
        </Button>
      </div>

      <p className="text-xs text-neutral-500">
        Trim cuts intro/gaps (tags stay on source time). Archive needs cloud backup first. Match file =
        tags only — not the video.
      </p>

      {jumpChips.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Jump markers
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {jumpChips.map((chip) => (
              <li key={chip.key}>
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-neutral-950/50 px-2 py-1 text-[11px] text-neutral-200"
                  title="Source time — use with Trim or when scrubbing the set video"
                >
                  <Icon name="target" size="xs" className="text-brand-primary shrink-0" />
                  {chip.label}
                  <span className="font-mono text-neutral-400">{formatClock(chip.timeS)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {storage.setVideos.length === 0 && (
        <p className="text-xs text-neutral-500 rounded-md border border-dashed border-border px-3 py-2">
          No set video on this match yet — attach one while tagging.
        </p>
      )}

      <ul className="space-y-2.5">
        {storage.setVideos.map((v) => {
          const m = markersFor(v.setNumber)
          const onDevice = v.availability === 'device' || v.availability === 'device+cloud'
          const archiveBlocked = onDevice && !v.canRetrieve
          return (
            <li
              key={v.assetId}
              className="rounded-md border border-border bg-bg-surface px-2.5 py-2 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-neutral-300">
                <Icon name="video" size="sm" />
                <span className="font-semibold text-neutral-100">Set {v.setNumber}</span>
                <span className="text-neutral-500 text-xs">{VIDEO_LABEL[v.availability]}</span>
                {v.archivedLocally && (
                  <span className="rounded border border-callout-warning-border bg-callout-warning-bg px-1.5 py-0.5 text-[10px] text-callout-warning">
                    archived
                  </span>
                )}
                {m?.firstServeS != null && (
                  <span className="text-[11px] text-neutral-500 w-full sm:w-auto">
                    Play {formatClock(m.firstServeS)}–
                    {m.lastActionS != null ? formatClock(m.lastActionS) : '?'}
                    {m.gapToNextSetS != null && m.gapToNextSetS >= 15
                      ? ` · ${Math.round(m.gapToNextSetS)}s to next set`
                      : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
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
                      ? `${uploadPercent}%`
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
                    {trimFor === v.assetId ? 'Cancel' : 'Trim'}
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
                    Archive
                  </Button>
                )}
                {v.canRetrieve && !onDevice && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRetrieveVideo(v.assetId)}
                    disabled={busy !== null}
                    title="Download cloud video so tagging/review works offline on this device"
                  >
                    <Icon
                      name={busy === `retrieve-${v.assetId}` ? 'loader' : 'cloud-download'}
                      size="sm"
                      className={spin(`retrieve-${v.assetId}`)}
                    />
                    Download
                  </Button>
                )}
                {archiveBlocked && (
                  <p className="w-full text-[11px] text-neutral-500">
                    Archive locked until this set is backed up to cloud.
                  </p>
                )}
                {v.availability === 'cloud' && (
                  <p className="w-full text-[11px] text-callout-warning">
                    Cloud-only — download to tag offline.
                  </p>
                )}
                {v.availability === 'missing' && (
                  <p className="w-full text-[11px] text-callout-danger">
                    Video missing — re-attach a file or restore from backup.
                  </p>
                )}
              </div>

              {trimFor === v.assetId && (
                <div className="space-y-2 rounded border border-border bg-bg-card p-2.5">
                  <p className="text-xs text-neutral-400">
                    Source seconds. Keep tagged play inside the window — tags are not rewritten.
                  </p>
                  {m?.suggestedTrimStartS != null && m.suggestedTrimEndS != null ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => applyPlayWindow(v.setNumber, v.durationS)}
                    >
                      <Icon name="target" size="sm" /> Play window (
                      {formatClock(m.suggestedTrimStartS)}–{formatClock(m.suggestedTrimEndS)})
                    </Button>
                  ) : (
                    <p className="text-[11px] text-neutral-500">
                      No play window yet — tag timed rallies first, or enter start/end manually.
                    </p>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-0.5 text-[11px] text-neutral-400">
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
                        className="w-20 rounded border border-border bg-bg-surface px-2 py-1.5 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[11px] text-neutral-400">
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
                        className="w-20 rounded border border-border bg-bg-surface px-2 py-1.5 text-sm text-neutral-100"
                        placeholder={v.durationS ? String(Math.floor(v.durationS)) : 'end'}
                      />
                    </label>
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => handleSaveTrim(v.assetId, v.setNumber, v.durationS)}
                    >
                      <Icon name="scissors" size="sm" /> Save trim
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
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-callout-warning-border bg-callout-warning-bg px-2.5 py-1.5 text-callout-warning">
          <Icon name="warning" size="sm" />
          <span className="flex-1 text-[11px]">Changed elsewhere — keep which copy?</span>
          <Button size="sm" variant="secondary" onClick={onKeepDevice} disabled={busy !== null}>
            Device
          </Button>
          <Button size="sm" variant="secondary" onClick={onUseCloud} disabled={busy !== null}>
            Cloud
          </Button>
        </div>
      )}
    </div>
  )
}
