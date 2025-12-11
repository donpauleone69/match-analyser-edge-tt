/**
 * Helper functions for local video file handling
 */

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Get video file metadata from File object
 */
export interface VideoMetadata {
  fileName: string
  fileSize: number
  fileSizeFormatted: string
  lastModified: number
  type: string
}

export function getVideoMetadata(file: File): VideoMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    fileSizeFormatted: formatFileSize(file.size),
    lastModified: file.lastModified,
    type: file.type,
  }
}

/**
 * Validate video file
 */
export interface VideoValidation {
  isValid: boolean
  error?: string
}

export function validateVideoFile(file: File, maxSizeGB: number = 5): VideoValidation {
  // Check if it's a video file
  if (!file.type.startsWith('video/')) {
    return {
      isValid: false,
      error: 'File must be a video file',
    }
  }
  
  // Check file size (default max 5GB)
  const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeGB}GB`,
    }
  }
  
  // Check for empty file
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty',
    }
  }
  
  return { isValid: true }
}

/**
 * Estimate video duration from file size (rough estimate)
 * Assumes ~10-20 MB per minute for typical video
 */
export function estimateVideoDuration(fileSizeBytes: number): string {
  const mbPerMinute = 15 // Average bitrate
  const durationMinutes = fileSizeBytes / (mbPerMinute * 1024 * 1024)
  
  if (durationMinutes < 1) {
    return 'Less than 1 minute'
  }
  
  const minutes = Math.floor(durationMinutes)
  const seconds = Math.round((durationMinutes - minutes) * 60)
  
  if (seconds > 0) {
    return `~${minutes}m ${seconds}s`
  }
  return `~${minutes} minutes`
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Get recommended video file picker message based on device
 */
export function getVideoPickerHint(): string {
  if (isMobileDevice()) {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return 'iOS will prepare your video for playback locally. This may take a few seconds but no data is uploaded.'
    }
    return 'Your device will prepare the video for playback. This happens locally on your device.'
  }
  return 'Select a video file from your computer'
}







