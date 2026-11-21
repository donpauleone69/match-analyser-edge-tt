/**
 * Item 11: shot loop ends for one sample rally, plus the floor and the cap.
 * Run: node --experimental-strip-types proto/scripts/slice-c-window.check.mts
 */
import { emptyDraft, loopShotOf, rallyEnd, rallyStart, shotWindow, type Draft } from '../src/features/tagging/rally.ts'

function draft(contacts: number[]): Draft {
  return { ...emptyDraft('v', 'me'), contacts, closed: true, shots: contacts.map(() => ({})) }
}

function eq(name: string, got: { a: number; b: number }, want: { a: number; b: number }) {
  const ok = Math.abs(got.a - want.a) < 0.001 && Math.abs(got.b - want.b) < 0.001
  if (!ok) {
    console.error(`FAIL ${name}: got ${got.a}..${got.b}, want ${want.a}..${want.b}`)
    process.exitCode = 1
  } else {
    const len = Math.round((got.b - got.a) * 100) / 100
    console.log(`ok ${name}: ${got.a} to ${got.b} (${len}s)`)
  }
}

// Sample: contacts 0.9s apart, as the demo is. Rally starts 2s before the serve and ends 1s after.
const sample = draft([10, 10.9, 11.8, 12.7])
console.log(`rally ${rallyStart(sample)} to ${rallyEnd(sample)}`)
eq('shot 1 serve', shotWindow(sample, 1), { a: 8, b: 11 })
eq('shot 2', shotWindow(sample, 2), { a: 9.7, b: 11.9 })
eq('shot 3', shotWindow(sample, 3), { a: 10.6, b: 12.8 })
eq('shot 4 end', shotWindow(sample, 4), { a: 11.5, b: 13.7 })

// Neighbours inside the floor and the cap: 1.5s apart. Window is contact to contact.
const mid = draft([10, 11.5, 13])
eq('shot 2 at the neighbour', shotWindow(mid, 2), { a: 10, b: 13 })

// Neighbours outside 2s. The cap holds, and the rally still holds the serve and the end.
const wide = draft([0, 3, 6])
eq('shot 2 capped', shotWindow(wide, 2), { a: 1, b: 5 })
eq('serve at rally start', shotWindow(wide, 1), { a: 0, b: 2 })
eq('end at rally end', shotWindow(wide, 3), { a: 4, b: 7 })

const asked = draft([1, 2, 3, 4])
const end = { kind: 'shot' as const, shot: 4 }
if (loopShotOf(asked, 'result', end) !== 4) {
  console.error('FAIL result loop shot')
  process.exitCode = 1
} else console.log('ok result asks the end shot')
if (loopShotOf({ ...asked, fa: 3 }, 'faShot', { kind: 'shot', shot: 3 }) !== 3) {
  console.error('FAIL fa loop shot')
  process.exitCode = 1
} else console.log('ok first attack asks that shot')
if (loopShotOf(asked, 'pickFa', null) !== null || loopShotOf(asked, 'ready', null) !== null) {
  console.error('FAIL whole rally stages')
  process.exitCode = 1
} else console.log('ok pick and ready loop the rally')

if (process.exitCode) console.error('window check failed')
else console.log('window check passed')
