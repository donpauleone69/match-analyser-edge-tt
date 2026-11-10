/**
 * Rally Focus — phase pills for the coaching capture (feel-test UI)
 *
 * Each pill line is labeled. The reply and the next shot both take a shot
 * and initiative while the point continues. The ending stays on the last shot.
 */

import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  PHASE_META,
  ENDING_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  playerForShot,
  getShotSummary,
  type RallyTimelineState,
  type RallyPhase,
  type PointEnding,
  type ShotChoiceKey,
} from '../composers/rallyFocusModel'

export interface RallyFocusBlockProps {
  state: RallyTimelineState
  players: [string, string]
  server: string
  /** Shot whose contact the loop is currently on. */
  activeShot?: number | null
  /** When true, rows from shot 2 are tappable to set the first attack. */
  fosPickMode?: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttackable: (n: number) => void
  onMarkFos: (at: number) => void
  onChangeFos: () => void
  onNoAttack: () => void
  onCancelFosPick: () => void
  onMarkEnd: (at: number) => void
  onToggleEnding: (value: PointEnding) => void
  className?: string
}

type PillKind = 'wing' | 'stroke' | 'fos' | 'end' | 'placement' | 'standing'

const PILL_COLOR: Record<PillKind, string> = {
  wing: '#477eae',
  stroke: '#8970aa',
  fos: '#329985',
  end: '#758596',
  placement: '#6c879e',
  standing: '#ae823e',
}

const PHASE_ROW: Record<RallyPhase, { odd: string; even: string }> = {
  opening: { odd: 'bg-[#f1f5f7]', even: 'bg-[#e7eef2]' },
  ball: { odd: 'bg-[#faf6ef]', even: 'bg-[#f3ecdf]' },
  fos: { odd: 'bg-[#f0f7f4]', even: 'bg-[#e4f1ec]' },
  reply: { odd: 'bg-[#f3f7fb]', even: 'bg-[#e7eef6]' },
  next: { odd: 'bg-[#f4f7f9]', even: 'bg-[#e8eef2]' },
  after: { odd: 'bg-[#f5f2f8]', even: 'bg-[#ece8f3]' },
}

const SERVE_ROW_BG = 'bg-[#f7f0e6]'
const SERVE_STRIPE = '#c4a574'

const PHASE_GROUP: Record<RallyPhase, string> = {
  opening: 'PRE OFFENSIVE SHOT',
  ball: 'PRE OFFENSIVE SHOT',
  fos: 'INITIAL OFFENSE',
  reply: 'INITIAL OFFENSE',
  next: 'INITIAL OFFENSE',
  after: 'CONTINUATION',
}

function TimelinePill({
  label,
  selected,
  onClick,
  kind,
  className,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind: PillKind
  className?: string
}) {
  const color = PILL_COLOR[kind]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex flex-none items-center justify-center',
        'h-7 whitespace-nowrap rounded-full border text-[11px] font-semibold',
        'px-2 cursor-pointer',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
        className
      )}
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: '#fff' }
          : { backgroundColor: '#fff', borderColor: color, color: '#34424e' }
      }
    >
      {label}
    </button>
  )
}

function ChoiceRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="w-full min-w-0" aria-label={label}>
      <div className="text-[8px] font-bold uppercase tracking-wide text-neutral-400 leading-none mb-px">
        {label}
      </div>
      <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">{children}</div>
    </div>
  )
}

function ShotTypeRow({
  n,
  shot,
  strokes,
  onToggleShotChoice,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  strokes: readonly ('Flick' | 'Loop' | 'Drive' | 'Block' | 'Smash' | 'Lob')[]
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
}) {
  return (
    <ChoiceRow label="Shot">
      <div className="flex gap-1 items-start w-full min-w-0">
        <div className="flex gap-1 shrink-0 items-center">
          {(['BH', 'FH'] as const).map((v) => (
            <TimelinePill
              key={v}
              kind="wing"
              label={v}
              selected={shot.wing === v}
              onClick={() => onToggleShotChoice(n, 'wing', v)}
              className="min-w-[36px]"
            />
          ))}
        </div>
        <div className="flex flex-1 min-w-0 flex-wrap justify-end gap-1">
          {strokes.map((v) => (
            <TimelinePill
              key={v}
              kind="stroke"
              label={v}
              selected={shot.stroke === v}
              onClick={() => onToggleShotChoice(n, 'stroke', v)}
              className="min-w-[44px]"
            />
          ))}
        </div>
      </div>
    </ChoiceRow>
  )
}

function StrengthPills({
  n,
  shot,
  options,
  onToggleShotChoice,
  className = 'ml-auto',
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  options: readonly ('Weak' | 'Strong' | 'High' | 'Heavy')[]
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 flex-none items-center', className)}>
      {options.map((v) => (
        <TimelinePill
          key={v}
          kind="standing"
          label={v}
          selected={shot.strength === v}
          onClick={() => onToggleShotChoice(n, 'strength', v)}
        />
      ))}
    </div>
  )
}

function WeakPill({
  selected,
  onClick,
  className,
}: {
  selected: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <TimelinePill
      kind="standing"
      label="Weak"
      selected={selected}
      onClick={onClick}
      className={className}
    />
  )
}

function InitiativeRow({
  n,
  shot,
  onToggleShotChoice,
  onToggleWeak,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleWeak: () => void
}) {
  return (
    <ChoiceRow label="Initiative">
      {(['behind', 'level', 'ahead'] as const).map((v) => (
        <TimelinePill
          key={v}
          kind="standing"
          label={v === 'behind' ? 'Behind' : v === 'level' ? 'Level' : 'Ahead'}
          selected={shot.standing === v}
          onClick={() => onToggleShotChoice(n, 'standing', v)}
        />
      ))}
      <div className="flex gap-1 flex-none items-center ml-auto">
        <WeakPill selected={shot.attackable} onClick={onToggleWeak} />
      </div>
    </ChoiceRow>
  )
}

export function RallyFocusBlock({
  state,
  players,
  server,
  activeShot = null,
  fosPickMode = false,
  onToggleShotChoice,
  onToggleAttackable,
  onMarkFos,
  onChangeFos,
  onNoAttack,
  onCancelFosPick,
  onMarkEnd,
  onToggleEnding,
  className,
}: RallyFocusBlockProps) {
  const visible = visibleShotNumbers(state.shotCount, state.end)
  const hasFos = typeof state.fos === 'number'
  const focusPhase = (n: number): RallyPhase => {
    if (state.fos === n) return 'fos'
    if (typeof state.fos === 'number' && n === state.fos + 1) return 'reply'
    if (typeof state.fos === 'number' && n === state.fos + 2) return 'next'
    return phaseAt(n, state)
  }

  return (
    <section
      className={cn('bg-white text-[#253341] min-w-0 w-full px-1.5 py-1', className)}
      aria-label="Rally focus"
    >
      <FosPickBanner
        fosPickMode={fosPickMode}
        hasFos={hasFos}
        onNoAttack={onNoAttack}
        onCancelFosPick={onCancelFosPick}
        onChangeFos={onChangeFos}
      />
      <div className="flex flex-col gap-1">
        {visible.map((n) => {
          const shot = state.shots[n]
          if (!shot) return null
          const isServe = n === 1
          const isAttack = state.fos === n
          const isReply = typeof state.fos === 'number' && n === state.fos + 1
          const isNext = typeof state.fos === 'number' && n === state.fos + 2
          const phase = focusPhase(n)
          const prior = n > 1 ? focusPhase(n - 1) : null
          const phaseName = isServe ? 'SERVE' : PHASE_GROUP[phase]
          const priorName = prior ? (n - 1 === 1 ? 'SERVE' : PHASE_GROUP[prior]) : null
          const isEnd = state.end === n
          const showInitiative = (isReply || isNext) && !isEnd
          const meta = PHASE_META[phase]
          const isPre = !isServe && (phase === 'opening' || phase === 'ball')
          const tone = isPre ? 'ball' : phase
          const rowBg = isServe
            ? SERVE_ROW_BG
            : n % 2 === 0
              ? PHASE_ROW[tone].even
              : PHASE_ROW[tone].odd
          const stripeColor = isServe ? SERVE_STRIPE : isPre ? PHASE_META.ball.stripe : meta.stripe
          const showPhaseMark = n === 1 || phaseName !== priorName

          return (
            <div key={n}>
              {showPhaseMark && (
                <div
                  className="flex gap-1.5 items-center mt-1 mb-0.5 first:mt-0 text-[9px] font-bold text-neutral-400 tracking-wide"
                  aria-label={phaseName}
                >
                  <span
                    className="flex-none w-1.5 h-[2px] rounded-full"
                    style={{ background: stripeColor }}
                  />
                  <span>{phaseName}</span>
                  <span className="flex-1 min-w-2 h-px bg-neutral-200" />
                </div>
              )}

              <ShotRow
                n={n}
                players={players}
                server={server}
                rowBg={rowBg}
                stripeColor={stripeColor}
                active={activeShot === n}
                isServe={isServe}
                isFos={state.fos === n}
                fosPickMode={fosPickMode}
                summary={getShotSummary(n, shot)}
                onMarkFos={onMarkFos}
                onChangeFos={onChangeFos}
              >
                {(isServe || isPre) && (
                  <ChoiceRow label="Placement">
                    <div className="flex gap-1 flex-none items-center">
                      {(['BH', 'Middle', 'FH'] as const).map((v) => (
                        <TimelinePill
                          key={v}
                          kind="placement"
                          label={v}
                          selected={shot.placement === v}
                          onClick={() => onToggleShotChoice(n, 'placement', v)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1 flex-none items-center ml-auto">
                      {(['Short', 'Half', 'Long'] as const).map((v) => (
                        <TimelinePill
                          key={v}
                          kind="placement"
                          label={v}
                          selected={shot.length === v}
                          onClick={() => onToggleShotChoice(n, 'length', v)}
                          className="min-w-[44px]"
                        />
                      ))}
                    </div>
                  </ChoiceRow>
                )}

                {isServe && (
                  <ChoiceRow label="Spin">
                    {(['Under', 'Top', 'Side'] as const).map((v) => (
                      <TimelinePill
                        key={v}
                        kind="wing"
                        label={v}
                        selected={shot.spin === v}
                        onClick={() => onToggleShotChoice(n, 'spin', v)}
                        className="min-w-[44px]"
                      />
                    ))}
                    <StrengthPills
                      n={n}
                      shot={shot}
                      options={['Weak', 'High', 'Heavy']}
                      onToggleShotChoice={onToggleShotChoice}
                    />
                  </ChoiceRow>
                )}

                {isPre && (
                  <ChoiceRow label="Shot">
                    <div className="flex gap-1 flex-none items-center">
                      {(['BH', 'FH'] as const).map((v) => (
                        <TimelinePill
                          key={v}
                          kind="wing"
                          label={v}
                          selected={shot.wing === v}
                          onClick={() => onToggleShotChoice(n, 'wing', v)}
                          className="min-w-[36px]"
                        />
                      ))}
                    </div>
                    <StrengthPills
                      n={n}
                      shot={shot}
                      options={['Weak', 'High', 'Heavy']}
                      onToggleShotChoice={onToggleShotChoice}
                    />
                  </ChoiceRow>
                )}

                {isAttack && (
                  <ShotTypeRow
                    n={n}
                    shot={shot}
                    strokes={['Flick', 'Loop', 'Drive', 'Smash', 'Lob']}
                    onToggleShotChoice={onToggleShotChoice}
                  />
                )}

                {isAttack && (
                  <div className="flex items-end gap-1 w-full min-w-0" aria-label="Contact relative to table">
                    <div className="min-w-0">
                      <div className="text-[8px] font-bold uppercase tracking-wide text-neutral-400 leading-none mb-px">
                        Contact relative to table
                      </div>
                      <div className="flex gap-1">
                        {(['Over', 'Behind'] as const).map((v) => (
                          <TimelinePill
                            key={v}
                            kind="placement"
                            label={v}
                            selected={shot.tableContact === v}
                            onClick={() => onToggleShotChoice(n, 'tableContact', v)}
                            className="min-w-[52px]"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <div className="text-[8px] font-bold uppercase tracking-wide text-neutral-400 leading-none mb-px text-right">
                        Attributes
                      </div>
                      <StrengthPills
                        n={n}
                        shot={shot}
                        options={['Weak', 'Strong']}
                        onToggleShotChoice={onToggleShotChoice}
                        className=""
                      />
                    </div>
                  </div>
                )}

                {showInitiative && (
                  <InitiativeRow
                    n={n}
                    shot={shot}
                    onToggleShotChoice={onToggleShotChoice}
                    onToggleWeak={() => onToggleAttackable(n)}
                  />
                )}

                {(isReply || isNext || (phase === 'after' && isEnd)) && (
                  <ShotTypeRow
                    n={n}
                    shot={shot}
                    strokes={['Block', 'Loop', 'Drive', 'Smash', 'Lob']}
                    onToggleShotChoice={onToggleShotChoice}
                  />
                )}

                {(state.end === null || isEnd) && (
                  <ChoiceRow label="Result">
                    <TimelinePill
                      kind="end"
                      label="End"
                      selected={isEnd}
                      onClick={() => onMarkEnd(n)}
                    />
                    {isEnd && (
                      <div className="flex gap-1 flex-none items-center ml-auto">
                        {ENDING_OPTIONS.map(({ value, label }) => (
                          <TimelinePill
                            key={value}
                            kind="end"
                            label={label}
                            selected={state.ending === value}
                            onClick={() => onToggleEnding(value)}
                          />
                        ))}
                      </div>
                    )}
                  </ChoiceRow>
                )}
              </ShotRow>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FosPickBanner({
  fosPickMode,
  hasFos,
  onNoAttack,
  onCancelFosPick,
  onChangeFos,
}: {
  fosPickMode: boolean
  hasFos: boolean
  onNoAttack: () => void
  onCancelFosPick: () => void
  onChangeFos: () => void
}) {
  if (fosPickMode) {
    return (
      <div
        className="mb-1.5 flex items-center gap-2 rounded-md border border-[#329985]/40 bg-[#e8f6f2] px-2 py-1.5"
        role="status"
      >
        <p className="min-w-0 flex-1 text-[11px] font-semibold text-[#14584c]">
          {hasFos ? 'Tap another shot' : 'Tap the first attack'}
        </p>
        {hasFos ? (
          <button
            type="button"
            onClick={onCancelFosPick}
            className="shrink-0 h-7 px-2 rounded-md text-[11px] font-bold border border-[#329985]/50 text-[#14584c] bg-white"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onNoAttack}
            className="shrink-0 h-7 px-2 rounded-md text-[11px] font-bold border border-neutral-300 text-neutral-600 bg-white"
          >
            No attack
          </button>
        )}
      </div>
    )
  }

  if (!hasFos) {
    return (
      <div className="mb-1.5 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <p className="min-w-0 flex-1 text-[11px] text-neutral-500">No first attack</p>
        <button
          type="button"
          onClick={onChangeFos}
          className="shrink-0 h-7 px-2 rounded-md text-[11px] font-bold border border-[#329985]/50 text-[#14584c] bg-white"
        >
          Mark attack
        </button>
      </div>
    )
  }

  return null
}

function ShotRow({
  n,
  players,
  server,
  rowBg,
  stripeColor,
  active,
  isServe,
  isFos,
  fosPickMode,
  summary,
  onMarkFos,
  onChangeFos,
  children,
}: {
  n: number
  players: [string, string]
  server: string
  rowBg: string
  stripeColor: string
  active: boolean
  isServe: boolean
  isFos: boolean
  fosPickMode: boolean
  summary: string
  onMarkFos: (at: number) => void
  onChangeFos: () => void
  children: ReactNode
}) {
  const canMarkFos = fosPickMode && n >= 2

  return (
    <div
      data-rally-shot={n}
      role={canMarkFos ? 'button' : undefined}
      tabIndex={canMarkFos ? 0 : undefined}
      aria-label={canMarkFos ? `Mark shot ${n} as first attack` : undefined}
      aria-pressed={canMarkFos ? isFos : undefined}
      onClick={canMarkFos ? () => onMarkFos(n) : undefined}
      onKeyDown={
        canMarkFos
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onMarkFos(n)
              }
            }
          : undefined
      }
      className={cn(
        'flex items-stretch gap-1.5 rounded-md px-1.5 py-1 min-w-0 w-full',
        rowBg,
        active && 'outline outline-2 outline-[#7eb8e8]',
        canMarkFos && 'cursor-pointer ring-1 ring-dashed ring-[#329985]/60'
      )}
    >
      <div
        className="w-[3px] flex-none rounded-full self-stretch"
        style={{ background: stripeColor }}
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="min-w-0 flex justify-between items-center gap-1.5 min-h-[15px]">
          <div className="inline-flex flex-none items-center gap-1.5 text-[11px]">
            <span className="w-3.5 text-[12px] font-bold">{n}</span>
            <strong className="text-neutral-800">{playerForShot(n, players, server)}</strong>
            {isServe && (
              <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-[#c4a574] text-white text-[9px] font-bold tracking-wide uppercase">
                Serve
              </span>
            )}
            {isFos && (
              <>
                <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-[#329985] text-white text-[9px] font-bold tracking-wide uppercase">
                  FOS
                </span>
                {!fosPickMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChangeFos()
                    }}
                    className="h-[18px] px-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase border border-[#329985]/50 text-[#14584c] bg-white"
                  >
                    Change
                  </button>
                )}
              </>
            )}
          </div>
          <span
            className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-neutral-500"
            title={summary}
          >
            {summary}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
