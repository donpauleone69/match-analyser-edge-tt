import { vi } from 'vitest'
import { NOW } from './lib/clock'

vi.useFakeTimers({ toFake: ['Date'], now: NOW })
