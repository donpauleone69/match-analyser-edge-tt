/**
 * Rally Timeline — four-mode one-tap shot rows (feel-test UI)
 *
 * Behaviour from RALLY_TIMELINE_SPEC.md. Tailwind layout for portrait + landscape;
 * content-sized pills (no stretch / no wrap / no horizontal scroll).
 */

import { cn } from '@/helpers/utils'
import {
  TIMELINE_MODES,
  PHASE_META,
  ENDING_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  showLaterRow,
  playerForShot,
  getShotSummary,
  describeFos,
  describeEnd,
  describeEndingLabel,
  inferWinnerName,
  type RallyTimelineState,
  type TimelineMode,
  type ShotNumber,
  type RallyPhase,
  type PointEnding,
  type ShotChoiceKey,
} from '../composers/rallyTimelineModel'

export interface RallyTimelineBlockProps {
  state: RallyTimelineState
  mode: TimelineMode
  onModeChange: (mode: TimelineMode) => void
  players: [string, string]
  server: string
  onToggleShotChoice: (n: ShotNumber, key: ShotChoiceKey, value: string) => void
  onMarkFos: (at: ShotNumber | 'later') => void
  onMarkEnd: (at: ShotNumber | 'later') => void
  onToggleEnding: (value: PointEnding) => void
  onToggleLaterWinner: (name: string) => void
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
        'h-8 whitespace-nowrap rounded-full border text-[12px] font-semibold',
        'px-2.5 cursor-pointer disabled:opacity-45 disabled:cursor-default',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
        'sm:h-[34px] sm:text-[13px]',
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
  onModeChange,
  players,
  server,
  onToggleShotChoice,
  onMarkFos,
  onMarkEnd,
  onToggleEnding,
  onToggleLaterWinner,
  className,
}: RallyTimelineBlockProps) {
  const visible = visibleShotNumbers(state.end)
  const showLater = showLaterRow(state.end)
  const winner = inferWinnerName(
    state.end,
    state.ending,
    players,
    server,
    state.laterWinner
  )

  return (
    <section
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-3 text-[#253341] min-w-0 w-full',
        className
      )}
      aria-label="Rally timeline"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <strong className="text-[17px] text-neutral-900">Rally timeline</strong>
        <span className="text-[12px] text-neutral-500 truncate">{server} serving</span>
      </div>

      <nav className="flex items-center flex-nowrap gap-1.5 mb-3.5 min-w-0" aria-label="Tag across shots">
        {TIMELINE_MODES.map((m) => (
          <TimelinePill
            key={m}
            kind="mode"
            label={m}
            selected={mode === m}
            onClick={() => onModeChange(m)}
            className={cn(
              'px-[clamp(8px,2.3vw,15px)] text-[clamp(11px,3vw,13px)]',
              mode === m ? 'font-bold' : 'font-medium'
            )}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1.5">
        {visible.map((n) => {
          const phase = phaseAt(n, state.fos)
          const prior = n > 1 ? phaseAt((n - 1) as ShotNumber, state.fos) : null
          const shot = state.shots[n]
          const isOpening = phase === 'opening'
          const isServe = n === 1
          const meta = PHASE_META[phase]
          const rowBg = n % 2 === 0 ? PHASE_ROW[phase].even : PHASE_ROW[phase].odd

          return (
            <div key={n}>
              {(n === 1 || phase !== prior) && (
                <div
                  className="flex gap-2 items-center mt-2.5 mb-1.5 first:mt-0.5 text-[11px] font-bold text-neutral-500 tracking-wide"
                  aria-label={meta.name}
                >
                  <span
                    className="flex-none w-2.5 h-[3px] rounded-full"
                    style={{ background: meta.stripe }}
                  />
                  <span>{meta.name}</span>
                  <span className="flex-1 min-w-2 h-px bg-neutral-200" />
                </div>
              )}

              <div
                className={cn(
                  'flex items-stretch gap-2 rounded-lg px-2 py-1.5 min-w-0 w-full sm:px-2.5 sm:py-[7px]',
                  rowBg
                )}
              >
                <div
                  className="w-1 flex-none rounded-full self-stretch"
                  style={{ background: meta.stripe }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="min-w-0 flex justify-between items-center gap-2 min-h-[18px] sm:min-h-[21px]">
                    <div className="inline-flex flex-none items-center gap-2 text-[12px]">
                      <span className="w-[15px] text-[13px] font-bold">{n}</span>
                      <strong className="text-neutral-800">{playerForShot(n, players, server)}</strong>
                    </div>
                    <span
                      className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-neutral-500"
                      title={getShotSummary(n, shot)}
                    >
                      {getShotSummary(n, shot)}
                    </span>
                  </div>

                  {mode === 'Shot' && (
                    <div className="flex gap-1.5 items-center flex-nowrap w-full min-w-0">
                      <div className="flex gap-1.5 flex-none items-center" aria-label={isServe ? 'Serve spin' : 'Stroke wing'}>
                        {(isServe ? (['Back', 'Top'] as const) : (['BH', 'FH'] as const)).map((v) => (
                          <TimelinePill
                            key={v}
                            kind="wing"
                            label={v}
                            selected={(isServe ? shot.spin : shot.wing) === v}
                            onClick={() =>
                              onToggleShotChoice(n, isServe ? 'spin' : 'wing', v)
                            }
                            className="min-w-[41px] max-[370px]:min-w-9"
                          />
                        ))}
                      </div>

                      {isOpening ? (
                        <div
                          className="flex gap-1.5 flex-none items-center ml-auto"
                          aria-label="Ball length"
                        >
                          {(['Short', 'Half', 'Long'] as const).map((v) => (
                            <TimelinePill
                              key={v}
                              kind="stroke"
                              label={v}
                              selected={shot.length === v}
                              onClick={() => onToggleShotChoice(n, 'length', v)}
                              className="min-w-[46px] max-[370px]:min-w-10"
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="flex gap-1.5 flex-none sm:flex-[0_1_auto] items-center ml-2 max-[370px]:ml-1"
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
                              className="min-w-[53px] max-w-[100px] sm:min-w-[75px] sm:max-w-[115px] max-[370px]:min-w-[45px]"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'Rally' && (
                    <div className="flex gap-1.5 items-center flex-nowrap w-full min-w-0">
                      <div className="flex gap-1.5 flex-none items-center" aria-label="Structural rally events">
                        {isServe ? (
                          <span className="inline-flex w-10 text-[12px] text-neutral-500">Serve</span>
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
                      <div
                        className="flex gap-1.5 flex-none items-center ml-auto"
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
                    </div>
                  )}

                  {mode === 'Placement' && (
                    <div className="flex gap-1.5 items-center flex-nowrap w-full min-w-0">
                      <div className="flex gap-1.5 flex-none items-center" aria-label="Placement">
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
                    <div className="flex gap-1.5 items-center flex-nowrap w-full min-w-0">
                      <div className="flex gap-1.5 flex-none items-center" aria-label="Mental response">
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

        {showLater && (
          <div className="flex items-center gap-2 bg-[#f1f3f5] rounded-lg min-h-[43px] px-2.5 py-1.5 text-[12px]">
            <span
              className="w-1 self-stretch flex-none rounded-full bg-[#96a3ac]"
              aria-hidden
            />
            <strong className="text-neutral-800">8+</strong>
            <span className="text-neutral-500">Later</span>
            {mode === 'Rally' && (
              <div className="flex gap-1.5 flex-none items-center ml-auto">
                <TimelinePill
                  kind="fos"
                  label="FOS"
                  selected={state.fos === 'later'}
                  disabled={typeof state.end === 'number'}
                  onClick={() => onMarkFos('later')}
                />
                <TimelinePill
                  kind="end"
                  label="End"
                  selected={state.end === 'later'}
                  onClick={() => onMarkEnd('later')}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {mode === 'Rally' && (
        <div className="border-t border-neutral-200 mt-3 pt-2.5">
          <div className="flex gap-2 items-center mb-2">
            <span className="flex-none w-[52px] text-[12px] font-semibold">Ending</span>
            <div className="flex gap-1.5 flex-wrap">
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
          </div>
          {state.end === 'later' && (
            <div className="flex gap-2 items-center mb-2">
              <span className="flex-none w-[52px] text-[12px] font-semibold">Won by</span>
              <div className="flex gap-1.5 flex-wrap">
                {players.map((p) => (
                  <TimelinePill
                    key={p}
                    kind="mode"
                    label={p}
                    selected={state.laterWinner === p}
                    onClick={() => onToggleLaterWinner(p)}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="text-[12px] leading-snug text-[#34424e] font-semibold mt-2.5" aria-live="polite">
            {describeEnd(state.end)} · {describeFos(state)} ·{' '}
            {state.ending
              ? `${winner ? `${winner} wins · ` : 'Winner not yet known · '}${describeEndingLabel(state.ending)}`
              : 'Select ending type'}
          </p>
        </div>
      )}
    </section>
  )
}
