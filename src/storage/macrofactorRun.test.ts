// "Alles verwerken" loopt altijd af. Alleen nagemaakte gegevens: het
// demoprogramma en verzonnen MacroFactor-trainingen.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { planMacroFactor } from '../engine/macrofactorLink';
import { isReady, openProposals, type ReadyProposal } from '../engine/macrofactorRun';
import type { MacroFactorExercise, MacroFactorSet, MacroFactorWorkout } from '../engine/macrofactorImport';
import type { ExerciseSetLog, SessionLog } from '../models/training';
import { SessionLogsRepo, wipeAllData } from './database';
import { enrichLog } from './macrofactor';
import { getRunState, resetRunForTests, runMacroFactor, subscribeRun, type RunDeps } from './macrofactorRun';

const { templates } = buildDefaultProgramData();

const fileEx = (name: string, logged: MacroFactorSet[]): MacroFactorExercise => {
  const sets = logged.filter((s) => s.kind !== 'warmup');
  return { name, sets, loggedSets: logged, top: sets[0] };
};
// Een verzonnen training per dag: een opwarmset en twee werksets met RIR.
const workout = (day: number): MacroFactorWorkout => {
  const date = `2026-10-${String(day).padStart(2, '0')}`;
  return {
    externalId: `macrofactor:${date}:proef b`, date, start: `${date}T18:00:00`, name: 'Proef B', durationSec: 3000, setCount: 3,
    exercises: [fileEx('Leg Press', [{ reps: 10, weightKg: 60, kind: 'warmup' }, { reps: 8, weightKg: 120, rir: 2 }, { reps: 8, weightKg: 120, rir: 1 }])],
  };
};
// Een log zoals hij vroeger werd opgeslagen: alleen de werksets, zonder RIR,
// en de cijfers overgenomen van MacroFactor (manualMeasured.strength).
const oldData: ExerciseSetLog[] = [{ exerciseId: 'mf_leg_press', exerciseName: 'Leg Press', sets: [{ reps: 8, weightKg: 120 }, { reps: 8, weightKg: 120 }] }];
const oldLog = (w: MacroFactorWorkout): SessionLog => ({
  id: `log_${w.date}`, templateId: 'tpl_lower_a', type: 'strength', completedDate: w.date, completedAt: `${w.date}T19:00:00.000Z`, variant: 'custom',
  durationMinutes: 50, source: 'manual', externalId: w.externalId, strengthData: oldData,
  manualMeasured: { at: `${w.date}T20:00:00.000Z`, values: { durationMinutes: 45 }, strength: { workoutId: w.externalId } } as SessionLog['manualMeasured'],
});

const workouts = [12, 13, 14, 15].map(workout);

async function proposals(): Promise<ReadyProposal[]> {
  return planMacroFactor(workouts, {}, [], [], templates, await SessionLogsRepo.getAll(), true, []).proposals.filter(isReady);
}

function deps(over: Partial<RunDeps> = {}): RunDeps & { refreshed: number } {
  const d = {
    refreshed: 0,
    logSession: async () => true,
    takeOver: async () => 0,
    announceSaved: () => undefined,
    refresh: async () => {
      d.refreshed++;
    },
    leads: true,
    left: 0,
    ...over,
  };
  return d;
}

describe('alles verwerken, aanvullen', () => {
  beforeEach(async () => {
    await wipeAllData();
    resetRunForTests();
    for (const w of workouts) await SessionLogsRepo.put(oldLog(w));
  });

  it('vult alle rijen aan, telt mee en eindigt met een duidelijke uitkomst', async () => {
    const rows = await proposals();
    expect(rows.map((r) => r.kind)).toEqual(['enrich', 'enrich', 'enrich', 'enrich']);
    const seen: number[] = [];
    const stop = subscribeRun(() => seen.push(getRunState().done));
    const d = deps();
    const end = await runMacroFactor(rows, d);
    stop();
    expect(end.status).toBe('done');
    expect(end.message).toBe('Verwerkt: 4 aangevuld met de herhalingen in reserve en de opwarmsets.');
    expect(seen).toEqual(expect.arrayContaining([1, 2, 3, 4]));
    expect(end.handled).toEqual(workouts.map((w) => w.externalId));
    // Eén keer verversen, aan het eind.
    expect(d.refreshed).toBe(1);
    const stored = await SessionLogsRepo.getAll();
    expect(stored.every((l) => l.strengthData![0].sets.length === 3 && l.strengthData![0].sets[0].kind === 'warmup')).toBe(true);
  });

  it('is na één keer klaar: geen nieuw voorstel om aan te vullen voor dezelfde log', async () => {
    await runMacroFactor(await proposals(), deps());
    expect(await proposals()).toEqual([]);
    // Ook de opslag zelf doet het niet nog eens.
    expect(await enrichLog(`log_${workouts[0].date}`, workouts[0])).toBe('already');
  });

  it('nog een keer tikken met de oude rijen doet niets dubbel', async () => {
    const rows = await proposals();
    await runMacroFactor(rows, deps());
    const after = JSON.stringify(await SessionLogsRepo.getAll());
    // De kaart laat de afgehandelde rijen weg, ook voor de app ververst heeft.
    expect(openProposals(rows, getRunState().handled)).toEqual([]);
    // En wie toch de oude lijst aanbiedt, krijgt niets dubbel.
    resetRunForTests();
    const again = await runMacroFactor(rows, deps());
    expect(again.message).toBe('Alles was al verwerkt.');
    expect(JSON.stringify(await SessionLogsRepo.getAll())).toBe(after);
  });

  it('twee tikken tegelijk zijn één ronde', async () => {
    const rows = await proposals();
    const a = runMacroFactor(rows, deps());
    const b = runMacroFactor(rows, deps());
    expect(b).toBe(a);
    expect((await a).message).toContain('4 aangevuld');
  });
});

describe('alles verwerken blijft nooit hangen', () => {
  beforeEach(async () => {
    await wipeAllData();
    resetRunForTests();
  });

  const newRows = (): ReadyProposal[] =>
    planMacroFactor(workouts.slice(0, 2), { 'proef b': 'tpl_lower_a' }, [], [], templates, [], true, ['proef b']).proposals.filter(isReady);

  it('een stap die geen antwoord geeft, stopt de ronde met een eerlijke melding', async () => {
    const rows = newRows();
    expect(rows.map((r) => r.kind)).toEqual(['new', 'new']);
    let calls = 0;
    const end = await runMacroFactor(rows, deps({
      stepTimeoutMs: 50,
      logSession: () => (++calls === 1 ? Promise.resolve(true) : new Promise<boolean>(() => undefined)),
    }));
    expect(end.status).toBe('stopped');
    expect(end.done).toBe(1);
    expect(end.message).toContain('(1 van 2), blijft bewaard');
    expect(getRunState().status).toBe('stopped');
  });

  it('zolang de stap die te lang duurde nog loopt, start er geen nieuwe ronde', async () => {
    const rows = newRows();
    let finish: (v: boolean) => void = () => undefined;
    let calls = 0;
    const slow = deps({
      stepTimeoutMs: 30,
      logSession: () => {
        calls++;
        return new Promise<boolean>((r) => {
          finish = r;
        });
      },
    });
    expect((await runMacroFactor(rows, slow)).status).toBe('stopped');
    const blocked = await runMacroFactor(rows, slow);
    expect(blocked.message).toContain('De vorige stap is nog bezig');
    expect(calls).toBe(1);
    finish(true);
    await new Promise((r) => setTimeout(r, 0));
    await runMacroFactor(rows, deps());
    expect(getRunState().status).not.toBe('running');
  });

  it('een fout stopt de ronde ook, zonder dat de knop blijft staan', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const end = await runMacroFactor(newRows(), deps({ logSession: () => Promise.reject(new Error('kapot')) }));
    spy.mockRestore();
    expect(end.status).toBe('stopped');
    expect(end.message).toContain('Er is niets veranderd.');
  });

  it('meldt het als een stap langer duurt dan normaal', async () => {
    const slow: boolean[] = [];
    const stop = subscribeRun(() => slow.push(getRunState().slow));
    await runMacroFactor(newRows(), deps({ slowAfterMs: 10, logSession: () => new Promise((r) => setTimeout(() => r(true), 40)) }));
    stop();
    expect(slow).toContain(true);
    expect(getRunState().slow).toBe(false);
  });

  it('een nieuwe log die er al staat (een eerdere tik die te lang duurde) wordt niet nog eens opgeslagen', async () => {
    const rows = newRows();
    await SessionLogsRepo.put({ ...oldLog(workouts[0]), manualMeasured: undefined, id: 'al_daar' });
    const saved: string[] = [];
    const end = await runMacroFactor(rows, deps({ logSession: async (draft) => (saved.push(draft.externalId!), true) }));
    expect(saved).toEqual([workouts[1].externalId]);
    expect(end.message).toBe('Verwerkt: 1 nieuw opgeslagen. 1 was al verwerkt.');
  });
});
