import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { fatigueBand, fatigueStatus, fatigueWord, FATIGUE_THRESHOLDS, legFatigueOn, type LegFatigueInputs } from '../engine/legFatigue';
import { LegFatigueInfoSheet } from './LegFatigueInfoSheet';
import { resolveVariantDuration } from '../engine/substitutions';
import { currentBodyKg } from '../engine/bodyWeight';
import { daysBetween, todayISO, weekdayShortNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { Card, Eyebrow } from './ui';

// Vandaag → "Benen": the leg fatigue index (engine/legFatigue.ts) for you to
// see, not only for the planning: how fresh your legs are today, what still
// counts, and how fresh they will be at your next test or race.

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const short = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const SCALE = 20;
const LEVEL_COLOR = ['var(--color-alpine)', 'var(--color-gold)', 'var(--color-warning)'];

export function useLegFatigueInputs(): LegFatigueInputs {
  const { sessionLogs, plannedSessions, templates, program, settings } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    // The same weight the planner reads (state/AppDataContext.tsx): MacroFactor's trend weight when it is switched on.
    const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
    return {
      logs: sessionLogs, plannedSessions, templates, today, bodyKg, program,
      minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      soreness: settings.morningCheckIns?.filter((c) => c.legs === 'spierpijn' || c.legs === 'flink').map((c) => ({ date: c.date, level: c.legs === 'flink' ? 'flink' as const : 'spierpijn' as const })),
    };
  }, [sessionLogs, plannedSessions, templates, program, settings.weightEntries, settings.weightFromMacroFactor, settings.morningCheckIns, today]);
}

export function LegFatigueCard() {
  const { plannedSessions, sessionLogs } = useAppData();
  const inputs = useLegFatigueInputs();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const today = inputs.today;
  const now = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);

  // The next test or race in the coming 2 weeks, as it is planned now.
  const logged = new Set(sessionLogs.map((l) => l.plannedSessionId));
  const next = plannedSessions
    .filter((s) => (s.templateId === 'tpl_test_run' || s.templateId === 'tpl_race') && s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= 14)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const nextResult = useMemo(() => (next ? legFatigueOn(next.scheduledDate, inputs) : undefined), [next, inputs]);
  const purpose = next?.templateId === 'tpl_race' ? 'race' : 'test';
  const nextStatus = nextResult ? fatigueStatus(nextResult, purpose) : undefined;
  const band = nextResult ? fatigueBand(nextResult.index, purpose) : undefined;

  // Nothing at all for a week: no card.
  if (now.index === 0 && !next) return null;
  const { word, level } = fatigueWord(now.index);
  const color = LEVEL_COLOR[level];
  const pct = (v: number) => `${Math.min(100, (v / SCALE) * 100)}%`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>BENEN</Eyebrow>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-sans text-2xl tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatNumberNL(now.index, 1)}</span>
            <span className="text-sm font-medium" style={{ color }}>{word}</span>
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }} aria-expanded={open}>
          {open ? 'minder' : 'hoe werkt dit?'}
        </button>
      </div>

      <div className="relative h-2 rounded-full" style={{ background: 'var(--color-charcoal)' }} role="img" aria-label={`Beenvermoeidheid ${formatNumberNL(now.index, 1)}: ${word.toLowerCase()}`}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(now.index), background: color, transition: 'width 400ms' }} />
        {[FATIGUE_THRESHOLDS.test.fresh, FATIGUE_THRESHOLDS.hard.fresh].map((m) => (
          <span key={m} className="absolute -top-0.5 h-3 w-px" style={{ left: pct(m), background: 'var(--color-ink-dim)', opacity: 0.6 }} aria-hidden />
        ))}
      </div>
      <div className="relative -mt-1.5 h-3 text-xs" style={{ color: 'var(--color-ink-dim)' }} aria-hidden>
        <span className="absolute left-0">fris</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(FATIGUE_THRESHOLDS.test.fresh) }}>test</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(FATIGUE_THRESHOLDS.hard.fresh) }}>hard</span>
        <span className="absolute right-0">vermoeid</span>
      </div>

      {now.contributions.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Werkt nog door</p>
          {now.contributions.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate" style={{ color: 'var(--color-ink)' }}>{c.name} <span style={{ color: 'var(--color-ink-dim)' }}>· {short(c.date)}</span></span>
              <span className="shrink-0 tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatNumberNL(c.points, 1)}</span>
            </div>
          ))}
        </div>
      )}

      {next && nextResult && nextStatus && (
        <p className="rounded-xl border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: nextStatus === 'fris' ? 'var(--color-card-border)' : 'var(--color-bronze-dark)', color: 'var(--color-ink)' }}>
          {next.templateId === 'tpl_race' ? 'Wedstrijd' : 'Testloop'} {short(next.scheduledDate)}: <span className="tabular-nums">{formatNumberNL(nextResult.index, 1)}</span>
          {band && <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}> (ongeveer {formatNumberNL(band.low, 0)} tot {formatNumberNL(band.high, 0)})</span>},{' '}
          <span style={{ color: nextStatus === 'fris' && !band?.nearLine ? 'var(--color-alpine)' : 'var(--color-gold)' }}>{band?.nearLine ? 'op de grens' : nextStatus}</span>
          {band?.nearLine && <span style={{ color: 'var(--color-ink-dim)' }}>. Beslis bij het inlopen: voelen je benen zwaarder dan normaal, dan een dag later.</span>}
          {nextStatus !== 'fris' && nextResult.contributions[0] && (
            <span style={{ color: 'var(--color-ink-dim)' }}> · grens {FATIGUE_THRESHOLDS[purpose].fresh}. Het zwaarst telt {nextResult.contributions[0].name} van {short(nextResult.contributions[0].date)} ({formatNumberNL(nextResult.contributions[0].points, 1)}){nextResult.contributions[0].logged ? '' : ': korter, of naar na de ' + (next.templateId === 'tpl_race' ? 'wedstrijd' : 'test')}.</span>
          )}
          {nextResult.painRecent && <span style={{ color: 'var(--color-ink-dim)' }}> Je meldde pijn: dan nooit vanzelf fris.</span>}
        </p>
      )}

      {open && (
        <p className="border-t pt-2 text-xs leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
          Elke training laat iets achter in je benen. Hard lopen is na een dag grotendeels weg, kracht en klappen halveren per dag, en spierschade van bergaf of zware beenkracht houdt 3 tot 5 dagen aan. Die drie tellen samen op. 8 of lager is fris genoeg voor een testloop, tot 12 voor een harde training. Het zwaarst telt je beentraining: hoe lang, hoe zwaar en of je eraan gewend bent. Grote verschillen kloppen bijna altijd; rond de grens is het getal onzeker, kijk dan naar je gevoel bij het inlopen.
          <button onClick={() => setInfo(true)} className="flex min-h-[44px] items-center mt-2 font-medium underline underline-offset-2" style={{ color: 'var(--color-gold)' }}>Alles over dit getal, en hoe betrouwbaar het is ›</button>
        </p>
      )}
      {info && <LegFatigueInfoSheet onClose={() => setInfo(false)} />}
    </Card>
  );
}
