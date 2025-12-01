import { useTaggingStore } from '../../stores/taggingStore'
import { formatTime } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function Timeline() {
  const { currentTime, duration, getTimelineMarkers } = useTaggingStore()
  const markers = getTimelineMarkers()

  const getMarkerPosition = (time: number) => {
    if (duration === 0) return 0
    return (time / duration) * 100
  }

  const playheadPosition = getMarkerPosition(currentTime)

  return (
    <div className="h-[60px] bg-neutral-700 relative">
      {/* Time display */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <span className="font-mono text-sm text-neutral-300">
          {formatTime(currentTime)}
        </span>
        {duration > 0 && (
          <span className="text-neutral-500 text-sm ml-1">
            / {formatTime(duration)}
          </span>
        )}
      </div>

      {/* Timeline track */}
      <div className="absolute left-24 right-4 top-1/2 -translate-y-1/2">
        {/* Base track */}
        <div className="h-1 bg-neutral-600 rounded-full relative">
          {/* Markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                marker.type === 'contact' && 'w-0.5 h-5 bg-cyan-400',
                marker.type === 'rally-end-score' && 'w-1 h-7 bg-success rounded-sm',
                marker.type === 'rally-end-no-score' && 'w-1 h-7 bg-warning rounded-sm'
              )}
              style={{ left: `${getMarkerPosition(marker.time)}%` }}
              title={`${marker.type} at ${formatTime(marker.time)}`}
            />
          ))}

          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-10 bg-white -translate-x-1/2 transition-all duration-75"
            style={{ left: `${playheadPosition}%` }}
          >
            {/* Playhead handle */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute right-4 bottom-1 flex items-center gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-3 bg-cyan-400 rounded-sm" />
          <span>Contact</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-3 bg-success rounded-sm" />
          <span>Score</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-3 bg-warning rounded-sm" />
          <span>No Score</span>
        </div>
      </div>
    </div>
  )
}

