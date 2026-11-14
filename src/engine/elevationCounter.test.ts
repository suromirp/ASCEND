import { describe, expect, it } from 'vitest';
import { buildActivityDetail } from './activityDetail';
import { ELEVATION_COUNTER } from './elevation';
import { buildRunDetail } from './runDetail';
import { trimLog, undoTrim } from './trimLog';
import { kmPieces } from './zone2Pieces';
import { ZONE2_RULES as R } from './zone2Rules';
import { runLog } from './fixtures/runLogs';
import { makeStreams } from './fixtures/runStreams';
import { migrateLogDetail, migrateLogRunDetail } from '../storage/migrations';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { SessionLog } from '../models/training';

// Het merk van de teller op een log (besluit 2026-11-12-hoogtemeters-teller-op-log.md).
// Alleen nagemaakte reeksen.

const spec = { minutes: 40, pace: 330, hr: 145, seed: 3 };
const streams = makeStreams(spec);

describe('het merk van de teller op een nieuw log', () => {
  it('staat op een nieuw profiel en op nieuwe kilometers', () => {
    expect(ELEVATION_COUNTER).toBe(2);
    expect(buildActivityDetail(streams, { source: 'garmin' })!.counter).toBe(2);
    expect(buildRunDetail(streams, { logKm: 7.3, logMinutes: 40, builtAt: '2026-11-12T10:00:00.000Z' })!.counter).toBe(2);
  });

  it('komt op kilometers die opnieuw worden berekend na een wijziging bij de bron', () => {
    // Hetzelfde pad als storage/activityDetail.ts: andere totalen, dus opnieuw bouwen.
    const again = buildRunDetail(streams, { logKm: 7.1, logMinutes: 39, builtAt: '2026-11-13T10:00:00.000Z' })!;
    expect(again.counter).toBe(2);
  });

  it('komt op het profiel na inkorten, en het oude profiel komt zonder merk terug', () => {
    const log = runLog({ id: 'cut', date: '2026-10-10', spec });
    // Een log van voor de teller: het profiel heeft geen merk.
    const { counter: _c, ...oldDetail } = log.detail!;
    void _c;
    const old: SessionLog = { ...log, detail: oldDetail };
    const cut = trimLog(old, streams, 120, 2000, new Date('2026-11-12T10:00:00.000Z'))!;
    expect(cut.detail!.counter).toBe(2);
    expect(cut.trim!.original.detail).toEqual(oldDetail);
    const back = undoTrim(cut);
    expect(back.detail).toEqual(oldDetail);
    expect('counter' in back.detail!).toBe(false);
  });
});

describe('vlak bij zone 2: de grens hoort bij de telling', () => {
  const km = (i: number, over: Partial<RunKm> = {}): RunKm => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: 330, paceSecKm: 330, gapSecKm: 320, hrAvg: 140, gainM: 0, lossM: 0, ...over }) as RunKm;
  // Zes kilometers met elk 7 m op en 7 m af: boven de oude grens van 5, onder de nieuwe van 10.
  const kms = [0, 1, 2, 3, 4, 5].map((i) => km(i, { gainM: 7, lossM: 7 }));

  it('heeft de twee grenzen', () => {
    expect(R.flatMetresPerKm).toBe(5);
    expect(R.flatMetresPerKmCounted).toBe(10);
  });

  it('een oud log (zonder merk) telt met 5 m: 7 m per km is niet vlak, het gecorrigeerde tempo geldt', () => {
    const pieces = kmPieces({ kms });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].flat).toBe(false);
    expect(pieces[0].paceSecKm).toBe(320);
  });

  it('een nieuw log (merk 2) telt met 10 m: 7 m per km is vlak, het echte tempo geldt', () => {
    const pieces = kmPieces({ kms, counter: 2 });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].flat).toBe(true);
    expect(pieces[0].paceSecKm).toBe(330);
  });

  it('een nieuw log met 10 m of meer per km is ook met de nieuwe grens niet vlak', () => {
    const steep = kms.map((k) => ({ ...k, gainM: 10, lossM: 10 }));
    expect(kmPieces({ kms: steep, counter: 2 })[0].flat).toBe(false);
  });

  it('een merk dat de app niet kent krijgt de strengste grens (5 m), zoals een log zonder merk', () => {
    const odd = { kms, counter: 7 } as unknown as Pick<RunDetail, 'kms' | 'counter'>;
    expect(kmPieces(odd)[0].flat).toBe(false);
  });
});

describe('het merk in een back-up: heen en terug', () => {
  const fresh = runLog({ id: 'new', date: '2026-11-12', spec });
  const rd = buildRunDetail(streams, { logKm: 7.3, logMinutes: 40, builtAt: '2026-11-12T10:00:00.000Z' })!;
  const read = (log: SessionLog): SessionLog => migrateLogRunDetail(migrateLogDetail(JSON.parse(JSON.stringify(log)) as SessionLog));

  it('een nieuw log houdt het merk op profiel en kilometers', () => {
    const back = read({ ...fresh, runDetail: rd });
    expect(back.detail).toEqual(fresh.detail);
    expect(back.detail!.counter).toBe(2);
    expect(back.runDetail).toEqual(rd);
    expect(back.runDetail!.counter).toBe(2);
  });

  it('een oude back-up zonder merk blijft importeerbaar en krijgt er geen', () => {
    const { counter: _a, ...oldDetail } = fresh.detail!;
    const { counter: _b, ...oldRd } = rd;
    void _a;
    void _b;
    const back = read({ ...fresh, detail: oldDetail, runDetail: oldRd });
    expect(back.detail).toEqual(oldDetail);
    expect('counter' in back.detail!).toBe(false);
    expect(back.runDetail).toEqual(oldRd);
    expect('counter' in back.runDetail!).toBe(false);
  });

  it('een merk in het profiel dat geen 2 is wordt niet bewaard; de rest van het profiel wel', () => {
    const odd = { ...fresh, detail: { ...fresh.detail!, counter: 'x' } } as unknown as SessionLog;
    const back = read(odd);
    expect(back.detail!.slices).toEqual(fresh.detail!.slices);
    expect('counter' in back.detail!).toBe(false);
  });
});
