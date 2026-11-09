/**
 * Rally Timeline — densified four-mode shot rows (feel-test UI)
 *
 * Dynamic N rows from contact taps. Compact portrait layout:
 * no title/card chrome; mode nav lives in the composer strip.
 */

import { cn } from '@/helpers/utils'
import {
  PHASE_META,
  ENDING_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  playerForShot,
  getShotSummary,
  type RallyTimelineState,
  type TimelineMode,
  type RallyPhase,
  type PointEnding,
  type ShotChoiceKey,
} from '../composers/rallyTimelineModel'

export interface RallyTimelineBlockProps {
  state: RallyTimelineState
  mode: TimelineMode
  players: [string, string]
  server: string
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onMarkFos: (at: number) => void
  onMarkEnd: (at: number) => void
  onToggleEnding: (value: PointEnding) => void
  className?: string
}

type PillKind =
  | 'mode'
  | 'wing'
  | 'stroke'
  | 'fos'
  | 'end'
  | 'weak'
  | 'strong'
  | 'positive'
  | 'negative'
  | 'placement'
  | 'neutral'

const PILL_COLOR: Record<PillKind, string> = {
  mode: '#1c1c1c',
  wing: '#477eae',
  stroke: '#8970aa',
  fos: '#329985',
  end: '#758596',
  weak: '#ae823e',
  strong: '#33876c',
  positive: '#33876c',
  negative: '#ae6949',
  placement: '#6c879e',
  neutral: '#758596',
}

const PHASE_ROW: Record<RallyPhase, { odd: string; even: string }> = {
  opening: { odd: 'bg-[#f1f5f7]', even: 'bg-[#e7eef2]' },
  fos: { odd: 'bg-[#f0f7f4]', even: 'bg-[#e4f1ec]' },
  rally: { odd: 'bg-[#f5f2f8]', even: 'bg-[#ece8f3]' },
}

/** Distinct from opening slate so shot 1 reads as the serve */
const SERVE_ROW_BG = 'bg-[#f7f0e6]'
const SERVE_STRIPE = '#c4a574'

function TimelinePill({
  label,
  selected,
  onClick,
  kind = 'neutral',
  disabled = false,
  className,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind?: PillKind
  disabled?: boolean
  className?: string
}) {
  const color = PILL_COLOR[kind]
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex flex-none items-center justify-center',
        'h-7 whitespace-nowrap rounded-full border text-[11px] font-semibold',
        'px-2 cursor-pointer disabled:opacity-45 disabled:cursor-default',
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

export function RallyTimelineBlock({
  state,
  mode,
  players,
  server,
  onToggleShotChoice,
  onMarkFos,
  onMarkEnd,
  onToggleEnding,
  className,
}: RallyTimelineBlockProps) {
  const visible = visibleShotNumbers(state.shotCount, state.end)

  return (
    <section
      className={cn('bg-white text-[#253341] min-w-0 w-full px-1.5 py-1', className)}
      aria-label="Rally timeline"
    >
      <div className="flex flex-col gap-1">
        {visible.map((n) => {
          const phase = phaseAt(n, state.fos)
          const prior = n > 1 ? phaseAt(n - 1, state.fos) : null
          const shot = state.shots[n]
          if (!shot) return null
          const isOpening = phase === 'opening'
          const isServe = n === 1
          const meta = PHASE_META[phase]
          const rowBg = isServe
            ? SERVE_ROW_BG
            : n % 2 === 0
              ? PHASE_ROW[phase].even
              : PHASE_ROW[phase].odd
          const stripeColor = isServe ? SERVE_STRIPE : meta.stripe
          const showPhaseMark = n === 1 || phase !== prior
          const summary = getShotSummary(n, shot)

          return (
            <div key={n}>
              {showPhaseMark && (
                <div
                  className="flex gap-1.5 items-center mt-1 mb-0.5 first:mt-0 text-[9px] font-bold text-neutral-400 tracking-wide"
                  aria-label={meta.name}
                >
                  <span
                    className="flex-none w-1.5 h-[2px] rounded-full"
                    style={{ background: stripeColor }}
                  />
                  <span>{meta.name}</span>
                  <span className="flex-1 min-w-2 h-px bg-neutral-200" />
                </div>
              )}

              <div
                className={cn(
                  'flex items-stretch gap-1.5 rounded-md px-1.5 py-1 min-w-0 w-full',
                  rowBg
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
                      <strong className="text-neutral-800">
                        {playerForShot(n, players, server)}
                      </strong>
                      {isServe && (
                        <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-[#c4a574] text-white text-[9px] font-bold tracking-wide uppercase">
                          Serve
                        </span>
                      )}
                    </div>
                    <span
                      className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-neutral-500"
                      title={summary}
                    >
                      {summary}
                    </span>
                  </div>

                  {mode === 'Shot' && (
                    <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">
                      <div
                        className="flex gap-1 flex-none items-center"
                        aria-label={isServe ? 'Serve spin' : 'Stroke wing'}
                      >
                        {(isServe ? (['Under', 'Top'] as const) : (['BH', 'FH'] as const)).map(
                          (v) => (
                            <TimelinePill
                              key={v}
                              kind="wing"
                              label={v}
                              selected={(isServe ? shot.spin : shot.wing) === v}
                              onClick={() =>
                                onToggleShotChoice(n, isServe ? 'spin' : 'wing', v)
                              }
                              className="min-w-[36px]"
                            />
                          )
                        )}
                      </div>

                      {isOpening ? (
                        <div
                          className="flex gap-1 flex-none items-center ml-auto"
                          aria-label="Ball length"
                        >
                          {(['Short', 'Half', 'Long'] as const).map((v) => (
                            <TimelinePill
                              key={v}
                              kind="stroke"
                              label={v}
                              selected={shot.length === v}
                              onClick={() => onToggleShotChoice(n, 'length', v)}
                              className="min-w-[40px]"
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="flex gap-1 flex-none items-center ml-auto"
                          aria-label="Stroke technique"
                        >
                          {(phase === 'fos'
                            ? (['Flick', 'Loop', 'Drive'] as const)
                            : (['Block', 'Loop', 'Drive'] as const)
                          ).map((v) => (
                            <TimelinePill
                              key={v}
                              kind="stroke"
                              label={v}
                              selected={shot.stroke === v}
                              onClick={() => onToggleShotChoice(n, 'stroke', v)}
                              className="min-w-[44px] max-w-[90px]"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'Rally' && (
                    <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">
                      <div
                        className="flex gap-1 flex-none items-center"
                        aria-label="Structural rally events"
                      >
                        {isServe ? (
                          <span className="inline-flex w-9 text-[11px] text-neutral-500">
                            Serve
                          </span>
                        ) : (
                          <TimelinePill
                            kind="fos"
                            label="FOS"
                            selected={state.fos === n}
                            onClick={() => onMarkFos(n)}
                          />
                        )}
                        <TimelinePill
                          kind="end"
                          label="End"
                          selected={state.end === n}
                          onClick={() => onMarkEnd(n)}
                        />
                      </div>
                      {state.end === n ? (
                        <div
                          className="flex gap-1 flex-none items-center ml-auto"
                          aria-label="Point ending"
                        >
                          {ENDING_OPTIONS.map(({ value, label }) => (
                            <TimelinePill
                              key={value}
                              kind="mode"
                              label={label}
                              selected={state.ending === value}
                              onClick={() => onToggleEnding(value)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="flex gap-1 flex-none items-center ml-auto"
                          aria-label="Shot strength"
                        >
                          {(['Weak', 'Strong'] as const).map((v) => (
                            <TimelinePill
                              key={v}
                              kind={v === 'Weak' ? 'weak' : 'strong'}
                              label={v}
                              selected={shot.strength === v}
                              onClick={() => onToggleShotChoice(n, 'strength', v)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'Placement' && (
                    <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">
                      <div className="flex gap-1 flex-none items-center" aria-label="Placement">
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
                    </div>
                  )}

                  {mode === 'Mental' && (
                    <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">
                      <div
                        className="flex gap-1 flex-none items-center"
                        aria-label="Mental response"
                      >
                        {(['Positive', 'Negative'] as const).map((v) => (
                          <TimelinePill
                            key={v}
                            kind={v === 'Positive' ? 'positive' : 'negative'}
                            label={v}
                            selected={shot.mental === v}
                            onClick={() => onToggleShotChoice(n, 'mental', v)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
