import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useLegFatigueInputs } from './LegFatigueCard';
import { answerWeek, bodyCheckEvents, bodyCheckRows, bodyCheckState, isReviewDay, type CheckRow } from '../engine/bodyCheck';
import { resolveBodyCheck } from '../engine/bodyCheckSettings';
import { spotById, type BodySpot } from '../engine/bodyMap';
import { resolveFigure } from '../engine/figureSettings';
import { fatigueEvents, legFatigueOn, type FatigueEvent } from '../engine/legFatigue';
import { resolveOverviews } from '../engine/overviewSettings';
import type { InjuryKind } from '../models/injury';
import { isoWeekday } from '../utils/dates';
import { useBackToClose } from '../utils/useBackToClose';
import { Icon } from './icons';
import { BodyCheckSheet } from './lichaam/BodyCheckSheet';
import { MiniBody } from './lichaam/BodyFigure';
import { Card, Eyebrow, SecondaryButton } from './ui';

// "Hoe voelt je lijf?" op Vandaag (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md): een kleine
// kaart die er alleen staat als er reden is, onder de weekterugblik. Eén feit, het kleine figuur
// met de plekken die het hardst werkten, hoogstens drie rijen en één knop. "Iets anders
// aanwijzen" en "Niet nu" zitten achter de drie puntjes. De kaart is een vraag: hij verandert de
// planning niet.

function Bars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex h-4 w-[18px] shrink-0 items-end gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className="block w-[4px] rounded-[1px]" style={{ height: 5 + i * 3, background: i <= level ? 'var(--color-sage)' : 'var(--color-track)' }} />
      ))}
    </span>
  );
}

function PlaceRow({ row, reported, onPick }: { row: CheckRow; reported: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="flex min-h-[56px] w-full items-center gap-2.5 px-2.5 py-2 text-left" aria-label={`${row.label}, ${row.fact}${reported ? ', gemeld' : ''}`}>
      {reported ? <span className="shrink-0" style={{ color: 'var(--color-success-text)' }}><Icon name="vinkje" size={18} /></span> : row.pain ? <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} /> : <Bars level={row.level} />}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-tight" style={{ color: 'var(--color-ink)' }}>{row.label}</span>
        <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{row.fact}</span>
      </span>
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
    </button>
  );
}

export function BodyCheckCard() {
  const { settings, sessionLogs, injuryNotes, leavePeriods, updateSettings } = useAppData();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;
  const mode = resolveBodyCheck(settings);
  const reviewDay = resolveOverviews(settings.overviews).weekReviewDay;

  const [sheet, setSheet] = useState<{ spot?: BodySpot; kind: InjuryKind } | null>(null);
  const [menu, setMenu] = useState(false);
  const [reported, setReported] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  useBackToClose(menu, () => setMenu(false));

  const state = useMemo(() => {
    if (mode === 'uit') return null;
    // De beenindex rekent pas als een dag erom vraagt, en elke dag maar een keer.
    let events: FatigueEvent[] | undefined;
    const cache = new Map<string, number>();
    const legIndexOn = (date: string): number => {
      const hit = cache.get(date);
      if (hit !== undefined) return hit;
      events ??= fatigueEvents(inputs);
      const v = legFatigueOn(date, inputs, events).index;
      cache.set(date, v);
      return v;
    };
    return bodyCheckState({
      mode, today, logs: sessionLogs, notes: injuryNotes, legIndexOn, events: bodyCheckEvents({ leavePeriods, logs: sessionLogs }),
      checks: settings.weeklyHealthChecks, isReviewDay: isReviewDay(isoWeekday(today), reviewDay),
    });
  }, [mode, today, sessionLogs, injuryNotes, leavePeriods, inputs, settings.weeklyHealthChecks, reviewDay]);

  const rows = useMemo(() => (state ? bodyCheckRows({ notes: injuryNotes, logs: sessionLogs, today, reasons: state.reasons }) : []), [state, injuryNotes, sessionLogs, today]);
  const { figure } = resolveFigure(settings);

  if (!state || dismissed) return null;
  // Na een melding blijft de kaart staan tot je Klaar kiest, ook al is de week dan afgehandeld.
  if (!state.show && !sheet && reported.length === 0) return null;

  const marks = rows.flatMap((r) => r.spotIds.map((spotId) => ({ spotId, level: r.level, pain: r.pain })));
  const line = state.reasons[0]?.line ?? 'Hoe voelt je lijf na deze week?';
  const acted = reported.length > 0;

  const answer = (next: Parameters<typeof answerWeek>[2]) => void updateSettings({ weeklyHealthChecks: answerWeek(settings.weeklyHealthChecks, state.weekStart, next) });
  const isReported = (row: CheckRow) => row.spotIds.some((id) => reported.includes(id));

  return (
    <Card className="animate-page-in flex flex-col gap-3">
      <div className="relative flex min-h-[44px] items-center justify-between">
        <Eyebrow>Hoe voelt je lijf?</Eyebrow>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Meer opties voor deze kaart"
          aria-haspopup="menu"
          aria-expanded={menu}
          className="-mr-3 flex h-11 w-11 items-center justify-center"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          <Icon name="meer" size={22} />
        </button>
        {menu && (
          <>
            <button type="button" aria-label="Menu sluiten" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
            <div role="menu" className="absolute right-0 top-11 z-20 flex min-w-[220px] flex-col rounded-xl border px-1 py-1 shadow-lg" style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)' }}>
              <button role="menuitem" type="button" className="flex min-h-[48px] items-center rounded-lg px-3 text-left text-base" style={{ color: 'var(--color-ink)' }} onClick={() => { setMenu(false); setSheet({ kind: 'spierpijn' }); }}>
                Iets anders aanwijzen
              </button>
              <div className="mx-3 border-t" style={{ borderColor: 'var(--color-card-border)' }} />
              <button role="menuitem" type="button" className="flex min-h-[48px] items-center rounded-lg px-3 text-left text-base" style={{ color: 'var(--color-ink-dim)' }} onClick={() => { setMenu(false); if (acted) setDismissed(true); else answer({ kind: 'later', today }); }}>
                Niet nu
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{line}</p>

      <div className="flex items-start gap-3">
        <MiniBody figure={figure} marks={marks} label="Het lichaam, met de plekken die deze week het hardst werkten zacht gekleurd" />
        {rows.length > 0 ? (
          <div className="min-w-0 flex-1 divide-y overflow-hidden rounded-xl border" style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)' }}>
            {rows.map((row) => (
              <div key={row.key} style={{ borderColor: 'var(--color-card-border)' }}>
                <PlaceRow row={row} reported={isReported(row)} onPick={() => { const spot = spotById(row.spotId); if (spot) setSheet({ spot, kind: row.pain ? 'pijn' : 'spierpijn' }); }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Niets viel deze week op. Voel je toch iets, kies dan Iets anders aanwijzen.</p>
        )}
      </div>

      <SecondaryButton onClick={() => (acted ? setDismissed(true) : answer({ kind: 'fris' }))}>{acted ? 'Klaar' : 'Voel me fris'}</SecondaryButton>

      {sheet && (
        <BodyCheckSheet
          spot={sheet.spot}
          defaultKind={sheet.kind}
          weekStart={state.weekStart}
          onSaved={(spot) => setReported((r) => [...r, spot.id])}
          onClose={() => setSheet(null)}
        />
      )}
    </Card>
  );
}
