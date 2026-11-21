import {
  addContact,
  bestAdvance,
  bestParts,
  bestRally,
  bestSetEnd,
  bestSetServer,
  DEFAULT_INSIGHTS_FILTERS,
  activeFilterLabels,
  datesChip,
  defaultMatchTab,
  derivePhase,
  editStops,
  endedEarly,
  filterChoices,
  filterIsSet,
  filterMatches,
  formatMatchDate,
  hasTaggedRallies,
  insightRules,
  insightsFor,
  isArchived,
  isMatchTagged,
  isSpareSet,
  lineAction,
  markBounds,
  markState,
  matchDiffers,
  matchInsights,
  matchName,
  matchRowLine,
  matchRowStatus,
  matchSetsWon,
  matchTitle,
  missingVideoIds,
  otherSide,
  padFocus,
  phaseOf,
  resultDiffers,
  routeAfter,
  serveBands,
  serverAt,
  setDepth,
  setEndIndex,
  setIncomplete,
  setLineLabel,
  setOverOnRule,
  setScoresDiffer,
  setSettled,
  setState,
  setWingStroke,
  taggedResult,
  taggedResultReady,
  taggedScore,
  videoLocked,
  videoRallyCount,
  videoStatus,
  winnerOf,
  emptyDraft,
  type BestEnd,
  type Draft,
  type InsightsFilters,
  type MatchRecord,
  type RallyData,
  type SetData,
  type Side,
  type Wing,
} from '../lib/app'

const ZERO = { me: 0, them: 0 }

function rallyLine(s: SetData, r: RallyData, n: number, before: { me: number; them: number }): string {
  const due = serverAt(s.firstServer, before)
  const parts = r.contacts.length === 0 ? [] : bestParts(r.contacts.length, r.shots, r.idea?.first)
  const phase = phaseOf(r.server, r.contacts.length, r.ending, 'me')
  return [
    `${n} ${r.id}`,
    `srv=${r.server}`,
    `win=${r.winner}`,
    `pre=${before.me}-${before.them}`,
    `exp=${due}`,
    `n=${r.contacts.length}`,
    `end=${r.ending ?? 'null'}`,
    `fa=${r.fa ?? 'null'}`,
    `parts=${parts.map((part) => `${part.part}:${part.from}-${part.to}`).join(',')}`,
    `phase=${phase ?? 'null'}`,
  ].join(' ')
}

export function goldenMatch(m: MatchRecord, all: MatchRecord[], today: Date) {
  const phase = derivePhase(m)
  return {
    title: matchTitle(m),
    name: matchName(m),
    rowLine: matchRowLine(m),
    date: formatMatchDate(m.date, today),
    rowStatus: matchRowStatus(m),
    phase,
    tagged: isMatchTagged(m),
    defaultTab: defaultMatchTab(phase),
    setsWon: matchSetsWon(m),
    taggedResult: taggedResult(m),
    resultDiffers: resultDiffers(m),
    matchDiffers: matchDiffers(m),
    taggedResultReady: taggedResultReady(m),
    archived: isArchived(m),
    missingVideoIds: missingVideoIds(m),
    videos: m.videos.map((video) => ({
      id: video.id,
      status: videoStatus(m, video.id),
      locked: videoLocked(m, video.id),
      rallies: videoRallyCount(m, video.id),
    })),
    sets: m.sets.map((s) => {
      const winners = s.rallies.map((r) => r.winner)
      const bands = serveBands(s.rallies, s.firstServer)
      let score = { ...ZERO }
      const rallies = s.rallies.map((r, i) => {
        const line = rallyLine(s, r, i + 1, score)
        score = r.winner === 'me' ? { me: score.me + 1, them: score.them } : { me: score.me, them: score.them + 1 }
        return line
      })
      return {
        setId: s.setId,
        state: setState(s),
        markState: markState(s),
        lineAction: lineAction(s),
        lineLabel: setLineLabel(s),
        settled: setSettled(s),
        spare: isSpareSet(m, s),
        endedEarly: endedEarly(s),
        incomplete: setIncomplete(s),
        taggedScore: taggedScore(s),
        scoresDiffer: setScoresDiffer(s),
        overOnRule: setOverOnRule(winners),
        setEndIndex: setEndIndex(winners),
        markBounds: s.mark ? markBounds(m.videos, s.mark) : null,
        rallies,
        serveBands: bands,
        serveBreaks: bands.map((band) => band.breaks[0]),
        editStops: editStops(m, s.setId),
      }
    }),
    insights: matchInsights(
      m,
      all.filter((row) => hasTaggedRallies(row) && row.id !== m.id),
    ),
  }
}

const CASES: { name: string; filters: InsightsFilters }[] = [
  { name: 'none', filters: { ...DEFAULT_INSIGHTS_FILTERS } },
  { name: 'Opponent Pat', filters: { ...DEFAULT_INSIGHTS_FILTERS, opponent: 'Pat' } },
  { name: 'Event League', filters: { ...DEFAULT_INSIGHTS_FILTERS, event: 'League' } },
  { name: 'Dates Last 30 days', filters: { ...DEFAULT_INSIGHTS_FILTERS, dates: 'Last 30 days' } },
  {
    name: 'Dates From and to 2026-09-01..2026-10-31',
    filters: { ...DEFAULT_INSIGHTS_FILTERS, dates: 'From and to', from: '2026-09-01', to: '2026-10-31' },
  },
]

export function goldenGlobal(all: MatchRecord[], today: Date) {
  const tagged = all.filter(hasTaggedRallies)
  return {
    tagged: tagged.map((m) => m.id),
    filterChoices: filterChoices(tagged),
    cases: CASES.map(({ name, filters }) => {
      const kept = filterMatches(tagged, filters, today)
      const opponent = filters.opponent === 'Any' ? '' : filters.opponent
      return {
        name,
        filters,
        kept: kept.map((m) => m.id),
        model: insightsFor(kept, insightRules('global', opponent, filterIsSet(filters)), tagged),
        datesChip: datesChip(filters, today),
        activeFilterLabels: activeFilterLabels(filters, today),
      }
    }),
  }
}

type SavePlan = {
  name: string
  n: number
  end: BestEnd
  rallyOne: boolean
  /** Shot number of the only Attack. Null means every later shot is Control. */
  faAt: number | null
  kept: boolean
}

const PLANS: SavePlan[] = [
  { name: 'n=1 Winner', n: 1, end: 'Winner', rallyOne: false, faAt: null, kept: false },
  { name: 'n=1 Net', n: 1, end: 'Net', rallyOne: false, faAt: null, kept: false },
  { name: 'n=2', n: 2, end: 'Winner', rallyOne: false, faAt: null, kept: false },
  { name: 'n=4 FA at 3', n: 4, end: 'Winner', rallyOne: false, faAt: 3, kept: false },
  { name: 'n=6 no attack', n: 6, end: 'Winner', rallyOne: false, faAt: null, kept: false },
  { name: 'n=9 FA at 2', n: 9, end: 'Winner', rallyOne: false, faAt: 2, kept: false },
  { name: 'rally one server them', n: 3, end: 'Winner', rallyOne: true, faAt: null, kept: false },
  { name: 'Point to against End', n: 4, end: 'Winner', rallyOne: false, faAt: 3, kept: true },
]

function openRally(n: number): Draft {
  let d = emptyDraft('v', 'me')
  for (let i = 0; i < n; i++) d = addContact(d, 10 + i * 0.4)
  return { ...d, closed: true, best: { flow: 'bestfa', step: 'serve' } }
}

function answer(d: Draft, plan: SavePlan, rallyOne: boolean): Draft {
  const at = routeAfter(d, rallyOne)
  if (!at) return d
  const stepped: Draft = { ...d, best: { ...d.best!, step: at.step, endPage: at.page } }
  const q = at.step === 'end' ? padFocus(stepped, rallyOne, null) : at.step === 'shots' ? `shot ${at.page}` : at.step
  if (q === 'server') return bestSetServer(stepped, 'them')
  if (q === 'serve') return setDepth(stepped, 'Short', 'BH')
  if (q.startsWith('shot ')) {
    const shot = at.page ?? stepped.contacts.length
    const wing: Wing = shot % 2 === 0 ? 'FH' : 'BH'
    return setWingStroke(stepped, shot, wing, plan.faAt === shot ? 'Attack' : 'Control')
  }
  if (q === 'end') return bestSetEnd(stepped, plan.end, rallyOne)
  throw new Error(`${plan.name} asked ${q}`)
}

function saveOne(plan: SavePlan): RallyData {
  let d = openRally(plan.n)
  let saved = false
  for (let i = 0; i < 40; i++) {
    if (!routeAfter(d, plan.rallyOne)) {
      const moved = bestAdvance(d, plan.rallyOne)
      d = moved.draft
      saved = moved.save
      break
    }
    const moved = bestAdvance(answer(d, plan, plan.rallyOne), plan.rallyOne)
    d = moved.draft
    if (moved.save) {
      saved = true
      break
    }
  }
  if (!saved) throw new Error(`${plan.name} did not save`)
  const derived = winnerOf(d)
  if (!derived) throw new Error(`${plan.name} has no winner`)
  const winner: Side = plan.kept ? otherSide(derived) : (d.best?.point ?? derived)
  return bestRally(d, 'r-x', winner, plan.kept)
}

export function goldenBestFa(): { name: string; rally: RallyData }[] {
  return PLANS.map((plan) => ({ name: plan.name, rally: saveOne(plan) }))
}
