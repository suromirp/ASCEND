// Forge Afronden nawerk (backlog I-44 en I-45, Warden en Pathfinder 15 november). Nagemaakte trainingen en tijden.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionTemplate } from '../../models/training';
import { lastWorkMoment, tickAllRows, tickRow, toStrengthData, type WorkoutExercise } from '../../engine/forgeWorkout';
import { finishCompletedAt, finishDayChoices, finishDayDefault, nextPillLast, pillSlot, sessionIdentity } from '../../engine/forgeSession';
import { mergeDraft } from '../../engine/forgeInput';
import { toISODate } from '../../utils/dates';
import finishSrc from './FinishSheet.tsx?raw';
import pillSrc from './SessionPill.tsx?raw';

vi.mock('../Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../../state/AppDataContext', () => ({ useAppData: () => ({ templates: [], settings: {} }) }));

const { FinishSheet } = await import('./FinishSheet');
const { forgeLogInput } = await import('./forgeFinishLog');

const at = (iso: string) => Date.parse(iso);
const dayOf = (ms: number) => toISODate(new Date(ms));

afterEach(() => {
  vi.useRealTimers();
});

const plan = (n: number): WorkoutExercise[] => [
  {
    slot: 'a',
    exerciseId: 'a',
    name: 'Bankdrukken',
    known: true,
    restSec: 120,
    rows: Array.from({ length: n }, (_, i) => ({ id: `r${i}`, kind: 'work', target: { repsLow: 8, repsHigh: 10, weightKg: 60 }, done: false })),
  } as unknown as WorkoutExercise,
];

const template = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', exercises: [] } as unknown as SessionTemplate;
const finish = (workout: WorkoutExercise[], plannedSessionId?: string, scheduledDate?: string) =>
  renderToStaticMarkup(
    createElement(FinishSheet, {
      template,
      readOnly: false,
      workout,
      elapsedSeconds: 45 * 60,
      defaultMinutes: 60,
      ...(plannedSessionId ? { plannedSessionId } : {}),
      ...(scheduledDate ? { scheduledDate } : {}),
      onClose: () => undefined,
      onSave: async () => true,
    }),
  );
const pressed = (html: string) => [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map((m) => m[1]);

// Gepland ma 16, op ma 16 gedaan; wo 18 voor het afronden een set uit en weer aan (Warden punt 2).
const mon = at('2026-11-16T18:00:00Z');
const wed = at('2026-11-18T19:00:00Z');
function mondayThenRetick(): WorkoutExercise[] {
  let w = plan(3);
  w = tickRow(w, 'a', 'r0', mon).workout;
  w = tickRow(w, 'a', 'r1', mon + 180_000).workout;
  w = tickRow(w, 'a', 'r2', mon + 360_000).workout;
  w = tickRow(w, 'a', 'r1', wed).workout; // uit
  w = tickRow(w, 'a', 'r1', wed + 5_000).workout; // en weer aan
  return w;
}

describe('I-45. Een set opnieuw afvinken verzet de dag van Afronden niet', () => {
  it('opnieuw afgevinkt telt op de eerste keer: het laatste echte werk blijft maandag', () => {
    const w = mondayThenRetick();
    expect(lastWorkMoment(w)).toBe(mon + 360_000);
    const lastTickAt = lastWorkMoment(w)!;
    expect(finishDayDefault({ today: '2026-11-18', plannedSessionId: 'ps1', scheduledDate: '2026-11-16', lastTickAt, dayOf })).toBe('2026-11-16');
    expect(finishDayChoices({ today: '2026-11-18', scheduledDate: '2026-11-16', lastTickAt, dayOf })).toEqual(['2026-11-16', '2026-11-18']);
  });

  it('gerenderd: maandag staat aan, vandaag is te kiezen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-18T19:10:00Z'));
    const html = finish(mondayThenRetick(), 'ps1', '2026-11-16');
    expect(pressed(html)).toEqual(['ma 16 november']);
  });

  it('een nieuwe set op woensdag is wel nieuw werk: dan woensdag', () => {
    let w = plan(4);
    w = tickRow(w, 'a', 'r0', mon).workout;
    w = tickRow(w, 'a', 'r1', wed).workout;
    expect(dayOf(lastWorkMoment(w)!)).toBe('2026-11-18');
  });

  it('alles uit en weer aan met het vakje boven de kolom: ook dan de eerste keer', () => {
    let w = plan(2);
    w = tickAllRows(w, 'a', mon).workout;
    w = tickAllRows(w, 'a', wed).workout; // alles uit
    w = tickAllRows(w, 'a', wed + 1_000).workout; // alles aan
    expect(lastWorkMoment(w)).toBe(mon);
  });

  it('alleen afgevinkte rijen tellen, ook bij een beschadigd concept met een moment op een open rij', () => {
    const w = plan(2);
    const broken = [{ ...w[0], rows: [{ ...w[0].rows[0], done: true, doneAt: mon }, { ...w[0].rows[1], done: false, doneAt: wed, firstDoneAt: wed }] }] as WorkoutExercise[];
    expect(lastWorkMoment(broken)).toBe(mon);
    expect(lastWorkMoment(plan(2))).toBeUndefined();
  });

  it('het moment van de eerste keer komt niet in het log: SetLog.at blijft het moment van afvinken', () => {
    const sets = toStrengthData(mondayThenRetick())![0].sets;
    expect(sets.map((s) => s.at)).toEqual([new Date(mon).toISOString(), new Date(wed + 5_000).toISOString(), new Date(mon + 360_000).toISOString()]);
    expect(JSON.stringify(sets)).not.toContain('firstDoneAt');
  });

  it('FinishSheet leest het moment via de engine, niet zelf van elke rij', () => {
    expect(finishSrc).toContain('lastWorkMoment(workout)');
    expect(finishSrc).not.toMatch(/r\.doneAt/);
  });
});

describe('I-45. Het keuzeblad van de pil krijgt nooit een andere training', () => {
  const a = { pointer: { key: 'tpl_a' }, startedAt: 1 };
  const a2 = { pointer: { key: 'tpl_a' }, startedAt: 1, doneSets: 3 };
  const b = { pointer: { key: 'tpl_b' }, startedAt: 2 };
  const keyOf = sessionIdentity;

  it('A verwijderd en meteen B gestart terwijl het blad van A openstaat: het blad houdt A en zegt weg', () => {
    expect(pillSlot({ live: b, last: a, sheetOpen: true, keyOf })).toEqual({ session: a, gone: true });
  });

  it('een nieuwe stand van dezelfde training is geen andere training', () => {
    expect(pillSlot({ live: a2, last: a, sheetOpen: true, keyOf })).toEqual({ session: a2, gone: false });
  });

  it('dezelfde training opnieuw gestart (ander moment) is een andere sessie', () => {
    expect(sessionIdentity({ pointer: { key: 'tpl_a' }, startedAt: 1 })).not.toBe(sessionIdentity({ pointer: { key: 'tpl_a' }, startedAt: 5 }));
  });

  it('blad dicht: gewoon de live training', () => {
    expect(pillSlot({ live: b, last: a, sheetOpen: false, keyOf })).toEqual({ session: b, gone: false });
  });

  it('de pil en het keuzeblad hebben de sleutel van de sessie', () => {
    expect(pillSrc).toContain('<SessionPill key={sessionIdentity(slot.session)}');
    expect(pillSrc).toContain('<SessionChoiceSheet key={sessionIdentity(session)}');
  });
});

describe('I-44. De dagknoppen bij Gedaan op zijn de primitive Chip', () => {
  it('gerenderd als st-chip, stil (Opslaan is het accent), minstens 44 px via de klasse', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-17T19:00:00Z'));
    let w = plan(1);
    w = tickRow(w, 'a', 'r0', at('2026-11-17T18:40:00Z')).workout;
    const html = finish(w, 'ps1', '2026-11-16');
    const chips = [...html.matchAll(/<button[^>]*class="st-chip quiet"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(chips).toEqual(['ma 16 november', 'vandaag']);
    expect(finishSrc).not.toMatch(/rounded-full border px-3/);
  });
});

describe('I-45. Reviewer: de plek van de pil en het concept', () => {
  const a = { pointer: { key: 'tpl_a' }, startedAt: 1 };
  const a2 = { pointer: { key: 'tpl_a' }, startedAt: 1, doneSets: 3 };
  const b = { pointer: { key: 'tpl_b' }, startedAt: 2 };
  const keyOf = sessionIdentity;

  it('een reeks: blad open op A, B komt, blad dicht, A2 nooit meer', () => {
    // Blad open op A, A krijgt een nieuwe stand: die neemt hij over.
    let last = nextPillLast({ live: a2, last: a, sheetOpen: true, keyOf });
    expect(last).toBe(a2);
    // B start terwijl het blad openstaat: de plek houdt A, en het blad zegt weg.
    last = nextPillLast({ live: b, last, sheetOpen: true, keyOf });
    expect(last).toBe(a2);
    expect(pillSlot({ live: b, last, sheetOpen: true, keyOf })).toEqual({ session: a2, gone: true });
    // Blad dicht: nu B.
    last = nextPillLast({ live: b, last, sheetOpen: false, keyOf });
    expect(last).toBe(b);
    expect(pillSlot({ live: b, last, sheetOpen: false, keyOf })).toEqual({ session: b, gone: false });
    // Geen live sessie: de laatste stand blijft (voor een open blad).
    expect(nextPillLast({ live: undefined, last: b, sheetOpen: true, keyOf })).toBe(b);
  });

  it('de component gebruikt deze stap', () => {
    expect(pillSrc).toContain('nextPillLast({ live: session, last, sheetOpen, keyOf: sessionIdentity })');
  });

  it('een oefening met alleen uitgezette sets houdt firstDoneAt bij een nieuw plan en na opslaan en herladen', () => {
    let w = plan(2);
    w = tickRow(w, 'a', 'r0', mon).workout;
    w = tickRow(w, 'a', 'r0', wed).workout; // weer uit
    const stored = JSON.parse(JSON.stringify(w)) as WorkoutExercise[];
    const merged = mergeDraft(stored, plan(2));
    expect(merged[0].rows[0].firstDoneAt).toBe(mon);
    const again = tickRow(merged, 'a', 'r0', wed + 60_000).workout;
    expect(lastWorkMoment(again)).toBe(mon);
  });
});

describe('Onderhoud 15 november: completedAt hoort bij de gekozen dag', () => {
  const base = { template, variant: 'full' as const, readOnly: false, plannedSessionId: 'ps1', plannedStill: true, gymProfileId: 'g1', forgeLog: [] };
  const extra = (doneOn: string) => ({ minutes: 50, pain: [], notes: '', doneOn });

  it('beendag maandagavond, woensdagochtend afgerond op maandag: het tijdstip van de laatste set', () => {
    let w = plan(2);
    w = tickRow(w, 'a', 'r0', mon).workout;
    w = tickRow(w, 'a', 'r1', mon + 600_000).workout;
    const input = forgeLogInput({ ...base, extra: extra('2026-11-16'), workout: w, now: at('2026-11-18T07:00:00Z') });
    expect(input.completedDate).toBe('2026-11-16');
    expect(input.completedAt).toBe(new Date(mon + 600_000).toISOString());
  });

  it('een eerdere dag zonder set op die dag: 12:00 op die dag, niet nu', () => {
    let w = plan(1);
    w = tickRow(w, 'a', 'r0', wed).workout; // set op woensdag, gekozen maandag
    const now = at('2026-11-18T20:00:00Z');
    const input = forgeLogInput({ ...base, extra: extra('2026-11-16'), workout: w, now });
    expect(input.completedAt).toBe(new Date('2026-11-16T12:00:00').toISOString());
    expect(dayOf(Date.parse(input.completedAt!))).toBe('2026-11-16');
  });

  it('vandaag: het moment van opslaan, zoals altijd', () => {
    const now = at('2026-11-18T20:00:00Z');
    let w = plan(1);
    w = tickRow(w, 'a', 'r0', now - 60_000).workout;
    expect(forgeLogInput({ ...base, extra: extra('2026-11-18'), workout: w, now }).completedAt).toBe(new Date(now).toISOString());
  });

  it('nooit in de toekomst en nooit een dag naast completedDate, over vijf tijdzones en een week dagen', () => {
    const now = at('2026-11-18T09:30:00Z');
    for (let back = 0; back <= 7; back++) {
      for (const tickBack of [undefined, 0, 1, 2, 3]) {
        const today = dayOf(now);
        const d = new Date(now);
        d.setDate(d.getDate() - back);
        const doneOn = toISODate(d);
        const lastWorkAt = tickBack === undefined ? undefined : now - tickBack * 86_400_000 - 3_600_000;
        const iso = finishCompletedAt({ doneOn, today, now, ...(lastWorkAt !== undefined ? { lastWorkAt } : {}), dayOf });
        expect(Date.parse(iso)).toBeLessThanOrEqual(now);
        expect(dayOf(Date.parse(iso))).toBe(doneOn);
      }
    }
  });
});
