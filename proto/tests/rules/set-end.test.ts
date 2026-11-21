import { expect, it } from 'vitest'
import {
  endedEarly,
  isMatchTagged,
  lineAction,
  matchSetsWon,
  overrunLabels,
  setIncomplete,
  setLineLabel,
  setSettled,
  settleFinished,
  tagRegions,
} from '../lib/app'
import { minimalMatchFromSet, placedSet, scoreFromWinners, winnersSide } from '../lib/builders'
import type { Side } from '../lib/app'

const legal: Side[] = [...winnersSide(9, 'them'), ...winnersSide(10, 'me'), 'me']
const early: Side[] = [...winnersSide(9, 'me'), ...winnersSide(7, 'them')]
const level: Side[] = [...winnersSide(5, 'me'), ...winnersSide(5, 'them')]
const overrun: Side[] = [...winnersSide(11, 'me'), ...winnersSide(9, 'them'), 'me']

const noop = () => {}
function pad(over: Partial<Parameters<typeof tagRegions>[0]> = {}) {
  return tagRegions({
    mode: 'watch',
    bestOn: false,
    bestQ: null,
    best: [],
    shotEdit: false,
    editRally: [],
    editStop: '',
    zoneOn: false,
    padTitle: 'Play',
    tapDim: false,
    overDim: false,
    removeDim: false,
    showRemove: false,
    removeAfter: 18,
    removeLast: 20,
    endPad: false,
    saveEarly: false,
    saveLabel: 'Save at 9 - 7',
    onOverrunEdit: noop,
    editing: false,
    editKind: null,
    editName: '',
    rallyOn: true,
    saveOn: false,
    saveDim: false,
    backDim: false,
    forwardDim: false,
    insertDim: false,
    onPad: noop,
    onFinish: noop,
    onOverEdit: noop,
    onRemove: noop,
    onRallies: noop,
    onGaps: noop,
    onBack: noop,
    onForward: noop,
    onEditRally: noop,
    onDeleteRally: noop,
    onInsert: noop,
    review: false,
    reviewPart: '',
    reviewMarked: false,
    reviewBackDim: false,
    reviewForwardDim: false,
    onReviewBack: noop,
    onReviewForward: noop,
    onReviewMark: noop,
    ...over,
  })
}

const labels = overrunLabels(18, 20)
it('edit leads', () => {
  expect(labels.edit).toBe('Edit Rally 18')
})
it('remove is second', () => {
  expect(labels.remove).toBe('Remove 19 to 20')
})
it('one rally names that rally', () => {
  expect(overrunLabels(11, 12).remove).toBe('Remove 12')
})
it('one rally edit is capitalised', () => {
  expect(overrunLabels(11, 12).edit).toBe('Edit Rally 11')
})

const overrunPad = pad({ showRemove: true, endPad: true, saveEarly: true })
it('overrun leads with edit', () => {
  expect(overrunPad.regions[0]?.label === 'Edit Rally 18' && overrunPad.regions[0]?.column === 1).toBe(true)
})
it('overrun remove is second', () => {
  expect(overrunPad.regions[1]?.label === 'Remove 19 to 20' && overrunPad.regions[1]?.column === 2).toBe(true)
})
it('overrun hides save', () => {
  expect(overrunPad.attrs['data-overrun'] === '' && !overrunPad.regions.some((r) => r.key === 'save')).toBe(true)
})
const oneAfter = pad({ showRemove: true, removeAfter: 11, removeLast: 12 })
it('one rally pad says Remove 12', () => {
  expect(oneAfter.regions[1]?.label === 'Remove 12' && oneAfter.regions[0]?.label === 'Edit Rally 11').toBe(true)
})

const earlyPad = pad({ endPad: true, saveEarly: true, saveLabel: 'Save at 9 - 7' })
it('save at the score', () => {
  expect(earlyPad.regions.length === 1 && earlyPad.regions[0]?.label === 'Save at 9 - 7').toBe(true)
})
it('early save is marked', () => {
  expect(earlyPad.regions[0]?.data?.['data-save-early'] === '').toBe(true)
})
const levelPad = pad({ endPad: true, saveEarly: false })
it('level end keeps Save set', () => {
  expect(levelPad.regions.length === 1 && levelPad.regions[0]?.label === 'Save set' && levelPad.regions[0]?.column === 2).toBe(true)
})
it('level save is not ended early', () => {
  expect(levelPad.regions[0]?.data?.['data-save-level'] === '' && !('data-save-early' in (levelPad.regions[0]?.data ?? {}))).toBe(true)
})
it('level pad is still the end', () => {
  expect(levelPad.attrs['data-end-pad'] === '').toBe(true)
})

const earlySet = placedSet(2, early, true)
const levelSet = placedSet(2, level, true)
const wonSet = placedSet(1, legal, true)
const overrunSet = placedSet(2, overrun, true)

it('ended early line', () => {
  expect(setLineLabel(earlySet)).toBe('Set 2 · Saved · 9 - 7 · ended early')
})
it('ended early flag', () => {
  expect(endedEarly(earlySet) && !setIncomplete(earlySet) && lineAction(earlySet) === 'Open').toBe(true)
})
it('a win is not ended early', () => {
  expect(setLineLabel(wonSet) === 'Set 1' && !endedEarly(wonSet)).toBe(true)
})
it('level is not ended early', () => {
  expect(setLineLabel(levelSet) === 'Set 2' && !endedEarly(levelSet)).toBe(true)
})
it('level stays incomplete', () => {
  expect(setIncomplete(levelSet) && lineAction(levelSet) === 'Continue').toBe(true)
})
const levelOne = placedSet(1, level, true)
it('level save is not settled yet', () => {
  expect(!setSettled(levelOne)).toBe(true)
})
const levelDetails = { ...levelOne, entered: { me: '11', them: '9' } }
it('details settles a saved level set', () => {
  expect(setSettled(levelDetails) && !endedEarly(levelDetails) && setIncomplete(levelDetails)).toBe(true)
})
it('a settled level set tags the match', () => {
  expect(isMatchTagged(minimalMatchFromSet(levelDetails, { me: 1, them: 0 })) && matchSetsWon(minimalMatchFromSet(levelDetails)).me === 1).toBe(true)
})
it('a result alone does not settle it', () => {
  expect(!isMatchTagged(minimalMatchFromSet(levelOne, { me: 1, them: 0 }))).toBe(true)
})
it('details does not settle an unsaved level set', () => {
  expect(!setSettled({ ...placedSet(1, level, false), entered: { me: '11', them: '9' } })).toBe(true)
})
it('overrun is not ended early', () => {
  expect(!endedEarly(overrunSet) && lineAction(overrunSet) === 'Open').toBe(true)
})
it('early set counts for the leader', () => {
  expect(matchSetsWon(minimalMatchFromSet(earlySet)).me === 1 && matchSetsWon(minimalMatchFromSet(earlySet)).them === 0).toBe(true)
})

it('early save stays finished', () => {
  expect(settleFinished(minimalMatchFromSet(earlySet), 2).sets[0]?.finished).toBe(true)
})
it('level save reopens', () => {
  expect(settleFinished(minimalMatchFromSet(levelSet), 2).sets[0]?.finished).toBe(false)
})
it('overrun edit reopens', () => {
  expect(settleFinished(minimalMatchFromSet(overrunSet), 2).sets[0]?.finished).toBe(false)
})
it('a won set stays finished', () => {
  expect(settleFinished(minimalMatchFromSet(wonSet), 1).sets[0]?.finished).toBe(true)
})

const words = [labels.edit, labels.remove, overrunLabels(11, 12).edit, overrunLabels(11, 12).remove, 'Save at 9 - 7', 'Save set', setLineLabel(earlySet)].join('\n')
it('no clip', () => {
  expect(!/\bclip\b/i.test(words)).toBe(true)
})
it('no long dash', () => {
  expect(!words.includes('—') && !words.includes('–')).toBe(true)
})
it('no arrow', () => {
  expect(!words.includes('→') && !words.includes('➔')).toBe(true)
})