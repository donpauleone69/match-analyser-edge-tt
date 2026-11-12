/**
 * Pass 1 Focus — minimal shot pills for the first-pass capture.
 *
 * Which pills a shot shows is decided by `derivePass1ShotTagAllowList`
 * (the same allow-list the save mapper uses) — never by local role logic.
 * Technical review also forces wing + stroke on that shot.
 *
 * First attack: "No first attack" default + alternating shot-number buttons.
 */

import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  derivePass1ShotTagAllowList,
  derivePass1ShotTagRole,
} from '@/rules/derive/shot/derivePass1ShotTagRole'
import {
  PHASE_META,
  ENDING_OPTIONS,
  MISS_REASON_OPTIONS,
  REVIEW_KIND_OPTIONS,
  ATTACK_STROKE_OPTIONS,
  REPLY_STROKE_OPTIONS,
  END_STROKE_OPTIONS,
  WING_OPTIONS,
  contactOverlayColor,
  phaseAt,
  visibleShotNumbers,
  playerForShot,
  getShotSummary,
  isErrorEnding,
  type RallyTimelineState,
  type RallyPhase,
  type PointEnding,
  type PointMissReason,
  type ShotReviewKind,
  type ShotChoiceKey,
  type ShotAttributeKey,
} from '../composers/pass1FocusModel'

export interface Pass1FocusBlockProps {
  state: RallyTimelineState
  players: [string, string]
  server: string
  /** Shot whose contact the loop is currently on. */
  activeShot?: number | null
  /** When true, rows from shot 2 are tappable to set the first attack. */
  fosPickMode?: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onMarkFos: (at: number) => void
  onChangeFos: () => void
  onNoAttack: () => void
  onCancelFosPick: () => void
  onMarkEnd: (at: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleReviewKind: (n: number, value: ShotReviewKind) => void
  className?: string
}

type PillKind = 'wing' | 'stroke' | 'fos' | 'end' | 'standing'

const PILL_COLOR: Record<PillKind, string> = {
  wing: '#477eae',
  stroke: '#8970aa',
  fos: '#329985',
  end: '#758596',
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
  showPivot,
  onToggleShotChoice,
  onToggleAttribute,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  strokes: readonly string[]
  showPivot: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
}) {
  return (
    <ChoiceRow label="Shot">
      <div className="flex gap-1 items-start w-full min-w-0">
        <div className="flex gap-1 shrink-0 items-center">
          {[...WING_OPTIONS].reverse().map((v) => (
            <TimelinePill
              key={v}
              kind="wing"
              label={v}
              selected={shot.wing === v}
              onClick={() => onToggleShotChoice(n, 'wing', v)}
              className="min-w-[36px]"
            />
          ))}
          {showPivot && (
            <TimelinePill
              kind="wing"
              label="Pivot"
              selected={shot.isPivot}
              onClick={() => onToggleAttribute(n, 'isPivot')}
            />
          )}
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

function InitiativeRow({
  n,
  shot,
  onToggleShotChoice,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
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
    </ChoiceRow>
  )
}

export function Pass1FocusBlock({
  state,
  players,
  server,
  activeShot = null,
  fosPickMode = false,
  onToggleShotChoice,
  onToggleAttribute,
  onMarkFos,
  onChangeFos,
  onNoAttack,
  onCancelFosPick: _onCancelFosPick,
  onMarkEnd,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewKind,
  className,
}: Pass1FocusBlockProps) {
  const visible = visibleShotNumbers(state.shotCount, state.end)

  return (
    <section
      className={cn('bg-white text-[#253341] min-w-0 w-full px-1.5 py-1', className)}
      aria-label="Pass 1 focus"
    >
      <FirstAttackPicker state={state} onMarkFos={onMarkFos} onNoAttack={onNoAttack} />
      <div className="flex flex-col gap-1">
        {visible.map((n) => {
          const shot = state.shots[n]
          if (!shot) return null
          const isServe = n === 1
          const isEnd = state.end === n
          const allow = derivePass1ShotTagAllowList(n, state.fos, state.end)
          const role = derivePass1ShotTagRole(n, state.fos, state.end)
          const forceTechnical = shot.reviewKind === 'technical'
          const showShotType = (allow.shot_wing && allow.shot_stroke) || forceTechnical

          const phase = phaseAt(n, state)
          const prior = n > 1 ? phaseAt(n - 1, state) : null
          const phaseName = isServe ? 'SERVE' : PHASE_GROUP[phase]
          const priorName = prior ? (n - 1 === 1 ? 'SERVE' : PHASE_GROUP[prior]) : null
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

          // Stroke list follows the role: first attack > end shot > reply.
          const strokes: readonly string[] =
            role === 'first_attack'
              ? ATTACK_STROKE_OPTIONS
              : role === 'end_shot'
                ? END_STROKE_OPTIONS
                : REPLY_STROKE_OPTIONS

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
                {allow.shot_is_high && (
                  <ChoiceRow label="Ball">
                    <TimelinePill
                      kind="standing"
                      label="High"
                      selected={shot.isHigh}
                      onClick={() => onToggleAttribute(n, 'isHigh')}
                    />
                  </ChoiceRow>
                )}

                {showShotType && (
                  <ShotTypeRow
                    n={n}
                    shot={shot}
                    strokes={
                      forceTechnical && !allow.shot_stroke
                        ? END_STROKE_OPTIONS
                        : strokes
                    }
                    showPivot={allow.shot_is_pivot || forceTechnical}
                    onToggleShotChoice={onToggleShotChoice}
                    onToggleAttribute={onToggleAttribute}
                  />
                )}

                {allow.shot_is_safe && (
                  <ChoiceRow label="Attribute">
                    <TimelinePill
                      kind="standing"
                      label="Safe"
                      selected={shot.isSafe}
                      onClick={() => onToggleAttribute(n, 'isSafe')}
                    />
                  </ChoiceRow>
                )}

                {allow.shot_initiative && (
                  <InitiativeRow
                    n={n}
                    shot={shot}
                    onToggleShotChoice={onToggleShotChoice}
                  />
                )}

                <ChoiceRow label="Review">
                  <div className="flex flex-1 min-w-0 flex-wrap gap-1">
                    {REVIEW_KIND_OPTIONS.map(({ value, label }) => (
                      <TimelinePill
                        key={value}
                        kind="standing"
                        label={label}
                        selected={shot.reviewKind === value}
                        onClick={() => onToggleReviewKind(n, value)}
                      />
                    ))}
                  </div>
                </ChoiceRow>

                {(state.end === null || isEnd) && (
                  <ChoiceRow label="Result">
                    <TimelinePill
                      kind="end"
                      label="End"
                      selected={isEnd}
                      onClick={() => onMarkEnd(n)}
                    />
                    {isEnd && (
                      <div className="flex flex-1 min-w-0 flex-wrap justify-end gap-1">
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

                {isEnd && isErrorEnding(state.ending) && (
                  <ChoiceRow label="Miss reason">
                    <div className="flex flex-1 min-w-0 flex-wrap gap-1">
                      {MISS_REASON_OPTIONS.map(({ value, label }) => (
                        <TimelinePill
                          key={value}
                          kind="standing"
                          label={label}
                          selected={state.missReason === value}
                          onClick={() => onToggleMissReason(value)}
                        />
                      ))}
                    </div>
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

function FirstAttackPicker({
  state,
  onMarkFos,
  onNoAttack,
}: {
  state: RallyTimelineState
  onMarkFos: (at: number) => void
  onNoAttack: () => void
}) {
  const candidates = visibleShotNumbers(state.shotCount, state.end).filter((n) => n >= 2)
  const hasFos = typeof state.fos === 'number'

  return (
    <div
      className="mb-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5"
      role="group"
      aria-label="First attack"
    >
      <p className="text-[10px] font-bold tracking-wide text-neutral-500 mb-1">
        First attack
      </p>
      <div className="flex flex-wrap gap-1 items-center">
        <button
          type="button"
          aria-pressed={!hasFos}
          onClick={onNoAttack}
          className={cn(
            'h-7 px-2 rounded-md text-[11px] font-bold border',
            !hasFos
              ? 'bg-[#329985] text-white border-[#329985]'
              : 'bg-white text-neutral-600 border-neutral-300'
          )}
        >
          No first attack
        </button>
        {candidates.map((n) => {
          const selected = state.fos === n
          const color = contactOverlayColor(n)
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              title={`First attack on shot ${n}`}
              onClick={() => onMarkFos(n)}
              className={cn(
                'h-7 min-w-7 px-2 rounded-md text-[12px] font-black tabular-nums border',
                selected ? 'text-white border-transparent' : 'bg-white'
              )}
              style={
                selected
                  ? { backgroundColor: color, borderColor: color }
                  : { color, borderColor: color }
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[9px] text-neutral-400">
        Default is none · gold = server side · blue = receiver side
      </p>
    </div>
  )
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
  const canMarkFosRow = fosPickMode && n >= 2
  const canMarkFosNumber = n >= 2

  return (
    <div
      data-rally-shot={n}
      role={canMarkFosRow ? 'button' : undefined}
      tabIndex={canMarkFosRow ? 0 : undefined}
      aria-label={canMarkFosRow ? `Mark shot ${n} as first attack` : undefined}
      aria-pressed={canMarkFosRow ? isFos : undefined}
      onClick={canMarkFosRow ? () => onMarkFos(n) : undefined}
      onKeyDown={
        canMarkFosRow
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
        canMarkFosRow && 'cursor-pointer ring-1 ring-dashed ring-[#329985]/60'
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
            {canMarkFosNumber ? (
              <button
                type="button"
                title={`Mark shot ${n} as first attack`}
                aria-label={`Mark shot ${n} as first attack`}
                aria-pressed={isFos}
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkFos(n)
                }}
                className={cn(
                  'w-3.5 text-[12px] font-bold rounded-sm',
                  'hover:text-[#14584c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#329985]',
                  isFos ? 'text-[#14584c]' : 'text-neutral-900'
                )}
              >
                {n}
              </button>
            ) : (
              <span className="w-3.5 text-[12px] font-bold">{n}</span>
            )}
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
