import { describe, it, expect } from 'vitest';
import {
  ELEVATION_THRESHOLD_M, NEARLY_FLAT_M, climbAndDescent, hysteresisLine, isNearlyFlat, modelThresholdM, smoothOverTime, watchLine,
} from './elevation';
import { ascentOf } from './routeGeometry';
import { composeSimple, proposalFacts, proposeRoutes } from './routePlanner';
import { similarRuns } from './runComparison';
import { buildRunDetail } from './runDetail';
import { context, runLog } from './fixtures/runLogs';
import { segmentRun } from './fixtures/testRun';
import { buildActivityDetail, deadBand } from './activityDetail';
import { SIX_RUNS, makeAltitude } from './fixtures/elevationSeries';
import { makeStreams } from './fixtures/runStreams';
import type { RouteFn, RoutePoint, RouteProposal } from '../models/route';
import type { RunDetail } from '../models/runDetail';
import type { SessionLog } from '../models/training';

// Alleen nagemaakte reeksen (src/engine/fixtures/elevationSeries.ts en runStreams.ts).

const ups = (line: number[]) => line.reduce((s, v, i) => (i > 0 && v > line[i - 1] ? s + v - line[i - 1] : s), 0);
const downs = (line: number[]) => line.reduce((s, v, i) => (i > 0 && v < line[i - 1] ? s + line[i - 1] - v : s), 0);

// De twee tellers van voor 12 november 2026, hier alleen om voor en na naast elkaar te leggen.
function oldAscentOf(ele: number[], band = 5): number {
  let total = 0;
  let anchor: number | undefined;
  for (const e of ele) {
    if (anchor === undefined) anchor = e;
    else if (e >= anchor + band) {
      total += e - anchor;
      anchor = e;
    } else if (e <= anchor - band) anchor = e;
  }
  return total;
}
const oldLogGain = (alt: number[]) => ups(deadBand(alt, 5));

describe('de teller: stijging en daling met hysterese', () => {
  it('telt een klim van precies de drempel, en niet een klim er net onder', () => {
    expect(climbAndDescent([100, 102], 2)).toEqual({ ascentM: 2, descentM: 0 });
    expect(climbAndDescent([100, 101.9], 2)).toEqual({ ascentM: 0, descentM: 0 });
    expect(climbAndDescent([100, 105, 100], 5)).toEqual({ ascentM: 5, descentM: 5 });
  });

  it('telt een zaagtand onder de drempel niet: dat is ruis', () => {
    const saw = Array.from({ length: 200 }, (_, i) => 100 + (i % 2) * 1.8);
    expect(climbAndDescent(saw, 2)).toEqual({ ascentM: 0, descentM: 0 });
    expect(climbAndDescent([10, 12, 10, 13, 11, 14], 5)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it('telt een lange klim met kleine dipjes van dal tot top, zonder de dipjes dubbel te tellen', () => {
    const climb = [100, 104, 103, 109, 108, 113, 112, 118, 117, 123, 122, 127];
    expect(climbAndDescent(climb, 5)).toEqual({ ascentM: 27, descentM: 0 });
    // De oude teller verloor het laatste stuk naar de top, onder zijn verspringende anker.
    expect(oldAscentOf(climb)).toBe(23);
  });

  it('telt vanaf het echte dal en tot de echte top: geen drempel kwijt per klim', () => {
    // Eerst 3 m zakken (onder de drempel), dan de klim: die begint in het dal op 97.
    expect(climbAndDescent([100, 97, 110], 5).ascentM).toBe(13);
    expect(oldAscentOf([100, 97, 110])).toBe(10);
    // Acht keer een helling van 30 m, punten om de 2,5 m: 240 m, niet minder.
    const reps: number[] = [];
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k <= 12; k++) reps.push(50 + 2.5 * k + (k % 3 === 1 ? 1.2 : 0));
      for (let k = 11; k >= 1; k--) reps.push(50 + 2.5 * k - (k % 4 === 2 ? 1 : 0));
    }
    reps.push(50);
    expect(climbAndDescent(reps, 5)).toEqual({ ascentM: 240, descentM: 240 });
    expect(oldAscentOf(reps)).toBeCloseTo(192.1, 1);
  });

  it('slaat een gat of een meting die geen getal is over en telt daarna verder', () => {
    const withHoles = [100, null, Number.NaN, 110, undefined, 105, Number.POSITIVE_INFINITY, 120];
    expect(climbAndDescent(withHoles, 2)).toEqual({ ascentM: 25, descentM: 5 });
    expect(climbAndDescent([null, undefined, Number.NaN], 2)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it('geeft nul bij één punt, bij een lege reeks en bij een vlakke reeks', () => {
    expect(climbAndDescent([123], 2)).toEqual({ ascentM: 0, descentM: 0 });
    expect(climbAndDescent([], 2)).toEqual({ ascentM: 0, descentM: 0 });
    expect(climbAndDescent([50, 50, 50, 50], 2)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it('telt bij alleen dalen alleen daling', () => {
    expect(climbAndDescent([300, 280, 281, 250, 249, 200], 5)).toEqual({ ascentM: 0, descentM: 100 });
  });

  it('telt elke stap bij een drempel van nul of een drempel die geen getal is', () => {
    expect(climbAndDescent([1, 2, 1, 3], 0)).toEqual({ ascentM: 3, descentM: 1 });
    expect(climbAndDescent([1, 2, 1, 3], Number.NaN)).toEqual({ ascentM: 3, descentM: 1 });
    expect(climbAndDescent([1, 2, 1, 3], -4)).toEqual({ ascentM: 3, descentM: 1 });
    // Ook als de reeks met dalen begint.
    expect(climbAndDescent([5, 3, 4], 0)).toEqual({ ascentM: 1, descentM: 2 });
    expect(climbAndDescent([5, 4, 3], 0)).toEqual({ ascentM: 0, descentM: 2 });
    expect(climbAndDescent([5, 5, 4, 4, 6], 0)).toEqual({ ascentM: 2, descentM: 1 });
  });
});

describe('de lijn bij de teller', () => {
  it('telt per stap hetzelfde op als de teller over het geheel', () => {
    for (const { spec } of SIX_RUNS) {
      const { altitudeM } = makeAltitude(spec);
      for (const threshold of [2, 5, 10]) {
        const whole = climbAndDescent(altitudeM, threshold);
        const line = hysteresisLine(altitudeM, threshold);
        expect(line).toHaveLength(altitudeM.length);
        expect(ups(line)).toBeCloseTo(whole.ascentM, 6);
        expect(downs(line)).toBeCloseTo(whole.descentM, 6);
      }
    }
  });

  it('loopt binnen een klim alleen omhoog en blijft vlak in ruis', () => {
    expect(hysteresisLine([100, 104, 103, 109, 108, 113], 5)).toEqual([100, 104, 104, 109, 109, 113]);
    expect(hysteresisLine([100, 101, 99, 101, 100], 5)).toEqual([100, 100, 100, 100, 100]);
  });

  it('houdt in een gat de laatste waarde vast en is nul zonder metingen', () => {
    expect(hysteresisLine([null, 100, null, 110, Number.NaN], 5)).toEqual([100, 100, 100, 110, 110]);
    expect(hysteresisLine([null, null], 5)).toEqual([0, 0]);
    expect(hysteresisLine([], 5)).toEqual([]);
    expect(hysteresisLine([42], 5)).toEqual([42]);
  });
});

describe('gladmaken van een horlogereeks', () => {
  it('middelt over het venster, laat een gat een gat en kijkt niet over een pauze heen', () => {
    const t = [0, 1, 2, 3, 4, 100, 101, 102];
    const v = [10, 10, null, 10, 10, 50, 50, 50];
    const out = smoothOverTime(v, t, 15);
    expect(out[2]).toBeNull();
    expect(out[4]).toBe(10);
    expect(out[5]).toBe(50);
  });

  it('maakt niet glad als een tijdstip geen getal is: de reeks gaat ongewijzigd door', () => {
    expect(smoothOverTime([10, null, 30], [0, Number.NaN, 2], 15)).toEqual([10, null, 30]);
    expect(smoothOverTime([10, 20, 30], [0, 1], 15)).toEqual([10, 20, 30]);
    expect(smoothOverTime([10, 20, 30], [0, 1, 2], 0)).toEqual([10, 20, 30]);
  });

  it('wat het gladmaken kost op iets korts en steils: een bult van 6 m in 10 s verdwijnt', () => {
    // Een driehoek: `half` seconden omhoog naar `h` meter en even lang omlaag, op vlak terrein.
    const bump = (h: number, half: number) => {
      const t = Array.from({ length: 240 }, (_, i) => i);
      const alt = t.map((i) => 100 + (i >= 100 && i <= 100 + 2 * half ? h * (1 - Math.abs(i - 100 - half) / half) : 0));
      return { raw: climbAndDescent(alt, 2).ascentM, counted: ups(watchLine(alt, t)) };
    };
    // Trap of brug: ruw 6 m, na gladmaken over 30 s niets.
    expect(bump(6, 10)).toEqual({ raw: 6, counted: 0 });
    // 6 m in 20 s: 3,7 m. 10 m in 20 s: 6,1 m.
    expect(bump(6, 20).counted).toBeCloseTo(3.7, 1);
    expect(bump(10, 20).counted).toBeCloseTo(6.1, 1);
  });

  it('maakt van sprongen van een seconde geen hoogtemeters', () => {
    // Elke seconde 1,5 m op en neer: ruw gaat dat ver over de drempel van 2 m heen.
    const t = Array.from({ length: 600 }, (_, i) => i);
    const jumpy = t.map((i) => 100 + (i % 2 === 0 ? 1.5 : -1.5));
    expect(climbAndDescent(jumpy, ELEVATION_THRESHOLD_M.watch).ascentM).toBeGreaterThan(800);
    expect(ups(watchLine(jumpy, t))).toBe(0);
  });
});

describe('de drempel per bron en vrijwel vlak', () => {
  it('heeft de vaste drempels uit het besluit', () => {
    expect(ELEVATION_THRESHOLD_M).toEqual({ watch: 2, lidar: 2, model30: 5, mountain: 10 });
    expect(NEARLY_FLAT_M).toBe(40);
  });

  it('kiest voor een model van 30 m 5 m, en 10 m in de bergen', () => {
    expect(modelThresholdM([10, 60, 120])).toBe(5);
    expect(modelThresholdM([900, 1100, 1200])).toBe(10);
    expect(modelThresholdM([null, undefined])).toBe(5);
  });

  it('noemt alles onder 40 m vrijwel vlak, ook een getal dat geen getal is', () => {
    expect(isNearlyFlat(0)).toBe(true);
    expect(isNearlyFlat(39.9)).toBe(true);
    expect(isNearlyFlat(40)).toBe(false);
    expect(isNearlyFlat(Number.NaN)).toBe(true);
  });

  it('zet onder 40 m geen getal in de regel van een lus', () => {
    const p = (ascentM: number): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [], distanceM: 7000, ascentM, repeatedShare: 0 });
    expect(proposalFacts(p(36))).toBe('7 km · vrijwel vlak');
    expect(proposalFacts(p(40))).toBe('7 km · 40 hoogtemeters');
    expect(proposalFacts(p(238))).toBe('7 km · 240 hoogtemeters');
  });

  it('noemt een lus nooit vrijwel vlak als de training hoogtemeters vraagt', () => {
    const p = (ascentM: number): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [], distanceM: 7000, ascentM, repeatedShare: 0, targetAscentM: 30 });
    expect(proposalFacts(p(36))).toBe('7 km · 40 hoogtemeters');
    expect(proposalFacts(p(12))).toBe('7 km · 10 hoogtemeters');
    expect(proposalFacts(p(0))).toBe('7 km · 0 hoogtemeters');
  });

  it('geeft het doel in hoogtemeters mee aan elke lus, en niet bij een vlakke training', async () => {
    // Een rechte lijn heen en terug over vlak terrein, zoals een routeplanner hem teruggeeft.
    const route: RouteFn = async (waypoints) => ({ ok: true, line: { source: 'brouter', points: waypoints.map((w) => ({ ...w, ele: 10 })) } });
    const start = { lat: 52, lon: 5 };
    const asked = await proposeRoutes({ start, target: { distanceKm: 6, ascentM: 30 } }, route);
    for (const o of [asked.simple, asked.adventure]) {
      if (!o.ok) continue;
      expect(o.proposal.targetAscentM).toBe(30);
      expect(proposalFacts(o.proposal)).not.toContain('vrijwel vlak');
    }
    expect(asked.simple.ok || asked.adventure.ok).toBe(true);
    const flat = await proposeRoutes({ start, target: { distanceKm: 6, ascentM: 0 } }, route);
    for (const o of [flat.simple, flat.adventure]) {
      if (!o.ok) continue;
      expect(o.proposal.targetAscentM).toBeUndefined();
      expect(proposalFacts(o.proposal)).toContain('vrijwel vlak');
    }
    expect(flat.simple.ok || flat.adventure.ok).toBe(true);
  });
});

describe('het plan telt met dezelfde teller', () => {
  const line = (...e: (number | undefined)[]): RoutePoint[] => e.map((ele, i) => (ele === undefined ? { lat: 1, lon: 1 + i * 0.001 } : { lat: 1, lon: 1 + i * 0.001, ele }));

  it('geeft voor een lijn wat de teller geeft, met 5 m voor een model van 30 m', () => {
    const e = [100, 97, 110, 108, 131, 100];
    expect(ascentOf(line(...e))).toBe(climbAndDescent(e, 5).ascentM);
    expect(ascentOf(line(...e))).toBe(34);
    expect(ascentOf(line(100, undefined, 97, 110))).toBe(13);
  });

  it('telt in de bergen met 10 m: ruis van 6 m op een helling telt niet mee', () => {
    const e = [1000, 1100, 1094, 1200, 1194, 1320];
    expect(ascentOf(line(...e))).toBe(320);
    expect(ascentOf(line(...e), 5)).toBe(332);
  });
});

describe('zes nagemaakte lopen, voor en na', () => {
  // Per loop: wat de oude teller op het log gaf (dode band 5 m) en wat de nieuwe geeft
  // (gladmaken over 30 s, hysterese 2 m). Getallen in hele meters.
  const rows = SIX_RUNS.map(({ name, spec }) => {
    const { altitudeM, timeSec } = makeAltitude(spec);
    return {
      name,
      rangeM: Math.max(...altitudeM) - Math.min(...altitudeM),
      before: Math.round(oldLogGain(altitudeM)),
      after: Math.round(ups(watchLine(altitudeM, timeSec))),
      rawThreshold2: Math.round(climbAndDescent(altitudeM, 2).ascentM),
    };
  });

  it('geeft per loop deze getallen', () => {
    expect(rows.map((r) => [r.name, r.before, r.after])).toEqual([
      ['vlak 1', 0, 15],
      ['vlak 2', 1, 19],
      ['vlak 3', 2, 25],
      ['vlak 4', 7, 29],
      ['vlak 5', 3, 26],
      ['heuvellus', 85, 135],
    ]);
  });

  it('telt op de heuvellus vrijwel alles, waar de dode band tien meter per klim verloor', () => {
    const hill = rows[5];
    expect(hill.after).toBeGreaterThan(hill.before + 40);
    // Het gladmaken kost hoogstens een paar meter tegenover tellen op de ruwe reeks.
    for (const r of rows) expect(r.rawThreshold2 - r.after).toBeLessThanOrEqual(6);
  });

  it('houdt de vlakke lopen onder vrijwel vlak', () => {
    for (const r of rows.slice(0, 5)) {
      expect(r.rangeM).toBeLessThan(20);
      expect(isNearlyFlat(r.after)).toBe(true);
    }
  });
});

describe('het profiel van een log telt met dezelfde teller', () => {
  // Zes keer een helling op en af: 5 minuten omhoog op 6 procent, 5 minuten omlaag.
  const grade = (m: number) => (m < 10 ? 0 : m < 70 ? (Math.floor((m - 10) / 5) % 2 === 0 ? 0.06 : -0.06) : 0);
  const streams = makeStreams({ minutes: 80, pace: 400, grade, hr: 150, baroNoise: 0.3, startAltitude: 40 });
  const perClimb = 0.06 * (300 / 400) * 1000; // 45 m
  const real = 6 * perClimb;

  it('legt de eigen stijging binnen een paar procent van de echte', () => {
    const detail = buildActivityDetail(streams, { source: 'garmin', reportedGainM: real })!;
    const own = detail.slices.reduce((s, x) => s + x.gainM, 0);
    expect(own).toBeGreaterThan(real * 0.95);
    expect(own).toBeLessThan(real * 1.03);
    expect(detail.quality.gainAgreementPct).toBeGreaterThanOrEqual(95);
    expect(detail.quality.gainAgreementPct).toBeLessThanOrEqual(103);
    // De dode band verloor hier tien meter per klim.
    expect(oldLogGain(streams.altitudeM as number[])).toBeLessThan(real - 50);
  });
});

describe('meting: de eigen stijging per kilometer tegen de grenzen van andere regels', () => {
  // Geen eis maar een vastgelegde meting bij het besluit (punt Open): wat de nieuwe telling per
  // kilometer doet met de grens voor vlak bij zone 2 (5 m per km, zone2Rules.flatMetresPerKm) en
  // met de grens voor een klim in een kilometer (10 m, PACING.climbM). Een kilometer is hier
  // zes minuten van de reeks.
  const perKm = (line: number[]) => {
    const kms: { gain: number; loss: number }[] = [];
    for (let a = 0; a + 360 < line.length; a += 360) kms.push({ gain: ups(line.slice(a, a + 361)), loss: downs(line.slice(a, a + 361)) });
    return kms;
  };
  const count = (line: number[]) => {
    const kms = perKm(line);
    return [kms.length, kms.filter((k) => k.gain >= 5 || k.loss >= 5).length, kms.filter((k) => k.gain >= 10).length];
  };
  const rows = SIX_RUNS.map(({ name, spec }) => {
    const { altitudeM, timeSec } = makeAltitude(spec);
    return { name, before: count(deadBand(altitudeM, 5)), after: count(watchLine(altitudeM, timeSec)) };
  });

  it('kantelt op de vlakke lopen de grens voor vlak, en niet de grens voor een klim', () => {
    // [kilometers, niet vlak voor zone 2, met een klim van 10 m of meer]
    expect(rows.map((r) => [r.name, r.before, r.after])).toEqual([
      ['vlak 1', [5, 0, 0], [5, 2, 0]],
      ['vlak 2', [6, 0, 0], [6, 3, 0]],
      ['vlak 3', [7, 0, 0], [7, 3, 0]],
      ['vlak 4', [8, 0, 0], [8, 5, 0]],
      ['vlak 5', [9, 0, 0], [9, 4, 0]],
      ['heuvellus', [8, 8, 4], [8, 8, 6]],
    ]);
  });

  it('houdt met de grens van 10 m voor de nieuwe teller elke vlakke kilometer vlak', () => {
    for (const { spec } of SIX_RUNS.slice(0, 5)) {
      const { altitudeM, timeSec } = makeAltitude(spec);
      for (const k of perKm(watchLine(altitudeM, timeSec))) {
        expect(k.gain).toBeLessThan(10);
        expect(k.loss).toBeLessThan(10);
      }
    }
  });
});

describe('een helling met herhalingen in de bergen: de som van de delen is het geheel', () => {
  // Een lijn naar het noorden, een punt per 50 m: 1 km vlak op 800 m, dan 2 km omhoog naar 1150 m,
  // met op de helling om het andere punt een terugval van ruim 6 m (ruis van het model).
  const points: RoutePoint[] = [];
  for (let i = 0; i <= 60; i++) {
    const climb = i <= 20 ? 0 : ((i - 20) / 40) * 350;
    const dip = i > 22 && i < 60 && i % 2 === 1 ? -15 : 0;
    points.push({ lat: 46 + (i * 50) / 111_195, lon: 7, ele: 800 + climb + dip });
  }
  const p = composeSimple({ source: 'brouter', points }, { distanceKm: 14, ascentM: 700 })!;

  it('telt de stukken met de drempel van de hele lijn', () => {
    expect(modelThresholdM(points.map((q) => q.ele))).toBe(10);
    expect(p.repeats).toBe(2);
    // Met 10 m telt de terugval van ruim 6 m niet: twee keer 350 m. Met 5 m per stuk zou het meer zijn.
    expect(p.ascentM).toBe(700);
    expect(p.ascentM).toBe(ascentOf(p.points, 10));
    expect(p.ascentM).toBe(ascentOf(p.points));
    expect(ascentOf(p.points, 5)).toBeGreaterThan(p.ascentM);
  });
});

describe('vergelijkbare lopen: een oud en een nieuw log van dezelfde route', () => {
  const date = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
  const spec = { minutes: 40, pace: 330, hr: 145, seed: 1 } as unknown as Parameters<typeof runLog>[0]['spec'];
  const base = buildRunDetail(segmentRun(Array.from({ length: 6 }, () => ({ m: 1000, pace: 330, hr: 150 }))), { logKm: 6, logMinutes: 33, builtAt: '2026-10-27T10:00:00.000Z' }) as RunDetail;
  // Dezelfde kilometers, met de eigen stijging per km erbij: 1 m (de oude teller) of 8 m (de nieuwe).
  const counted = (gainM: number): RunDetail => ({ ...base, kms: base.kms.map((k) => ({ ...k, gainM, lossM: gainM })) });
  const mk = (id: string, d: number, ownGainPerKm: number, watchGainM?: number): SessionLog => {
    const log = runLog({ id, date: date(d), spec, strap: true });
    return {
      ...log,
      templateId: 'tpl_easy_run',
      runDetail: counted(ownGainPerKm),
      cardioData: log.cardioData ? { ...log.cardioData, ...(watchGainM !== undefined ? { elevationGainM: watchGainM } : {}) } : log.cardioData,
    };
  };

  it('houdt de oude logs erbij als het horloge op beide hetzelfde meldt', () => {
    const subject = mk('s', 18, 8, 50);
    const history = [mk('a', 15, 1, 50), mk('b', 12, 1, 48), mk('c', 9, 1, 52)];
    const c = similarRuns(subject, context([...history, subject]));
    expect(c.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(c.enough).toBe(true);
  });

  it('laat een route met echt andere stijging volgens het horloge weg', () => {
    const subject = mk('s', 18, 8, 50);
    const history = [mk('a', 15, 8, 50), mk('b', 12, 8, 50), mk('c', 9, 8, 50), mk('hill', 6, 8, 200)];
    const c = similarRuns(subject, context([...history, subject]));
    expect(c.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('valt zonder getal van het horloge terug op de eigen telling van beide', () => {
    const subject = mk('s', 18, 8);
    const history = [mk('a', 15, 8), mk('b', 12, 7), mk('c', 9, 9), mk('old', 6, 1)];
    const c = similarRuns(subject, context([...history, subject]));
    expect(c.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });
});
