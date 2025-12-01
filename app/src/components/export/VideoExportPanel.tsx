import { useState, useRef, useCallback } from 'react'
import { Download, Film, Upload, Loader2, CheckCircle2, AlertCircle, FileVideo, FolderDown } from 'lucide-react'
import { Button, Card, Badge } from '../ui'
import { videoExportService, downloadBlob, type ExportProgress, type VideoQuality } from '../../services/videoExport'
import { useTaggingStore } from '../../stores/taggingStore'
import { cn } from '../../lib/utils'

interface VideoExportPanelProps {
  className?: string
}

export function VideoExportPanel({ className }: VideoExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { rallies, player1Name, player2Name } = useTaggingStore()
  
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [includeScoreOverlay, setIncludeScoreOverlay] = useState(false) // Default OFF for fast stream copy
  const [paddingBefore, setPaddingBefore] = useState(0.5)
  const [paddingAfter, setPaddingAfter] = useState(1.0)
  const [highlightsOnly, setHighlightsOnly] = useState(false)
  const [quality, setQuality] = useState<VideoQuality>('balanced')
  const [frameRate, setFrameRate] = useState(30)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filter valid rallies for export
  const validRallies = rallies.filter(r => 
    r.isScoring && 
    r.contacts.length > 0 && 
    r.endOfPointTime !== undefined
  )

  const highlightRallies = validRallies.filter(r => r.isHighlight)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setError(null)
    }
  }

  const handleExport = useCallback(async () => {
    if (!videoFile || validRallies.length === 0) return
    
    const ralliesToExport = highlightsOnly ? highlightRallies : validRallies
    if (ralliesToExport.length === 0) {
      setError(highlightsOnly ? 'No highlights marked. Mark rallies as highlights first.' : 'No valid rallies to export.')
      return
    }
    
    setIsExporting(true)
    setError(null)
    setProgress({ stage: 'loading', message: 'Preparing export...' })

    try {
      const blob = await videoExportService.exportHighlights({
        rallies: ralliesToExport,
        player1Name,
        player2Name,
        videoFile,
        includeScoreOverlay,
        paddingBefore,
        paddingAfter,
        highlightsOnly,
        quality,
        frameRate,
        onProgress: setProgress,
      })

      // Generate filename
      const date = new Date().toISOString().split('T')[0]
      const suffix = highlightsOnly ? '_highlights' : ''
      const filename = `${player1Name}_vs_${player2Name}${suffix}_${date}.mp4`
      
      downloadBlob(blob, filename)
      
      setProgress({ stage: 'complete', percent: 100, message: 'Download started!' })
    } catch (err) {
      console.error('Export failed:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
      setProgress({ stage: 'error', message: 'Export failed' })
    } finally {
      setIsExporting(false)
    }
  }, [videoFile, validRallies, highlightRallies, highlightsOnly, player1Name, player2Name, includeScoreOverlay, paddingBefore, paddingAfter, quality, frameRate])

  // Calculate estimated duration and size
  const ralliesToExport = highlightsOnly ? highlightRallies : validRallies
  const estimatedDuration = ralliesToExport.reduce((sum, rally) => {
    if (!rally.contacts.length || !rally.endOfPointTime) return sum
    const start = rally.contacts[0].time - paddingBefore
    const end = rally.endOfPointTime + paddingAfter
    return sum + Math.max(0, end - start)
  }, 0)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-50 flex items-center gap-2">
          <Film className="w-5 h-5 text-brand-primary" />
          Export Video
        </h3>
        <Badge variant="default" className="text-xs">
          {ralliesToExport.length} rallies
        </Badge>
      </div>

      {/* Video file selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300">Source Video</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => fileInputRef.current?.click()}
        >
          {videoFile ? (
            <>
              <FileVideo className="w-4 h-4 mr-2 text-success" />
              <span className="truncate">{videoFile.name}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Select video file
            </>
          )}
        </Button>
      </div>

      {/* Options */}
      <div className="space-y-3 pt-2 border-t border-neutral-700">
        {/* Highlights only toggle */}
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm text-neutral-300">Highlights only</span>
            {highlightRallies.length > 0 && (
              <span className="text-xs text-neutral-500 ml-2">({highlightRallies.length} marked)</span>
            )}
          </div>
          <button
            onClick={() => setHighlightsOnly(!highlightsOnly)}
            className={cn(
              "relative w-10 h-6 rounded-full transition-colors",
              highlightsOnly ? "bg-brand-primary" : "bg-neutral-600"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                highlightsOnly ? "left-5" : "left-1"
              )}
            />
          </button>
        </label>

        {/* Score overlay toggle */}
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm text-neutral-300">Re-encode video</span>
            <p className="text-xs text-neutral-500">
              {includeScoreOverlay ? 'Slower, customizable quality' : 'Fast, original quality'}
            </p>
          </div>
          <button
            onClick={() => setIncludeScoreOverlay(!includeScoreOverlay)}
            className={cn(
              "relative w-10 h-6 rounded-full transition-colors",
              includeScoreOverlay ? "bg-brand-primary" : "bg-neutral-600"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                includeScoreOverlay ? "left-5" : "left-1"
              )}
            />
          </button>
        </label>

        {/* Padding before */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Padding before serve</span>
          <select
            value={paddingBefore}
            onChange={(e) => setPaddingBefore(parseFloat(e.target.value))}
            className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-100"
          >
            <option value={0}>0s</option>
            <option value={0.5}>0.5s</option>
            <option value={1}>1s</option>
            <option value={2}>2s</option>
          </select>
        </div>

        {/* Padding after */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Padding after winner</span>
          <select
            value={paddingAfter}
            onChange={(e) => setPaddingAfter(parseFloat(e.target.value))}
            className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-100"
          >
            <option value={0}>0s</option>
            <option value={0.5}>0.5s</option>
            <option value={1}>1s</option>
            <option value={1.5}>1.5s</option>
            <option value={2}>2s</option>
          </select>
        </div>

        {/* Quality selector (only shown when score overlay is enabled) */}
        {includeScoreOverlay && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-neutral-300">Video quality</span>
                <div className="text-xs text-neutral-500">
                  {quality === 'fast' && 'Faster export, lower quality'}
                  {quality === 'balanced' && 'Good quality, reasonable speed'}
                  {quality === 'high' && 'Best quality, slower export'}
                </div>
              </div>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as VideoQuality)}
                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-100"
              >
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Frame rate selector */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-neutral-300">Frame rate</span>
                <div className="text-xs text-neutral-500">Match your source video</div>
              </div>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(parseInt(e.target.value))}
                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-100"
              >
                <option value={25}>25 fps</option>
                <option value={30}>30 fps</option>
                <option value={50}>50 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Preview info */}
      {ralliesToExport.length > 0 && (
        <div className="bg-bg-elevated rounded-lg p-3 space-y-1">
          <div className="text-sm text-neutral-400">
            Estimated output: <span className="text-neutral-100">{formatDuration(estimatedDuration)}</span>
          </div>
          {includeScoreOverlay && (
            <div className="text-xs text-neutral-500">
              Score overlay: {player1Name} / {player2Name} (bottom-left)
            </div>
          )}
          <div className="text-xs text-neutral-500 flex items-center gap-1">
            <FolderDown className="w-3 h-3" />
            Downloads to your browser's download folder
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && isExporting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
            <span className="text-neutral-300">{progress.message}</span>
          </div>
          {progress.percent !== undefined && (
            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Success state */}
      {progress?.stage === 'complete' && !isExporting && (
        <div className="flex items-center gap-2 text-success text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Export complete! Check your downloads folder.
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-error text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Export button */}
      <Button
        variant="primary"
        className="w-full"
        disabled={!videoFile || ralliesToExport.length === 0 || isExporting}
        onClick={handleExport}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export {highlightsOnly ? 'Highlights' : 'All Rallies'} ({ralliesToExport.length})
          </>
        )}
      </Button>

      {/* Warning if no valid rallies */}
      {validRallies.length === 0 && (
        <p className="text-xs text-warning text-center">
          No scoring rallies with winner times to export.
          Complete Step 1 tagging first.
        </p>
      )}

      {/* Warning if highlights only but none marked */}
      {highlightsOnly && highlightRallies.length === 0 && validRallies.length > 0 && (
        <p className="text-xs text-warning text-center">
          No rallies marked as highlights.
          Press H on a rally to mark it as a highlight.
        </p>
      )}
    </Card>
  )
}
