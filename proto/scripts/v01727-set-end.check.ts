/**
 * v0.17.27 set over, overrun pad and early save.
 * Run: npm run check:v01727
 */
import { readFileSync } from 'node:fs'
import { emptySet, isMatchTagged, calculateMatchSetsWon, setSettled } from '../src/rules/match'
import type { MatchRecord, Points, SetData } from '../src/types/match'
import { overrunLabels, tagRegions } from '../src/features/tagging/derive/deriveInputArea'
import { settleFinished } from '../src/rules/matchOps'
import type { Side } from '../src/types/rally'
import {
  canSaveEarly,
  countPoints,
  isLegalEnd,
  isSetWon,
  setEndIndex,
  setOverOnRule,
} from '../src/rules/score'
import { endedEarly, lineAction, setIncomplete, setLineLabel } from '../src/rules/marks'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL  ${name} ${detail}`.trim())
  }
}

const me = (n: number): Side[] => Array.from({ length: n }, () => 'me')
const them = (n: number): Side[] => Array.from({ length: n }, () => 'them')
const score = (winners: Side[]): Points => countPoints(winners)

/** The old Details clause: a broken set could be saved when the totals matched. */
function withDetailsClause(winners: Side[], entered: Points | null): boolean {
  const now = score(winners)
  const reached = entered !== null && entered.me === now.me && entered.them === now.them
  const end = setEndIndex(winners)
  return winners.length > 0 && (end === winners.length - 1 || Boolean(reached && entered && isSetWon(entered)))
}

function placed(setId: number, winners: Side[], finished: boolean): SetData {
  return {
    ...emptySet(setId),
    finished,
    rallies: winners.map((winner) => ({ winner }) as SetData['rallies'][number]),
    mark: { from: { videoId: 'v', t: 0 }, to: { videoId: 'v', t: 30 }, complete: true },
  }
}

function matchOf(s: SetData, result: MatchRecord['result'] = { me: null, them: null }): MatchRecord {
  return {
    id: 'm',
    opponent: 'Kim',
    event: '',
    date: '',
    result,
    videos: [],
    sets: [s],
    tagDone: false,
  }
}

const legal = [...them(9), ...me(10), 'me' as Side]
const deuce = [...me(10), ...them(10), 'me' as Side, 'me' as Side]
const overrun = [...me(11), ...them(9), 'me' as Side]
const early = [...me(9), ...them(7)]
const level = [...me(5), ...them(5)]

ok('11 - 9 is a legal end', isLegalEnd(score(legal)) && score(legal).me === 11 && score(legal).them === 9)
ok('12 - 10 is a legal end', isLegalEnd(score(deuce)) && score(deuce).me === 12 && score(deuce).them === 10)
ok('12 - 9 is not a legal end', !isLegalEnd({ me: 12, them: 9 }) && isSetWon({ me: 12, them: 9 }))
ok('11 - 10 is not a legal end', !isLegalEnd({ me: 11, them: 10 }))
ok('9 - 7 is not a legal end', !isLegalEnd(score(early)))
ok('5 - 5 is not a legal end', !isLegalEnd(score(level)))

ok('set over at 11 - 9', setOverOnRule(legal))
ok('set over at 12 - 10', setOverOnRule(deuce))
ok('overrun is not set over', !setOverOnRule(overrun) && isSetWon(score(overrun)))
ok('empty is not set over', !setOverOnRule([]))
ok(
  'details match does not save a broken set',
  withDetailsClause(overrun, { me: 12, them: 9 }) && !setOverOnRule(overrun),
)
ok('details differ still sets over on the rule', setOverOnRule(legal))

const screen = readFileSync('src/features/tagging/TagSetScreen.tsx', 'utf8')
ok('screen uses the rule', screen.includes('setOverOnRule('))
ok(
  'details clause is gone',
  !screen.includes('reachedEntered') && !screen.includes('atEntered') && !screen.includes('isSetWon(entered)'),
)

const labels = overrunLabels(18, 20)
ok('edit leads', labels.edit === 'Edit Rally 18')
ok('remove is second', labels.remove === 'Remove 19 to 20')
ok('one rally names that rally', overrunLabels(11, 12).remove === 'Remove 12')
ok('one rally edit is capitalised', overrunLabels(11, 12).edit === 'Edit Rally 11')

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

const overrunPad = pad({ showRemove: true, endPad: true, saveEarly: true })
ok('overrun leads with edit', overrunPad.regions[0]?.label === 'Edit Rally 18' && overrunPad.regions[0]?.column === 1)
ok('overrun remove is second', overrunPad.regions[1]?.label === 'Remove 19 to 20' && overrunPad.regions[1]?.column === 2)
ok('overrun hides save', overrunPad.attrs['data-overrun'] === '' && !overrunPad.regions.some((r) => r.key === 'save'))
const oneAfter = pad({ showRemove: true, removeAfter: 11, removeLast: 12 })
ok('one rally pad says Remove 12', oneAfter.regions[1]?.label === 'Remove 12' && oneAfter.regions[0]?.label === 'Edit Rally 11')

const earlyPad = pad({ endPad: true, saveEarly: true, saveLabel: 'Save at 9 - 7' })
ok('save at the score', earlyPad.regions.length === 1 && earlyPad.regions[0]?.label === 'Save at 9 - 7')
ok('early save is marked', earlyPad.regions[0]?.data?.['data-save-early'] === '')
const levelPad = pad({ endPad: true, saveEarly: false })
ok('level end keeps Save set', levelPad.regions.length === 1 && levelPad.regions[0]?.label === 'Save set' && levelPad.regions[0]?.column === 2)
ok('level save is not ended early', levelPad.regions[0]?.data?.['data-save-level'] === '' && !('data-save-early' in (levelPad.regions[0]?.data ?? {})))
ok('level pad is still the end', levelPad.attrs['data-end-pad'] === '')
ok('9 - 7 can be saved early', canSaveEarly(score(early)))
ok('5 - 5 is not an early save', !canSaveEarly(score(level)))
ok('10 - 10 is not an early save', !canSaveEarly({ me: 10, them: 10 }))
ok('edit set can save a level score', screen.includes('saveOn: readyToFinish') && !screen.includes('|| !saveEarly'))

const earlySet = placed(2, early, true)
const levelSet = placed(2, level, true)
const wonSet = placed(1, legal, true)
const overrunSet = placed(2, overrun, true)
ok('ended early line', setLineLabel(earlySet) === 'Set 2 · Saved · 9 - 7 · ended early')
ok('ended early flag', endedEarly(earlySet) && !setIncomplete(earlySet) && lineAction(earlySet) === 'Open')
ok('a win is not ended early', setLineLabel(wonSet) === 'Set 1' && !endedEarly(wonSet))
ok('level is not ended early', setLineLabel(levelSet) === 'Set 2' && !endedEarly(levelSet))
ok('level stays incomplete', setIncomplete(levelSet) && lineAction(levelSet) === 'Continue')
const levelOne = placed(1, level, true)
ok('level save is not settled yet', !setSettled(levelOne))
const levelDetails = { ...levelOne, entered: { me: '11', them: '9' } }
ok('details settles a saved level set', setSettled(levelDetails) && !endedEarly(levelDetails) && setIncomplete(levelDetails))
ok(
  'a settled level set tags the match',
  isMatchTagged(matchOf(levelDetails, { me: 1, them: 0 })) && calculateMatchSetsWon(matchOf(levelDetails)).me === 1,
)
ok('a result alone does not settle it', !isMatchTagged(matchOf(levelOne, { me: 1, them: 0 })))
ok(
  'details does not settle an unsaved level set',
  !setSettled({ ...placed(1, level, false), entered: { me: '11', them: '9' } }),
)
ok('overrun is not ended early', !endedEarly(overrunSet) && lineAction(overrunSet) === 'Open')
ok('early set counts for the leader', calculateMatchSetsWon(matchOf(earlySet)).me === 1 && calculateMatchSetsWon(matchOf(earlySet)).them === 0)

ok('early save stays finished', settleFinished(matchOf(earlySet), 2).sets[0]?.finished === true)
ok('level save reopens', settleFinished(matchOf(levelSet), 2).sets[0]?.finished === false)
ok('overrun edit reopens', settleFinished(matchOf(overrunSet), 2).sets[0]?.finished === false)
ok('a won set stays finished', settleFinished(matchOf(wonSet), 1).sets[0]?.finished === true)

const words = [labels.edit, labels.remove, overrunLabels(11, 12).edit, overrunLabels(11, 12).remove, 'Save at 9 - 7', 'Save set', setLineLabel(earlySet)].join('\n')
ok('no clip', !/\bclip\b/i.test(words))
ok('no long dash', !words.includes('—') && !words.includes('–'))
ok('no arrow', !words.includes('→') && !words.includes('➔'))

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
