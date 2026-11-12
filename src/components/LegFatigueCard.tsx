import { useMemo } from 'react';
import { nextTestOrRace } from '../engine/testRaceUpcoming';
import { useAppData } from '../state/AppDataContext';
import { fatigueBand, fatigueStatus, fatigueWord, FATIGUE_THRESHOLDS, legFatigueOn, type LegFatigueInputs } from '../engine/legFatigue';
import { legSorenessList } from '../engine/legSoreness';
import { resolveVariantDuration } from '../engine/substitutions';
import { loadBodyKg } from '../engine/weightTrend';
import { addDays, formatWeekdayDayMonthNL, todayISO } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { Card } from './ui';

// Je stand → Benen, het hart van het scherm: the leg fatigue index (engine/legFatigue.ts) for you to
// see, not only for the planning: how fresh your legs are today, what still counts, and how fresh they
// will be at your next test or race. Zonder eigen kop en i: de naam en de i staan in de lucht van het
// scherm (pages/StandScreen.tsx). Het woord staat in gewone inkt; let op is een amber stip vooraan de
// regel van je test of wedstrijd, nooit een gekleurd woord (docs/visie/Ontwerp Stand minimaal.md, 2).

const SCALE = 20;
// Drie zones op de balk, met dezelfde grenzen als het woord erboven (engine/legFatigue.ts#fatigueWord):
// fris is mint, wat vermoeid amber (de kleur van de benen), vermoeid oranje op de inspanningsschaal.
// Geen verloop: een verloop van mint naar amber leest tussen de twee als bruin.
const LEVEL_COLOR = ['var(--color-progress)', 'var(--color-warning)', 'var(--color-effort-4)'];
const ZONE_EDGES = [0, FATIGUE_THRESHOLDS.test.fresh, FATIGUE_THRESHOLDS.hard.fresh, SCALE];

export function useLegFatigueInputs(): LegFatigueInputs {
  const { sessionLogs, plannedSessions, templates, program, settings, injuryNotes } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    // The same weight the planner reads (state/AppDataContext.tsx): MacroFactor's trend weight when it is switched on.
    const bodyKg = loadBodyKg({ weightEntries: settings.weightEntries, weightFromMacroFactor: settings.weightFromMacroFactor, weightFromHealthConnect: settings.weightFromHealthConnect, weightForLoad: settings.weightForLoad });
    return {
      logs: sessionLogs, plannedSessions, templates, today, bodyKg, program,
      minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      // Spierpijn uit de ochtendcheck en een melding op een beenplek uit Hoe voelt je lijf? tellen even zwaar.
      soreness: legSorenessList(settings.morningCheckIns, injuryNotes),
    };
  }, [sessionLogs, plannedSessions, templates, program, settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect, settings.weightForLoad, settings.morningCheckIns, injuryNotes, today]);
}

export function LegFatigueCard() {
  const { plannedSessions, sessionLogs, templates } = useAppData();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;
  const now = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  // De index is je stand van vanochtend: een training van vandaag telt pas vanaf morgen. Staat er vandaag al iets
  // gedaan dat je benen belast, dan zegt de kaart wat dat morgen betekent (eigenaar, 8 november).
  const tomorrow = useMemo(() => legFatigueOn(addDays(today, 1), inputs), [today, inputs]);
  const doneToday = tomorrow.contributions.filter((c) => c.date === today && c.logged);

  // The next test or race in the coming 2 weeks, as it is planned now.
  const upcoming = useMemo(() => nextTestOrRace(plannedSessions, sessionLogs, today, templates), [plannedSessions, sessionLogs, today, templates]);
  const next = upcoming?.session;
  const nextResult = useMemo(() => (next ? legFatigueOn(next.scheduledDate, inputs) : undefined), [next, inputs]);
  const purpose = upcoming?.kind ?? 'test';
  const nextStatus = nextResult ? fatigueStatus(nextResult, purpose) : undefined;
  const band = nextResult ? fatigueBand(nextResult.index, purpose) : undefined;

  const { word, level } = fatigueWord(now.index);
  const color = LEVEL_COLOR[level];
  const pct = (v: number) => `${Math.min(100, (v / SCALE) * 100)}%`;

  return (
    <Card className="flex flex-col gap-3">
      {/* Het woord is het oordeel en staat groot; het getal van de index klein erachter (coördinator, 12 november). */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>{word}</span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>index {formatNumberNL(now.index, 1)}</span>
      </div>

      <div className="relative h-2" role="img" aria-label={`Beenvermoeidheid ${formatNumberNL(now.index, 1)}: ${word.toLowerCase()}`}>
        <div className="flex h-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
          {LEVEL_COLOR.map((zone, i) => (
            <span key={i} style={{ flexGrow: ZONE_EDGES[i + 1]! - ZONE_EDGES[i]!, flexBasis: 0, background: zone }} />
          ))}
        </div>
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ left: pct(now.index), background: 'var(--color-ink)', borderColor: color, transition: 'left 400ms' }} aria-hidden />
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--color-ink-dim)' }} aria-hidden>
        <span>fris</span>
        <span>wat vermoeid</span>
        <span>vermoeid</span>
      </div>

      {now.contributions.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Werkt nog door</p>
          {now.contributions.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate" style={{ color: 'var(--color-ink)' }}>{c.name} <span style={{ color: 'var(--color-ink-dim)' }}>· {formatWeekdayDayMonthNL(c.date)}</span></span>
              <span className="shrink-0 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatNumberNL(c.points, 1)} {c.points === 1 ? 'punt' : 'punten'}</span>
            </div>
          ))}
        </div>
      )}

      {doneToday.length > 0 && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          {doneToday.map((c) => c.name).join(' en ')} van vandaag {doneToday.length === 1 ? 'telt' : 'tellen'} vanaf morgen mee. Morgen ongeveer <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatNumberNL(tomorrow.index, 1)}</span>, {fatigueWord(tomorrow.index).word.toLowerCase()}.
        </p>
      )}

      {next && nextResult && nextStatus && (
        // Een waarschuwing staat volledig op het scherm, als gewone regel; een grensgeval of niet fris krijgt de amber stip vooraan.
        <p className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }} data-leg-test-line>
          {(nextStatus !== 'fris' || band?.nearLine) && <span aria-label="Let op" role="img" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
          <span>
            {purpose === 'race' ? 'Wedstrijd' : 'Testloop'} {formatWeekdayDayMonthNL(next.scheduledDate)}: <span className="tabular-nums">{formatNumberNL(nextResult.index, 1)}</span>
            {band && <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}> (ongeveer {formatNumberNL(band.low, 0)} tot {formatNumberNL(band.high, 0)})</span>}, {band?.nearLine ? 'op de grens' : nextStatus}
            {band?.nearLine && <span style={{ color: 'var(--color-ink-dim)' }}>. Voelen je benen bij het inlopen zwaarder dan normaal, dan een dag later.</span>}
            {nextStatus !== 'fris' && nextResult.contributions[0] && (
              <span style={{ color: 'var(--color-ink-dim)' }}> · grens {FATIGUE_THRESHOLDS[purpose].fresh}. Het zwaarst telt {nextResult.contributions[0].name} van {formatWeekdayDayMonthNL(nextResult.contributions[0].date)} ({formatNumberNL(nextResult.contributions[0].points, 1)}){nextResult.contributions[0].logged ? '.' : ': doe het korter, of na de ' + (purpose === 'race' ? 'wedstrijd' : 'test') + '.'}</span>
            )}
            {nextResult.painRecent && <span style={{ color: 'var(--color-ink-dim)' }}> Je meldde pijn, dus dit telt nooit vanzelf als fris.</span>}
          </span>
        </p>
      )}
    </Card>
  );
}
