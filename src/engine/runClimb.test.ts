import { describe, expect, it } from 'vitest';
import { climbScale, runClimb, withClimbScale } from './runClimb';
import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { ActivityDetail } from '../models/activityDetail';

// Nagemaakte lopen (I-77): een getal van het horloge op het log en een eigen telling per km.
const km = (index: number, gainM: number | undefined, lossM?: number): RunKm =>
  ({ index, startM: (index - 1) * 1000, endM: index * 1000, distanceM: 1000, sec: 360, paceSecKm: 360, ...(gainM !== undefined ? { gainM } : {}), ...(lossM !== undefined ? { lossM } : {}) }) as RunKm;

function runDetail(gains: (number | undefined)[], counter?: number): RunDetail {
  return {
    version: 1,
    ...(counter !== undefined ? { counter } : {}),
    wholeKm: gains.length,
    wholeMinutes: gains.length * 6,
    builtAt: '2026-01-01T00:00:00.000Z',
    totalM: gains.length * 1000,
    movingSec: gains.length * 360,
    pauseSec: 0,
    kms: gains.map((g, i) => km(i + 1, g, g)),
    line: { n: 0, distM: [], timeSec: [] },
  } as unknown as RunDetail;
}

function detail(ownGainM: number, watchGainM: number | undefined, counter?: number): ActivityDetail {
  return {
    version: 1,
    ...(counter !== undefined ? { counter } : {}),
    source: 'garmin',
    sliceCount: 1,
    slices: [{ sec: 600, distanceM: 1000, gainM: ownGainM, lossM: ownGainM }],
    stretches: [],
    movingSec: 600,
    quality: { heartRateCoveragePct: 100, ...(watchGainM && watchGainM > 0 ? { gainAgreementPct: Math.round((ownGainM / watchGainM) * 100) } : {}) },
  } as unknown as ActivityDetail;
}

function log(o: { watch?: number; watchLoss?: number; kms?: (number | undefined)[]; counter?: number; noDetail?: boolean }): SessionLog {
  const kms = o.kms ?? [];
  const own = kms.reduce<number>((n, g) => n + (g ?? 0), 0);
  return {
    id: 'log_a',
    templateId: 'tpl_long_run',
    type: 'cardio',
    sport: 'running',
    completedDate: '2026-01-10',
    completedAt: '2026-01-10T08:00:00.000Z',
    variant: 'custom',
    durationMinutes: kms.length * 6 || 40,
    cardioData: {
      durationMinutes: kms.length * 6 || 40,
      distanceKm: kms.length || 7,
      ...(o.watch !== undefined ? { elevationGainM: o.watch } : {}),
      ...(o.watchLoss !== undefined ? { elevationLossM: o.watchLoss } : {}),
      source: 'garmin',
    },
    source: 'garmin',
    ...(kms.length > 0 ? { runDetail: runDetail(kms, o.counter) } : {}),
    ...(kms.length > 0 && !o.noDetail ? { detail: detail(own, o.watch, o.counter) } : {}),
  } as SessionLog;
}

describe('één getal voor de stijging van een loop', () => {
  it('het getal van het horloge is het totaal, ook als de eigen telling van de km lager uitvalt', () => {
    // Een oude telling (zonder merk) telde elke klim te laag: 85 tegen 130.
    expect(runClimb(log({ watch: 130, kms: [20, 15, 10, 20, 20] }))).toEqual({ gainM: 130, from: 'log' });
  });

  it('een 0 van het horloge is geen meting: dan de eigen telling', () => {
    expect(runClimb(log({ watch: 0, kms: [10, 10, 10] }))).toEqual({ gainM: 30, from: 'own' });
  });

  it('een eigen telling ver boven het horloge, met het merk van nu: dan de eigen telling', () => {
    expect(runClimb(log({ watch: 40, kms: [40, 40, 40], counter: 2 }))).toEqual({ gainM: 120, from: 'own' });
  });

  it('vlak: een eigen telling ruim boven het horloge maar minder dan 20 m verschil houdt het horloge', () => {
    expect(runClimb(log({ watch: 25, kms: [14, 14, 12], counter: 2 }))).toEqual({ gainM: 25, from: 'log' });
  });

  it('I-33: vijf vlakke lopen en een heuvelloop met de teller van nu houden allemaal hun horlogegetal', () => {
    // Nagemaakt naar de verhoudingen uit een echte reeks (afgerond): eigen telling tegen horloge.
    const runs: [number[], number][] = [[[10, 10, 10, 10], 30], [[10, 10, 10, 10], 25], [[5, 5, 5], 20], [[10, 10, 10], 20], [[5, 5, 5, 5], 30], [[15, 15, 15, 15, 15, 15, 15, 20], 135]];
    for (const [kms, watch] of runs) expect(runClimb(log({ watch, kms, counter: 2 }))).toEqual({ gainM: watch, from: 'log' });
  });

  it('zonder horlogegetal de eigen telling, zonder beide niets', () => {
    expect(runClimb(log({ kms: [5, 5] }))).toEqual({ gainM: 10, from: 'own' });
    expect(runClimb(log({}))).toBeUndefined();
  });

  it('een log zonder reeks houdt het getal dat erop staat', () => {
    expect(runClimb(log({ watch: 60 }))).toEqual({ gainM: 60, from: 'log' });
  });
});

describe('de km volgen het totaal', () => {
  it('de km tellen samen op tot het getal van het horloge', () => {
    const l = log({ watch: 130, watchLoss: 130, kms: [20, 15, 10, 20, 20] });
    const shown = withClimbScale(l.runDetail!, climbScale(l));
    const sum = shown.kms.reduce((n, k) => n + (k.gainM ?? 0), 0);
    expect(Math.abs(sum - 130)).toBeLessThanOrEqual(0.5);
    // De verhouding tussen de km blijft.
    expect(shown.kms[0].gainM! / shown.kms[2].gainM!).toBeCloseTo(2, 1);
    // De opgeslagen km blijven zoals ze waren (historie).
    expect(l.runDetail!.kms[0].gainM).toBe(20);
  });

  it('totaal en som van de km liggen nooit meer dan 10 procent uit elkaar', () => {
    for (const l of [
      log({ watch: 130, kms: [20, 15, 10, 20, 20] }),
      log({ watch: 0, kms: [10, 10, 10] }),
      log({ watch: 40, kms: [40, 40, 40], counter: 2 }),
      log({ watch: 25, kms: [14, 14, 12], counter: 2 }),
      log({ watch: 22, kms: [1, 1, 1, 1], noDetail: true }),
    ]) {
      const total = runClimb(l)!.gainM;
      const sum = withClimbScale(l.runDetail!, climbScale(l)).kms.reduce((n, k) => n + (k.gainM ?? 0), 0);
      expect(Math.abs(sum - total)).toBeLessThanOrEqual(total * 0.1 + 0.5);
    }
  });

  it('de daling volgt de daling van het horloge, alleen als het horloge geldt', () => {
    const l = log({ watch: 130, watchLoss: 100, kms: [20, 15, 10, 20, 20] });
    const shown = withClimbScale(l.runDetail!, climbScale(l));
    expect(Math.round(shown.kms.reduce((n, k) => n + (k.lossM ?? 0), 0))).toBe(100);
    const own = log({ watch: 40, watchLoss: 40, kms: [40, 40, 40], counter: 2 });
    expect(climbScale(own)).toEqual({ gain: 1, loss: 1 });
  });

  it('zonder eigen stijging of zonder getal van het horloge verandert er niets', () => {
    expect(climbScale(log({ watch: 30, kms: [0, 0, 0] })).gain).toBe(1);
    expect(climbScale(log({ kms: [5, 5] }))).toEqual({ gain: 1, loss: 1 });
    expect(climbScale(log({ watch: 30, kms: [undefined, undefined] })).gain).toBe(1);
  });

  it('ook de rondes en de beste 5 km', () => {
    const l = log({ watch: 130, kms: [20, 15, 10, 20, 20] });
    const rd = { ...l.runDetail!, laps: [{ ...km(1, 40), kind: 'work' }], bestFive: { startM: 0, endM: 5000, startSec: 0, sec: 1800, kms: [km(1, 20)] } } as unknown as RunDetail;
    const shown = withClimbScale(rd, climbScale(l));
    expect(shown.laps![0].gainM).toBeCloseTo(40 * (130 / 85), 0);
    expect(shown.bestFive!.kms[0].gainM).toBeCloseTo(20 * (130 / 85), 0);
  });
});
