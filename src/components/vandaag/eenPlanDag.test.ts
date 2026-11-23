// I-14 Eén plan, stap naspelen (docs/visie/Ontwerp Eén plan.md, symptoom B en invariant 3): Vandaag, Week en de
// weekbalk zeggen voor dezelfde dag hetzelfde. Wat nu niet klopt staat als it.fails; een latere stap (het dagbeeld,
// claude/een-plan-dagbeeld) zet die om naar it. Testdata is nagemaakt.
//
// Vandaag en Week kiezen hun rijen in de pagina zelf (src/pages/Today.tsx en src/pages/Week.tsx), zonder functie die
// een test kan aanroepen. Deze tests lezen daarom wat er wel los staat: de weekbalk zoals hij rendert (zijn
// aria-labels), de woorden van een rij in Week (engine/weekRow.ts) en de volgorde van Vandaag (engine/dayOrder.ts).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekStrip } from './WeekStrip';
import { buildDefaultProgramData } from '../../data/defaultProgram';
import { doneOnOtherDay } from '../../engine/weekRow';
import { dayOrder, orderDay } from '../../engine/dayOrder';
import { resolveEffectiveFullDuration } from '../../engine/substitutions';
import type { PlannedSession, SessionLog } from '../../models/training';

const { templates } = buildDefaultProgramData();
const templateById = new Map(templates.map((t) => [t.id, t]));
const nameOf = (id: string) => templateById.get(id)!.name;

const MONDAY = '2026-11-16';
const WEDNESDAY = '2026-11-18';
const THURSDAY = '2026-11-19';
const row = (id: string, templateId: string, scheduledDate: string, order = 0): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MONDAY, status: 'planned', order });
const logFor = (s: PlannedSession, completedDate: string): SessionLog => ({
  id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: templateById.get(s.templateId)!.type, completedDate, completedAt: `${completedDate}T07:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

// De aria-label van elke dag in de weekbalk, op dag van de week (1 = maandag).
function stripLabels(sessions: PlannedSession[], logs: SessionLog[], today: string): string[] {
  const html = renderToStaticMarkup(createElement(WeekStrip, { weekStart: MONDAY, sessions, logs, templateById, program: null, today }));
  return [...html.matchAll(/<li[^>]*aria-label="([^"]*)"/g)].map((m) => m[1]);
}

describe('symptoom B: een training van morgen die je vandaag deed', () => {
  const tempo = row('tempo', 'tpl_tempo_run', THURSDAY);
  const sessions = [row('upper', 'tpl_upper_a', '2026-11-17'), tempo, row('long', 'tpl_long_run', '2026-11-22')];
  const logs = [logFor(tempo, WEDNESDAY)];

  it('Week houdt hem op donderdag met het woord "wo 18"; de balk zet hem op woensdag (het besluit van 23 november)', () => {
    // Week (components/WeekPlanner.tsx): de rij op zijn geplande dag, met de dag van uitvoeren erbij.
    expect(doneOnOtherDay(tempo, logs[0])).toBe('wo 18');
    const labels = stripLabels(sessions, logs, WEDNESDAY);
    expect(labels[2]).toBe(`Woensdag (vandaag): ${nameOf('tpl_tempo_run')}, gedaan`);
    expect(labels[3]).toBe('Donderdag: vrij');
  });

  it.fails('symptoom B: de balk noemt het verschil met Week in een woord, zoals Week "wo 18" zegt', () => {
    // Invariant 3: de balk toont dezelfde rijen als Week, behalve wat de dag van uitvoeren verplaatst, en dat verschil
    // staat in beide met een woord. Nu zegt de balk woensdag "gedaan" en donderdag "vrij", zonder te zeggen dat het
    // de training van donderdag was; Week zegt donderdag "gedaan wo 18".
    const labels = stripLabels(sessions, logs, WEDNESDAY);
    const wednesdayNamesThursday = /\bdo\b|donderdag/i.test(labels[2]);
    const thursdayNotEmpty = labels[3] !== 'Donderdag: vrij';
    expect(wednesdayNamesThursday || thursdayNotEmpty).toBe(true);
  });
});

describe('symptoom B: twee trainingen op een dag', () => {
  // Een tempoloop en Benen A op dezelfde dag: Vandaag zet de loop eerst (dayOrder regel 5, eerst lopen, kracht 6 uur later).
  const tempo = row('tempo', 'tpl_tempo_run', WEDNESDAY, 0);
  const legs = row('legs', 'tpl_lower_a', WEDNESDAY, 1);
  const sessions = [legs, tempo];

  it('Vandaag adviseert de tempoloop eerst, en Benen A duurt langer', () => {
    const order = orderDay(sessions, dayOrder(sessions, [], templateById)).map((s) => s.templateId);
    expect(order).toEqual(['tpl_tempo_run', 'tpl_lower_a']);
    expect(resolveEffectiveFullDuration(templateById.get('tpl_lower_a')!, WEDNESDAY, null)).toBeGreaterThan(resolveEffectiveFullDuration(templateById.get('tpl_tempo_run')!, WEDNESDAY, null));
  });

  it.fails('symptoom B: de balk noemt de twee trainingen in dezelfde volgorde als Vandaag', () => {
    // De balk sorteert op duur, de langste eerst (WeekStrip.tsx); Vandaag volgt dayOrder. In de balk staat Benen A
    // bovenaan, op Vandaag de tempoloop.
    const today = orderDay(sessions, dayOrder(sessions, [], templateById)).map((s) => nameOf(s.templateId));
    const label = stripLabels(sessions, [], WEDNESDAY)[2];
    expect(label).toBe(`Woensdag (vandaag): ${today.map((n) => `${n}, gepland`).join(' en ')}`);
  });
});
