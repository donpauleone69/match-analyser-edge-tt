import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type { Rally } from '../types'

export type VideoQuality = 'fast' | 'balanced' | 'high'

export interface ExportOptions {
  rallies: Rally[]
  player1Name: string
  player2Name: string
  videoFile: File
  includeScoreOverlay: boolean
  paddingBefore?: number
  paddingAfter?: number
  highlightsOnly?: boolean
  quality?: VideoQuality
  frameRate?: number // Force specific frame rate (e.g., 30)
  onProgress?: (progress: ExportProgress) => void
}

// Quality presets
const QUALITY_PRESETS = {
  fast: {
    preset: 'veryfast',
    crf: 26,
    audioBitrate: '128k',
  },
  balanced: {
    preset: 'fast',
    crf: 23,
    audioBitrate: '192k',
  },
  high: {
    preset: 'medium',
    crf: 18,
    audioBitrate: '256k',
  },
}

export interface ExportProgress {
  stage: 'loading' | 'processing' | 'concatenating' | 'complete' | 'error'
  currentRally?: number
  totalRallies?: number
  percent?: number
  message: string
}

export interface RallyClip {
  rally: Rally
  startTime: number
  endTime: number
  score: string
}

class VideoExportService {
  private ffmpeg: FFmpeg | null = null
  private loaded = false
  private loading = false

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded && this.ffmpeg) {
      console.log('FFmpeg already loaded')
      return
    }
    if (this.loading) {
      let attempts = 0
      while (this.loading && attempts < 300) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      if (this.loaded) return
      throw new Error('FFmpeg loading timed out')
    }

    this.loading = true
    console.log('Starting FFmpeg 0.12 load...')
    
    try {
      this.ffmpeg = new FFmpeg()
      
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message)
      })

      this.ffmpeg.on('progress', ({ progress }) => {
        console.log('[FFmpeg Progress]', Math.round(progress * 100) + '%')
      })

      // Load from local files using direct URLs
      const baseURL = window.location.origin + '/ffmpeg'
      console.log('Loading FFmpeg from:', baseURL)
      
      onProgress?.(50)
      console.log('Loading FFmpeg with direct URLs...')
      
      // Use direct URLs - CORS headers are already set
      await this.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      })

      console.log('FFmpeg loaded successfully!')
      onProgress?.(100)
      this.loaded = true
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      this.ffmpeg = null
      this.loaded = false
      throw new Error(`Failed to load video processor: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      this.loading = false
    }
  }

  async exportHighlights(options: ExportOptions): Promise<Blob> {
    const {
      rallies,
      player1Name,
      player2Name,
      videoFile,
      includeScoreOverlay,
      paddingBefore = 0.5,
      paddingAfter = 1.0,
      highlightsOnly = false,
      quality = 'balanced',
      frameRate = 30,
      onProgress,
    } = options

    const qualitySettings = QUALITY_PRESETS[quality]

    onProgress?.({ stage: 'loading', message: 'Initializing video processor...' })
    
    try {
      await this.load((p) => onProgress?.({ 
        stage: 'loading', 
        percent: p * 0.15,
        message: `Loading video processor... ${Math.round(p)}%` 
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load'
      onProgress?.({ stage: 'error', message: errorMsg })
      throw error
    }

    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    let validRallies = rallies.filter(r => 
      r.isScoring && 
      r.contacts.length > 0 && 
      r.endOfPointTime !== undefined
    )

    if (highlightsOnly) {
      validRallies = validRallies.filter(r => r.isHighlight)
    }

    if (validRallies.length === 0) {
      throw new Error('No valid scoring rallies to export')
    }

    const clips: RallyClip[] = validRallies.map(rally => {
      const startTime = Math.max(0, rally.contacts[0].time - paddingBefore)
      const endTime = (rally.endOfPointTime || rally.contacts[rally.contacts.length - 1].time) + paddingAfter
      const score = `${rally.player1ScoreAfter}-${rally.player2ScoreAfter}`
      return { rally, startTime, endTime, score }
    })

    onProgress?.({ stage: 'processing', message: 'Loading video file...', currentRally: 0, totalRallies: clips.length, percent: 18 })
    
    try {
      console.log('Writing video file to FFmpeg filesystem...')
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      console.log('Video file written successfully')
    } catch (error) {
      throw new Error(`Failed to load video file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const clipFiles: string[] = []

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const clipFilename = `clip_${i}.mp4`
      
      const progressPercent = 18 + ((i + 1) / clips.length) * 65

      onProgress?.({
        stage: 'processing',
        currentRally: i + 1,
        totalRallies: clips.length,
        percent: progressPercent,
        message: `Processing rally ${i + 1} of ${clips.length}...`,
      })

      try {
        console.log(`Processing clip ${i + 1}: ${clip.startTime.toFixed(3)} - ${clip.endTime.toFixed(3)}`)
        
        if (includeScoreOverlay) {
          // Re-encode with quality settings (no text overlay - FFmpeg.wasm lacks font support)
          // Score will be shown in a simple color bar instead
          const filterStr = `drawbox=x=10:y=h-50:w=120:h=40:color=black@0.7:t=fill`
          
          try {
            await this.ffmpeg.exec([
              '-ss', clip.startTime.toFixed(3),
              '-i', 'input.mp4',
              '-t', (clip.endTime - clip.startTime).toFixed(3),
              '-vf', filterStr,
              '-r', String(frameRate),           // Force constant frame rate
              '-c:v', 'libx264',
              '-preset', qualitySettings.preset,  // Quality preset
              '-crf', String(qualitySettings.crf), // Quality factor
              '-c:a', 'aac',
              '-b:a', qualitySettings.audioBitrate, // Audio bitrate
              '-y',
              clipFilename,
            ])
          } catch (filterError) {
            // Fallback: encode without any filter if drawbox fails
            console.warn('Filter failed, encoding without overlay:', filterError)
            await this.ffmpeg.exec([
              '-ss', clip.startTime.toFixed(3),
              '-i', 'input.mp4',
              '-t', (clip.endTime - clip.startTime).toFixed(3),
              '-r', String(frameRate),
              '-c:v', 'libx264',
              '-preset', qualitySettings.preset,
              '-crf', String(qualitySettings.crf),
              '-c:a', 'aac',
              '-b:a', qualitySettings.audioBitrate,
              '-y',
              clipFilename,
            ])
          }
        } else {
          // Stream copy - preserves original quality and frame rate EXACTLY
          // No re-encoding at all, just cuts at keyframes
          const duration = clip.endTime - clip.startTime
          await this.ffmpeg.exec([
            '-i', 'input.mp4',
            '-ss', clip.startTime.toFixed(3),  // Output seeking (after -i) for frame accuracy
            '-t', duration.toFixed(3),
            '-c', 'copy',                      // Pure stream copy - no encoding
            '-y',
            clipFilename,
          ])
        }
        
        console.log(`Clip ${i + 1} processed successfully`)
        clipFiles.push(clipFilename)
      } catch (error) {
        console.error(`Failed to process rally ${i + 1}:`, error)
        // Continue with next clip instead of failing completely
      }
    }

    if (clipFiles.length === 0) {
      throw new Error('No clips were successfully processed')
    }

    onProgress?.({ stage: 'concatenating', percent: 85, message: 'Joining clips...' })
    const concatContent = clipFiles.map(f => `file '${f}'`).join('\n')
    await this.ffmpeg.writeFile('concat.txt', concatContent)

    try {
      console.log('Concatenating clips...')
      
      if (includeScoreOverlay) {
        // Re-encoded clips - just copy since they're already in the right format
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',  // Clips are already encoded with correct settings
          '-y',
          'output.mp4',
        ])
      } else {
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',
          '-y',
          'output.mp4',
        ])
      }
      
      console.log('Concatenation complete')
    } catch (error) {
      throw new Error(`Failed to concatenate clips: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    onProgress?.({ stage: 'complete', percent: 100, message: 'Export complete!' })
    const data = await this.ffmpeg.readFile('output.mp4')
    
    // Cleanup
    try {
      await this.ffmpeg.deleteFile('input.mp4')
      await this.ffmpeg.deleteFile('concat.txt')
      for (const f of clipFiles) {
        await this.ffmpeg.deleteFile(f)
      }
      await this.ffmpeg.deleteFile('output.mp4')
    } catch (e) {
      // Ignore cleanup errors
    }

    return new Blob([data], { type: 'video/mp4' })
  }

  async exportSingleRally(
    rally: Rally,
    player1Name: string,
    player2Name: string,
    videoFile: File,
    includeScoreOverlay: boolean,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> {
    return this.exportHighlights({
      rallies: [rally],
      player1Name,
      player2Name,
      videoFile,
      includeScoreOverlay,
      onProgress,
    })
  }

  isLoaded(): boolean {
    return this.loaded
  }
  
  reset(): void {
    this.ffmpeg = null
    this.loaded = false
    this.loading = false
  }
}

export const videoExportService = new VideoExportService()

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
