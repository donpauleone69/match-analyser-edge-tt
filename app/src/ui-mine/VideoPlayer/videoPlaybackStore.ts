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
  
  // Speed mode presets
  speedPresets: {
    normal: number
    tag: number
    ff: number
  }
  currentSpeedMode: 'normal' | 'tag' | 'ff'
  
  // Actions
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setVideoUrl: (url: string | null) => void
  setSpeedMode: (mode: 'normal' | 'tag' | 'ff') => void
  setSpeedPresets: (presets: { normal?: number; tag?: number; ff?: number }) => void
  reset: () => void
}

const initialState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 1.0,
  videoUrl: null,
  speedPresets: {
    normal: 1.0,
    tag: 0.5,
    ff: 2.0,
  },
  currentSpeedMode: 'normal' as const,
}

export const useVideoPlaybackStore = create<VideoPlaybackState>()((set, get) => ({
  ...initialState,
  
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setSpeedMode: (mode) => {
    const { speedPresets } = get()
    const speed = speedPresets[mode]
    set({ currentSpeedMode: mode, playbackSpeed: speed })
  },
  setSpeedPresets: (presets) => {
    const currentPresets = get().speedPresets
    const newPresets = { ...currentPresets, ...presets }
    set({ speedPresets: newPresets })
  },
  reset: () => set(initialState),
}))

