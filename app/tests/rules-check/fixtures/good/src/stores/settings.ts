import { create } from 'zustand'
import { persist } from '@/helpers/persist'
import { subscribeWithSelector } from 'zustand/middleware'
import { add } from '@/rules/pure'
import type { Side } from '@/types/match'

const KEY = 'theme'

export const useSettingsStore = create(
  subscribeWithSelector((set) => ({
    theme: localStorage.getItem(KEY) ?? 'light',
    side: 'me' as Side,
    note: persist,
    setTheme: (theme: string) => {
      localStorage.setItem(KEY, theme)
      set({ theme, n: add(1, 1) })
    },
  })),
)
