/**
 * Video Playback Store — Shared video state
 * 
 * Manages video playback state for the VideoPlayer component.
 * This state is shared across features that use video playback.
 */

import { create } from 'zustand'

interface VideoPlaybackState {
  // Video state
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackSpeed: number
  videoUrl: string | null
  
  // Actions
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setVideoUrl: (url: string | null) => void
  reset: () => void
}

const initialState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 0.5, // Default tagging speed
  videoUrl: null,
}

export const useVideoPlaybackStore = create<VideoPlaybackState>()((set) => ({
  ...initialState,
  
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  reset: () => set(initialState),
}))

