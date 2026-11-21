import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const usePersisted = create(persist(() => ({ n: 1 }), { name: 'k', storage: createJSONStorage(() => localStorage) }))
