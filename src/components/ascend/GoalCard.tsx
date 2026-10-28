import { forwardRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CountUp } from '../CountUp';
import { Icon } from '../icons';
import { Eyebrow, Meter, Ring } from '../ui';
import { TextButton } from '../TextButton';
import { formatDateNL, formatShortDayNL } from '../../utils/dates';
import { GOAL_KINDS } from '../../data/goalKinds';
import { changeLabel } from '../../engine/goalReadiness';
import { goalKindOf } from '../../engine/goalLabels';
import { labelLine, type NextKeySession } from '../../engine/goalList';
import { LabelPill } from './GoalLabel';
import type { GoalView } from './useGoalViews';
import { JourneyRows } from './JourneyRows';
import { isTrekGoal, whenText } from './goalText';
import type { RaceFacts } from '../../engine/raceReadiness';

// Wat een hardloopwedstrijd met een doeltijd bovenaan zegt: eerst het droge feit (verwacht nu, doel,
// de afstand ertussen), dan de haalbaarheid als droog feit. Zonder test één regel. De basis ("Uit je
// snelste 5 km van ...") staat alleen in het blad (`withBasis`). Besluit:
// docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid-aanvulling.md.
export function RaceFactsBlock({ race, withBasis = false }: { race: RaceFacts; withBasis?: boolean }) {
  const dim = { color: 'var(--color-ink-dim)' };
  if (race.status === 'no-target') return null;
  if (!race.nowLine) return race.statusLine ? <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{race.statusLine}</p> : null;
  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{race.nowLine}</p>
      {race.bandLine && <p className="text-sm leading-snug" style={dim}>{race.bandLine}</p>}
      {withBasis && race.basisLine && <p className="text-xs leading-snug" style={dim}>{race.basisLine}</p>}
    </div>
  );
}

// Eén doel in de lijst. Het eerste doel staat open: de ring met "Klaar voor je doel", de zin
// waaruit het bestaat, de meters, de volgende stap en bij een tocht de tochtmodule. De andere zijn
// een compacte rij die uitklapt. De greep rechts is alleen voor slepen (en het toetsenbord).

export interface HandleProps {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  active: boolean;
}

export const GoalCard = forwardRef<HTMLDivElement, {
  view: GoalView;
  open: boolean;
  first: boolean;
  next?: NextKeySession;
  dragging: boolean;
  dragStyle?: CSSProperties;
  handle: HandleProps;
  onToggle: () => void;
  onDetails: () => void;
  onLabel: () => void;
}>(function GoalCard({ view, open, first, next, dragging, dragStyle, handle, onToggle, onDetails, onLabel }, ref) {
  const navigate = useNavigate();
  const { item, readiness, timing } = view;
  const goal = item.goal;
  const kind = goalKindOf(goal) ?? (item.isMain ? 'trek_hut' : undefined);
  const when = whenText(view);
  const kindName = kind ? GOAL_KINDS[kind].label : undefined;
  const percent = readiness?.percent;
  // Een wedstrijd met een doeltijd: de kaart is in één oogopslag te lezen, de rest staat in het blad.
  const raceCard = !!readiness?.race && readiness.race.status !== 'no-target';
  // Een wedstrijd met een gemeten doeltijd: feiten en meters staan altijd open, er valt niets uit te klappen.
  const raceOpen = raceCard && readiness?.race?.status === 'counted';
  const change = readiness ? changeLabel(readiness.change) : undefined;
  const sentence = readiness?.sentence ?? (kind
    ? 'Nog niets te meten. Dat komt met trainingen die meetellen.'
    : 'Dit doel heeft nog geen soort, dus er valt niets te meten. Kies er een via Doel aanpassen.');

  return (
    <div
      ref={ref}
      data-goal-id={goal.id}
      className="relative flex flex-col gap-3 rounded-2xl border p-4"
      style={{
        background: 'var(--color-card)',
        borderColor: dragging ? 'var(--color-action)' : 'var(--color-card-border)',
        boxShadow: dragging ? '0 8px 24px color-mix(in srgb, var(--color-shadow) 55%, transparent)' : undefined,
        zIndex: dragging ? 20 : undefined,
        ...dragStyle,
      }}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={onDetails} className="shrink-0 text-left" aria-label={`${goal.name || 'Doel'}, alles over dit doel`}>
          <Ring value={percent === undefined ? 0 : percent / 100} label={percent === undefined ? 'Nog niet te meten' : `Klaar voor je doel: ${percent}%`} size={first ? 72 : 60} stroke={first ? 7 : 6}>
            {percent === undefined ? (
              <span className="font-sans text-base tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>-</span>
            ) : (
              <span className="font-sans font-semibold leading-none tabular-nums" style={{ color: 'var(--color-ink)', fontSize: first ? 22 : 17 }}>
                <CountUp value={percent} /><span className="ml-px text-xs font-medium">%</span>
              </span>
            )}
          </Ring>
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full min-h-[44px] text-left">
            <span className="block font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{goal.name || 'Naamloos doel'}</span>
            <span className="mt-0.5 block text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
              {goal.targetDate && <>{formatDateNL(goal.targetDate)} · </>}
              <span className={`font-semibold ${timing.state === 'ahead' ? 'whitespace-nowrap' : ''}`} style={{ color: when.tone === 'status' ? 'var(--color-status)' : 'var(--color-ink-dim)' }}>{when.text}</span>
              {kindName && kindName !== goal.name && <span className="block text-xs">{kindName}</span>}
            </span>
          </button>
          <div className="mt-1 flex">
            <LabelPill priority={item.priority} onClick={onLabel} strong={item.priority === 'top'} />
          </div>
        </div>
        <button
          type="button"
          aria-label={`Verplaats ${goal.name || 'doel'}. Spatie pakt op, pijltjes verplaatsen, spatie laat los.`}
          aria-pressed={handle.active}
          onPointerDown={handle.onPointerDown}
          onKeyDown={handle.onKeyDown}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          style={{ touchAction: 'none', color: handle.active ? 'var(--color-action)' : 'var(--color-ink-dim)', cursor: 'grab' }}
        >
          <Icon name="greep" size={22} />
        </button>
      </div>

      {!raceCard && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{kind ? labelLine(goal, item.priority) : 'Kies een soort, dan telt dit doel mee.'}</p>}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow as="span">Klaar voor je doel</Eyebrow>
          {change && <span className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{change}</span>}
        </div>
        {readiness?.race && <RaceFactsBlock race={readiness.race} />}
        {!raceOpen && (
          <p className={`text-sm leading-relaxed ${open ? '' : 'line-clamp-2'}`} style={{ color: 'var(--color-ink)' }}>{sentence}</p>
        )}
      </div>

      {(open || raceCard) && (
        <div className="animate-rise-in flex flex-col gap-3">
          {readiness && readiness.meters.length > 0 && (
            <div className="flex flex-col gap-3">
              {readiness.meters.map((m) => (
                <div key={m.key} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{m.text}</span>
                  </div>
                  <Meter value={m.share} label={m.label} />
                </div>
              ))}
            </div>
          )}
          {readiness?.weakestSentence && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.weakestSentence}</p>}
          {readiness?.missingSentence && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.missingSentence}</p>}
        </div>
      )}

      {first && next && <NextStep next={next} />}

      {open && kind && isTrekGoal(kind) && <JourneyRows compact onNavigate={navigate} />}

      <div className="-mb-2 flex items-center justify-between">
        <TextButton onClick={onDetails} icon="verder">Meer over dit doel</TextButton>
        {/* Een wedstrijd met een gemeten doeltijd toont alles al: dan klapt er niets. */}
        {!raceOpen && <TextButton tone="dim" onClick={onToggle} icon="omlaag" flipped={open} aria-expanded={open}>{open ? 'Inklappen' : 'Uitklappen'}</TextButton>}
      </div>
      {timing.state === 'underway' && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Tijdens het doel plant ASCEND geen training. Het doel is je training.</p>
      )}
    </div>
  );
});

export function NextStep({ next }: { next: NextKeySession }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface)' }}>
      <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="vlag" size={18} /></span>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
        <span className="font-semibold">Hierna · {formatShortDayNL(next.date)}.</span> {next.name}{next.minutes > 0 ? `, ${next.minutes} minuten` : ''}.
      </p>
    </div>
  );
}
