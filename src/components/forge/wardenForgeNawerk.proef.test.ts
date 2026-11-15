// Proeftests van Warden bij Forge Afronden nawerk (I-44, I-45, completedAt). Nagemaakte trainingen en tijden.
// Draai per tijdzone: TZ=Europe/Lisbon npx vitest run src/components/forge/wardenForgeNawerk.proef.test.ts
// (ook Europe/Amsterdam, Pacific/Auckland, America/Los_Angeles, Asia/Kolkata). De tijdzone komt van buiten.
import { describe, expect, it } from 'vitest';
import type { SessionTemplate } from '../../models/training';
import { lastWorkMoment, tickAllRows, tickRow, type WorkoutExercise } from '../../engine/forgeWorkout';
import { finishCompletedAt, nextPillLast, pillSlot, sessionIdentity } from '../../engine/forgeSession';
import { mergeDraft } from '../../engine/forgeInput';
import { addDays, toISODate } from '../../utils/dates';
import { forgeLogInput } from './forgeFinishLog';

const dayOf = (ms: number) => toISODate(new Date(ms));
const local = (s: string) => new Date(s).getTime(); // zonder Z: de tijd van de telefoon

const plan = (n: number): WorkoutExercise[] => [
  { slot: 'a', exerciseId: 'a', name: 'Bankdrukken', known: true, restSec: 120, rows: Array.from({ length: n }, (_, i) => ({ id: `r${i}`, kind: 'work', target: { repsLow: 8, repsHigh: 10, weightKg: 60 }, reps: 8, weightKg: 60, done: false })) } as unknown as WorkoutExercise,
];
const template = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', exercises: [] } as unknown as SessionTemplate;
const base = { template, variant: 'full' as const, readOnly: false, plannedSessionId: 'ps1', plannedStill: true, gymProfileId: 'g1', forgeLog: [] };
const extra = (doneOn: string) => ({ minutes: 50, pain: [], notes: '', doneOn });

describe('finishCompletedAt: randen in de tijdzone van de telefoon', () => {
  // Momenten rond middernacht en rond elke klokwissel van 2026 (Europa, VS, Nieuw-Zeeland), plus gewone dagen.
  const days = ['2026-03-08', '2026-03-29', '2026-04-05', '2026-09-27', '2026-10-25', '2026-11-01', '2026-11-15', '2026-12-31', '2027-01-01'];
  const clocks = ['00:00:00', '00:00:30', '00:59:59', '01:30:00', '02:30:00', '03:00:01', '11:59:59', '12:00:00', '12:00:01', '23:59:30'];
  const nows = days.flatMap((d) => clocks.map((c) => local(`${d}T${c}`))).filter(Number.isFinite);

  it('nooit later dan nu, nooit een andere dag dan completedDate, en het moment van de set als die op de dag viel', () => {
    let n = 0;
    for (const now of nows) {
      const today = dayOf(now);
      for (let back = 0; back <= 3; back++) {
        const doneOn = addDays(today, -back);
        const works = [undefined, now - 1, now - 30_000, now - 3_600_000, now - 86_400_000, now - 2 * 86_400_000 - 1_800_000, now + 60_000, Number.NaN, local(`${doneOn}T00:00:00`), local(`${doneOn}T23:59:59`)];
        for (const lastWorkAt of works) {
          const iso = finishCompletedAt({ doneOn, today, now, ...(lastWorkAt !== undefined ? { lastWorkAt } : {}), dayOf });
          const ms = Date.parse(iso);
          expect(Number.isFinite(ms)).toBe(true);
          expect(ms, `${iso} nu ${new Date(now).toISOString()}`).toBeLessThanOrEqual(now);
          expect(dayOf(ms), `${doneOn} ${iso}`).toBe(doneOn);
          if (back > 0 && lastWorkAt !== undefined && Number.isFinite(lastWorkAt) && lastWorkAt <= now && dayOf(lastWorkAt) === doneOn) expect(ms).toBe(lastWorkAt);
          if (back === 0) expect(ms).toBe(now);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(3000);
  });

  it('het blad om 23:59 geopend en om 00:00:30 opgeslagen: het log van gisteren krijgt de laatste set, niet nu', () => {
    const tick = local('2026-11-14T23:40:00');
    const w = tickRow(plan(1), 'a', 'r0', tick).workout;
    const input = forgeLogInput({ ...base, extra: extra('2026-11-14'), workout: w, now: local('2026-11-15T00:00:30') });
    expect(input.completedAt).toBe(new Date(tick).toISOString());
    expect(dayOf(Date.parse(input.completedAt!))).toBe(input.completedDate);
  });

  it('afvinken zonder sets over middernacht: 12:00 op de gekozen dag', () => {
    const input = forgeLogInput({ ...base, readOnly: true, extra: extra('2026-11-14'), workout: plan(1), now: local('2026-11-15T00:00:30') });
    expect(input.completedAt).toBe(new Date(local('2026-11-14T12:00:00')).toISOString());
  });

  it('een ongeldige dag valt terug op nu, nooit op een ongeldige tijd', () => {
    const now = local('2026-11-15T10:00:00');
    expect(finishCompletedAt({ doneOn: '', today: '2026-11-15', now, dayOf })).toBe(new Date(now).toISOString());
    expect(finishCompletedAt({ doneOn: '2026-02-31', today: '2026-11-15', now, dayOf })).toBe(new Date(Math.min(now, local('2026-02-31T12:00:00') || now)).toISOString());
  });

  it('ROOD NU (moet 1): sets op maandagavond en één na middernacht, maandag gekozen: de laatste set van maandag, niet 12:00', () => {
    let w = plan(3);
    const mon1 = local('2026-11-16T22:50:00');
    const mon2 = local('2026-11-16T23:40:00');
    w = tickRow(w, 'a', 'r0', mon1).workout;
    w = tickRow(w, 'a', 'r1', mon2).workout;
    w = tickRow(w, 'a', 'r2', local('2026-11-17T00:10:00')).workout;
    const input = forgeLogInput({ ...base, extra: extra('2026-11-16'), workout: w, now: local('2026-11-17T00:20:00') });
    expect(input.completedAt).toBe(new Date(mon2).toISOString());
  });

  it('ROOD NU (moet 2): een log van gisteren dat na een back-up van vanochtend is afgerond telt als nieuw sinds die back-up', () => {
    const w = tickRow(plan(1), 'a', 'r0', local('2026-11-14T19:00:00')).workout;
    const lastExportedAt = new Date(local('2026-11-15T08:00:00')).toISOString();
    const input = forgeLogInput({ ...base, extra: extra('2026-11-14'), workout: w, now: local('2026-11-15T09:00:00') });
    // Zo tellen Today.tsx, GegevensSheets.tsx en backupPreview.ts "sinds je back-up".
    const since = [input].filter((l) => l.completedAt! > lastExportedAt).length;
    expect(since).toBe(1);
  });
});

describe('firstDoneAt blijft in het concept', () => {
  it('staat nergens in wat Afronden naar logSession stuurt, ook niet na uit en aan, alles uit en aan en een herladen concept', () => {
    let w = plan(3);
    w = tickAllRows(w, 'a', local('2026-11-14T19:00:00')).workout;
    w = tickAllRows(w, 'a', local('2026-11-15T09:00:00')).workout;
    w = tickAllRows(w, 'a', local('2026-11-15T09:00:05')).workout;
    w = tickRow(w, 'a', 'r1', local('2026-11-15T09:01:00')).workout;
    w = mergeDraft(JSON.parse(JSON.stringify(w)) as WorkoutExercise[], plan(3));
    expect(JSON.stringify(w)).toContain('firstDoneAt');
    const input = forgeLogInput({ ...base, extra: extra('2026-11-14'), workout: w, now: local('2026-11-15T09:05:00') });
    expect(JSON.stringify(input)).not.toContain('firstDoneAt');
    expect(input.strengthData![0].sets).toHaveLength(2);
  });
});

describe('twee tabbladen tegelijk', () => {
  type S = { pointer: { key: string }; startedAt: number; doneSets?: number };
  // De plek van de pil zoals SessionPillSlot hem tekent: de stap, dan de plek, tot de stand stilstaat.
  function slotOf(state: { last: S | undefined; sheetOpen: boolean }, live: S | undefined) {
    for (let i = 0; i < 5; i++) {
      const keep = nextPillLast({ live, last: state.last, sheetOpen: state.sheetOpen, keyOf: sessionIdentity });
      if (keep === state.last) break;
      state.last = keep;
      if (i === 4) throw new Error('de plek van de pil komt niet tot rust');
    }
    return pillSlot({ live, last: state.last ?? live, sheetOpen: state.sheetOpen, keyOf: sessionIdentity });
  }
  const a: S = { pointer: { key: 'ps_a' }, startedAt: 100 };
  const b: S = { pointer: { key: 'ps_b' }, startedAt: 200 };

  it('tab 1 heeft het keuzeblad van A open; tab 2 verwijdert A, start B, vinkt af, rondt B af en start A opnieuw', () => {
    const st = { last: a as S | undefined, sheetOpen: true };
    const seen: string[] = [];
    const steps: (S | undefined)[] = [a, { ...a, doneSets: 2 }, undefined, b, { ...b, doneSets: 1 }, undefined, { pointer: { key: 'ps_a' }, startedAt: 300 }];
    for (const live of steps) {
      const slot = slotOf(st, live)!;
      seen.push(`${sessionIdentity(slot.session)}:${slot.gone ? 'weg' : 'live'}`);
      // Het open blad toont nooit een andere sessie dan die waarvoor het openging.
      expect(sessionIdentity(slot.session)).toBe(sessionIdentity(a));
    }
    expect(seen.slice(2).every((s) => s.endsWith('weg'))).toBe(true);
    // Blad dicht: de pil is de live sessie (A opnieuw gestart is een andere sessie, met een eigen sleutel).
    st.sheetOpen = false;
    const after = slotOf(st, steps.at(-1))!;
    expect(after).toEqual({ session: steps.at(-1), gone: false });
    expect(sessionIdentity(after.session)).not.toBe(sessionIdentity(a));
  });

  it('blad dicht in tab 1 en niets live meer: geen pil, en een latere B is gewoon B', () => {
    const st = { last: a as S | undefined, sheetOpen: false };
    expect(slotOf(st, undefined)).toBeUndefined();
    expect(slotOf(st, b)).toEqual({ session: b, gone: false });
  });

  it('tab 2 zet woensdag een set uit en aan, tab 1 heeft nog de stand van maandag: beide stellen maandag voor', () => {
    const mon = local('2026-11-16T19:00:00');
    const wed = local('2026-11-18T08:00:00');
    const tab1 = tickRow(plan(2), 'a', 'r0', mon).workout;
    let tab2 = JSON.parse(JSON.stringify(tab1)) as WorkoutExercise[];
    tab2 = tickRow(tab2, 'a', 'r0', wed).workout;
    tab2 = tickRow(tab2, 'a', 'r0', wed + 5_000).workout;
    expect(dayOf(lastWorkMoment(tab1)!)).toBe('2026-11-16');
    expect(dayOf(lastWorkMoment(tab2)!)).toBe('2026-11-16');
    // Tab 1 herlaadt het concept dat tab 2 schreef.
    const reloaded = mergeDraft(JSON.parse(JSON.stringify(tab2)) as WorkoutExercise[], plan(2));
    expect(dayOf(lastWorkMoment(reloaded)!)).toBe('2026-11-16');
    const one = forgeLogInput({ ...base, extra: extra('2026-11-16'), workout: tab1, now: wed + 60_000 });
    const two = forgeLogInput({ ...base, extra: extra('2026-11-16'), workout: reloaded, now: wed + 90_000 });
    // Wie van de twee ook opslaat: hetzelfde tijdstip (logSession laat er hoogstens één door op plannedSessionId).
    expect(one.completedAt).toBe(two.completedAt);
    expect(one.completedAt).toBe(new Date(mon).toISOString());
  });
});
