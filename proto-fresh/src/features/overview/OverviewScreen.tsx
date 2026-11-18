import { useState, type Dispatch, type ReactNode } from 'react'
import { answersOf, nOf, scoreOf, setOver, summaryBits, type Draft } from '@/rules/rally'
import { insightsOf, pct, type Share } from '@/rules/insights'
import { Icon } from '@/ui/Icon'
import { BarBtn, TopBar } from '@/features/shell/TopBar'
import { RallyStrip } from '@/features/tagging/RallyStrip'
import type { Action, TagState } from '@/features/tagging/tagger'

type Scope = 1 | 2 | 'match'
type View = 'rallies' | 'insights'
type Section = 'Attack' | 'Serve' | 'Points' | 'Review'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

function Pills<T extends string | number>({ items, value, onPick, small }: { items: { v: T; label: string }[]; value: T; onPick: (v: T) => void; small?: boolean }) {
  return (
    <div className={`flex gap-1 rounded-btn bg-ink-1 p-1 ${small ? '' : 'w-full'}`}>
      {items.map((it) => (
        <button
          key={String(it.v)}
          type="button"
          aria-pressed={it.v === value}
          onClick={() => onPick(it.v)}
          className={`${small ? 'h-7 px-2.5' : 'h-8 flex-1'} rounded-[7px] text-xs font-semibold ${it.v === value ? 'bg-chalk text-ink-0' : 'text-chalk-mute'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function Tile({ d, on, onClick }: { d: Draft; on: boolean; onClick: () => void }) {
  const won = d.point === 'me'
  return (
    <button
      type="button"
      onClick={onClick}
      data-tile={d.no}
      className={`relative flex h-11 flex-col justify-between overflow-hidden rounded-cell border-[1.5px] bg-ink-1 px-1.5 py-1 text-left ${on ? 'border-chalk' : 'border-transparent'}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${won ? 'bg-you' : 'bg-kim'}`} />
      <span className="flex items-center gap-1 pl-1 font-mono text-[11px] text-chalk-faint">
        {d.no}
        <span className="flex-1" />
        {d.review.length ? <Icon name="flag" size={10} className="text-flag" /> : null}
        {d.star ? <Icon name="star" size={10} fill className="text-flag" /> : null}
      </span>
      <span className="pl-1 text-[11px] font-semibold">
        <span className={won ? 'text-you' : 'text-kim'}>{won ? 'You' : 'Kim'}</span>
        <span className="text-chalk-faint"> {nOf(d)}</span>
      </span>
    </button>
  )
}

function RallyOverview({ d, go, toast }: { d: Draft; go: Dispatch<Action>; toast: (t: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-ink-1 p-2.5" data-rally-overview>
      <RallyStrip
        d={d}
        title={`Rally ${d.no} · ${d.score[0]}:${d.score[1]}`}
        onCell={(k) => go({ type: 'edit', set: d.set, no: d.no, k })}
        onPart={(p) => go({ type: 'markRally', set: d.set, no: d.no, p })}
        onStar={() => go({ type: 'markRally', set: d.set, no: d.no, p: 'Star' })}
      />
      <p className="text-xs text-chalk-mute">{summaryBits(d).join(' · ')}</p>
      <div className="flex flex-wrap gap-1">
        {answersOf(d).map((a) => (
          <span key={a.k} className="rounded-md bg-ink-2 px-1.5 py-0.5 text-[11px]">
            <span className="font-mono text-chalk-faint">{a.k}</span> {a.text}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => toast(`Playing rally ${d.no}`)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-btn bg-chalk text-xs font-semibold text-ink-0">
          <Icon name="play" size={13} />
          Play rally
        </button>
        <button type="button" onClick={() => go({ type: 'edit', set: d.set, no: d.no })} className="h-9 flex-1 rounded-btn bg-ink-2 text-xs font-semibold">
          Edit tags
        </button>
      </div>
    </div>
  )
}

function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-ink-1 p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {note ? <span className="text-[11px] text-chalk-faint">{note}</span> : null}
      </div>
      {children}
    </div>
  )
}

function ShareRow({ label, s, tone = 'you' }: { label: string; s: Share; tone?: 'you' | 'kim' | 'chalk' }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-chalk-mute">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-3">
        <div className={`h-full rounded-full ${tone === 'you' ? 'bg-you' : tone === 'kim' ? 'bg-kim' : 'bg-chalk-mute'}`} style={{ width: `${pct(s)}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right font-mono">
        {s.won}/{s.of} <span className="text-chalk-faint">{s.of ? `${pct(s)}%` : ''}</span>
      </span>
    </div>
  )
}

function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: 'you' | 'kim' }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-cell bg-ink-2 px-2 py-1.5">
      <span className={`font-mono text-lg font-bold leading-6 ${tone === 'you' ? 'text-you' : tone === 'kim' ? 'text-kim' : ''}`}>{value}</span>
      <span className="text-[11px] leading-4 text-chalk-mute">{label}</span>
    </div>
  )
}

function InsightsView({ rallies, section, toast }: { rallies: Draft[]; section: Section; toast: (t: string) => void }) {
  const x = insightsOf(rallies)
  if (section === 'Attack')
    return (
      <>
        <Card title="Who attacked first" note="and how often you won">
          <ShareRow label="You first" s={x.first.you} />
          <ShareRow label="Kim first" s={x.first.kim} />
          <ShareRow label="Nobody" s={x.first.nobody} />
        </Card>
        <Card title="Third ball and receive attack" note="won by the attacker">
          <div className="flex gap-1.5">
            <Stat tone="you" value={`${x.third.me.won}/${x.third.me.of}`} label="Your third ball" />
            <Stat tone="kim" value={`${x.third.them.won}/${x.third.them.of}`} label="Kim third ball" />
          </div>
          <div className="flex gap-1.5">
            <Stat tone="you" value={`${x.receive.me.won}/${x.receive.me.of}`} label="Your receive attack" />
            <Stat tone="kim" value={`${x.receive.them.won}/${x.receive.them.of}`} label="Kim receive attack" />
          </div>
        </Card>
        <Card title="Counters" note="an attack after an attack">
          <div className="flex gap-1.5">
            <Stat tone="you" value={x.counters.me.shots} label={`You, ${plural(x.counters.me.winners, 'winner')}`} />
            <Stat tone="kim" value={x.counters.them.shots} label={`Kim, ${plural(x.counters.them.winners, 'winner')}`} />
          </div>
        </Card>
      </>
    )
  if (section === 'Serve')
    return (
      <>
        <Card title="Points you won" note="by server">
          <ShareRow label="Your serve" s={x.serve.yours} />
          <ShareRow label="Kim's serve" s={x.serve.kims} />
        </Card>
        <Card title="Short or long serve" note="won by the server">
          <ShareRow label="Short" s={x.depth.short} tone="chalk" />
          <ShareRow label="Long" s={x.depth.long} tone="chalk" />
        </Card>
        <Card title="Rally length" note="points you won">
          {x.length.map((l) => (
            <ShareRow key={l.label} label={`${l.label} shots`} s={l.s} />
          ))}
        </Card>
      </>
    )
  if (section === 'Points') {
    const row = (who: 'me' | 'them') => {
      const e = x.ends[who]
      return (
        <div className="grid grid-cols-[52px_repeat(6,1fr)] items-center text-center font-mono text-xs">
          <span className={`text-left font-sans font-semibold ${who === 'me' ? 'text-you' : 'text-kim'}`}>{who === 'me' ? 'You' : 'Kim'}</span>
          <span>{e.winFH}</span>
          <span>{e.winBH}</span>
          <span>{e.winServe}</span>
          <span className="text-alert">{e.errFH}</span>
          <span className="text-alert">{e.errBH}</span>
          <span className="text-alert">{e.errServe}</span>
        </div>
      )
    }
    const top = x.lost.slice(0, 4)
    const max = Math.max(1, ...top.map((l) => l.count))
    return (
      <>
        <Card title="Winners and errors" note="by the last hand">
          <div className="grid grid-cols-[52px_repeat(6,1fr)] text-center text-[10px] font-bold uppercase text-chalk-faint">
            <span />
            <span>FH</span>
            <span>BH</span>
            <span>Serve</span>
            <span>FH</span>
            <span>BH</span>
            <span>Serve</span>
          </div>
          {row('me')}
          {row('them')}
          <div className="flex text-[10px] font-bold uppercase text-chalk-faint">
            <span className="w-[52px]" />
            <span className="flex-1 text-center">Winners</span>
            <span className="flex-1 text-center text-alert/80">Errors</span>
          </div>
        </Card>
        <Card title="Where you lose points">
          {top.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs">
              <span className="w-36 shrink-0 truncate text-chalk-mute">{l.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-3">
                <div className="h-full rounded-full bg-alert/80" style={{ width: `${(l.count / max) * 100}%` }} />
              </div>
              <span className="w-5 text-right font-mono">{l.count}</span>
            </div>
          ))}
        </Card>
        <Card title="Last shot" note="winners and errors">
          <div className="flex gap-1.5">
            {x.lastType.map((l) => (
              <Stat
                key={l.role}
                value={
                  <>
                    {l.winners}
                    <span className="text-chalk-faint"> / </span>
                    <span className="text-alert">{l.errors}</span>
                  </>
                }
                label={l.role}
              />
            ))}
          </div>
        </Card>
      </>
    )
  }
  const items = x.review.slice(0, 8)
  return (
    <Card title="Marked to review" note={`${x.review.length} marks`}>
      {items.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-flag/15 text-flag">
            <Icon name={r.part === 'Star' ? 'star' : 'flag'} size={12} fill={r.part === 'Star'} />
          </span>
          <span className="flex-1">
            Set {r.set}, rally {r.no} <span className="text-chalk-mute">· {r.part}</span>
          </span>
          <button type="button" onClick={() => toast(`Playing set ${r.set}, rally ${r.no}, ${r.part}`)} className="flex h-7 items-center gap-1 rounded-md bg-ink-2 px-2 font-semibold">
            <Icon name="play" size={11} />
            Play
          </button>
        </div>
      ))}
      {x.review.length ? (
        <button type="button" onClick={() => toast('Playing every mark in order')} className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-btn bg-chalk text-xs font-semibold text-ink-0">
          <Icon name="play" size={13} />
          Play all {x.review.length}
        </button>
      ) : (
        <p className="text-xs text-chalk-mute">Nothing marked yet. Tap a part under a rally to mark it.</p>
      )}
    </Card>
  )
}

export function OverviewScreen({ s, go }: { s: TagState; go: Dispatch<Action> }) {
  const [scope, setScope] = useState<Scope>(s.cur as Scope)
  const [view, setView] = useState<View>('rallies')
  const [section, setSection] = useState<Section>('Attack')
  const set = scope === 'match' ? null : s.sets.find((x) => x.no === scope)!
  const rallies = set ? set.rallies : s.sets.flatMap((x) => x.rallies)
  const [pick, setPick] = useState<number | null>(null)
  const sel = set ? set.rallies.find((r) => r.no === pick) ?? set.rallies[set.rallies.length - 1] : null
  const toast = (text: string) => go({ type: 'toast', text })
  const setsWon = s.sets.map((x) => scoreOf(x.rallies)).filter(setOver)
  const matchScore: [number, number] = [setsWon.filter(([a, b]) => a > b).length, setsWon.filter(([a, b]) => b > a).length]
  const score = set ? scoreOf(set.rallies) : matchScore

  return (
    <div className="flex h-full flex-col" data-screen="overview">
      <TopBar
        left={
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              <span className="text-you">You</span> v <span className="text-kim">Kim</span>
            </span>
            <span className="text-[11px] leading-3 text-chalk-faint">Club league, 18 Nov</span>
          </div>
        }
        right={<BarBtn onClick={() => go({ type: 'screen', s: 'tag' })}>Back to tagging</BarBtn>}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 pb-3 pt-2.5" data-tag-body>
        <div className="flex items-center gap-3">
          <Pills
            small
            items={[
              { v: 1 as Scope, label: 'Set 1' },
              { v: 2 as Scope, label: 'Set 2' },
              { v: 'match' as Scope, label: 'Match' },
            ]}
            value={scope}
            onPick={(v) => {
              setScope(v)
              setPick(null)
            }}
          />
          <div className="flex-1" />
          <div className="text-right">
            <div className="font-mono text-xl font-bold leading-6">
              <span className="text-you">{score[0]}</span>
              <span className="px-1 text-chalk-faint">:</span>
              <span className="text-kim">{score[1]}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-chalk-faint">{set ? (setOver(score) ? 'Final' : `${rallies.length} rallies so far`) : 'Sets'}</div>
          </div>
        </div>
        <Pills
          items={[
            { v: 'rallies' as View, label: 'Rallies' },
            { v: 'insights' as View, label: 'Insights' },
          ]}
          value={view}
          onPick={setView}
        />
        {view === 'insights' ? (
          <>
            <div className="flex gap-1.5">
              {(['Attack', 'Serve', 'Points', 'Review'] as Section[]).map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={x === section}
                  onClick={() => setSection(x)}
                  className={`h-7 rounded-full border px-3 text-xs font-semibold ${x === section ? 'border-chalk text-chalk' : 'border-ink-3 text-chalk-mute'}`}
                >
                  {x}
                </button>
              ))}
              <span className="flex-1" />
              <span className="self-center text-[11px] text-chalk-faint">{rallies.length} rallies</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2" data-insights={section}>
              <InsightsView rallies={rallies} section={section} toast={toast} />
            </div>
          </>
        ) : set ? (
          <>
            <div className="grid grid-cols-6 gap-1" data-tiles>
              {set.rallies.map((r) => (
                <Tile key={r.no} d={r} on={sel?.no === r.no} onClick={() => setPick(r.no)} />
              ))}
            </div>
            {sel ? <RallyOverview d={sel} go={go} toast={toast} /> : null}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {s.sets.map((x) => {
              const sc = scoreOf(x.rallies)
              const marks = x.rallies.filter((r) => r.review.length || r.star).length
              return (
                <button key={x.no} type="button" onClick={() => setScope(x.no as Scope)} className="flex items-center gap-3 rounded-card bg-ink-1 p-3 text-left">
                  <span className="text-sm font-semibold">Set {x.no}</span>
                  <span className="font-mono text-base font-bold">
                    <span className="text-you">{sc[0]}</span>
                    <span className="px-1 text-chalk-faint">:</span>
                    <span className="text-kim">{sc[1]}</span>
                  </span>
                  <span className="flex-1 text-xs text-chalk-mute">
                    {x.rallies.length} rallies, {marks} marked
                  </span>
                  <span className="text-xs font-semibold text-chalk-mute">{setOver(sc) ? 'Final' : 'Tagging'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
