import { describe, expect, it } from 'vitest';
import { buildActivityDetail } from './activityDetail';
import { ELEVATION_COUNTER, GAIN_DISAGREEMENT_FLOOR_M, climbLimitFor, counterMark, gainDisagreement, sameCounter } from './elevation';
import { buildRunDetail } from './runDetail';
import { driftFromKms } from './runDetailRules';
import { similarRuns } from './runComparison';
import { VERDICT_MAX_CLIMB_PER_KM, climbsOf, descentsOf, formOf, isUnavailable } from './runMetrics';
import { trimLog, undoTrim } from './trimLog';
import { kmPieces } from './zone2Pieces';
import { context, runLog } from './fixtures/runLogs';
import { makeStreams, type RunSpec } from './fixtures/runStreams';
import { segmentRun } from './fixtures/testRun';
import { migrateActivityDetail, migrateLogDetail, migrateLogRunDetail, migrateLogTrim } from '../storage/migrations';
import type { ActivityDetail } from '../models/activityDetail';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { SessionLog } from '../models/training';

// De resten na stap 1 van de hoogtemeters (besluit 2026-11-14-hoogtemeters-na-stap-1.md).
// Alleen nagemaakte reeksen en logs.

describe('het merk lezen', () => {
  it('geen merk, of iets dat geen heel getal vanaf 2 is, is de oude telling', () => {
    for (const v of [undefined, null, 'x', '2', 0, 1, 2.5, -3, NaN, Infinity, {}]) expect(counterMark(v)).toBeUndefined();
  });

  it('het merk van de app en een hoger merk blijven wat ze zijn', () => {
    expect(counterMark(ELEVATION_COUNTER)).toBe(2);
    expect(counterMark(3)).toBe(3);
    expect(counterMark(7)).toBe(7);
  });

  it('een grens hoort bij de telling; een nieuwer merk krijgt de strengste', () => {
    const limits = { old: 15, counted: 20 };
    expect(climbLimitFor(undefined, limits)).toBe(15);
    expect(climbLimitFor(2, limits)).toBe(20);
    expect(climbLimitFor(3, limits)).toBe(15);
    // Ook als de oude grens de ruimste zou zijn.
    expect(climbLimitFor(3, { old: 12, counted: 8 })).toBe(8);
    expect(climbLimitFor('x', limits)).toBe(15);
  });

  it('twee tellingen zijn alleen gelijk met hetzelfde merk', () => {
    expect(sameCounter(undefined, undefined)).toBe(true);
    expect(sameCounter(2, 2)).toBe(true);
    expect(sameCounter(3, 3)).toBe(true);
    expect(sameCounter(undefined, 2)).toBe(false);
    expect(sameCounter(2, 3)).toBe(false);
    // Een onleesbaar merk is geen merk.
    expect(sameCounter('x', undefined)).toBe(true);
  });
});

// --- punt 1: te heuvelachtig voor een oordeel -------------------------------------------------

describe('loopvorm: de grens voor heuvelachtig hoort bij de telling van het profiel', () => {
  const base: RunSpec = { minutes: 60, pace: 360, hr: 145, cadence: 172, stanceTimeMs: 240, stepLengthM: 1.1, hrNoise: 0.3 };
  const flat = buildActivityDetail(makeStreams(base), { source: 'garmin' })!;
  // Hetzelfde profiel met een vaste eigen stijging per km, en met of zonder merk.
  const withClimb = (perKm: number, counter?: number): ActivityDetail => {
    const { counter: _c, ...rest } = flat;
    void _c;
    return { ...rest, ...(counter !== undefined ? { counter } : {}), slices: flat.slices.map((s) => ({ ...s, gainM: (perKm * s.distanceM) / 1000, lossM: (perKm * s.distanceM) / 1000 })) };
  };
  const hilly = (d: ActivityDetail) => {
    const r = formOf(d);
    return isUnavailable(r) ? r.unavailable : 'ok';
  };

  it('heeft de twee grenzen', () => {
    expect(VERDICT_MAX_CLIMB_PER_KM).toEqual({ old: 15, counted: 20 });
  });

  it('een oud log houdt de grens van 15 m per km', () => {
    expect(hilly(withClimb(14))).toBe('ok');
    expect(hilly(withClimb(17))).toBe('hilly');
  });

  it('een nieuw log telt met 20 m per km: 17 m is geen reden meer om te zwijgen', () => {
    expect(hilly(withClimb(17, 2))).toBe('ok');
    expect(hilly(withClimb(21, 2))).toBe('hilly');
  });

  it('een nieuwer merk dan de app kent krijgt de strengste grens', () => {
    expect(hilly(withClimb(14, 3))).toBe('ok');
    expect(hilly(withClimb(17, 3))).toBe('hilly');
  });

  it('een heuvelloop die de app nu zelf telt houdt zijn oordeel', () => {
    // Golvend: ongeveer 17 m stijging per km in de nieuwe telling, tussen de oude en de nieuwe grens.
    const d = buildActivityDetail(makeStreams({ ...base, grade: (m) => 0.054 * Math.sin((m * Math.PI) / 5) }), { source: 'garmin' })!;
    const perKm = d.slices.reduce((n, s) => n + s.gainM, 0) / (d.slices.reduce((n, s) => n + s.distanceM, 0) / 1000);
    expect(d.counter).toBe(2);
    expect(perKm).toBeGreaterThan(15);
    expect(perKm).toBeLessThan(20);
    expect(hilly(d)).toBe('ok');
    // Hetzelfde profiel zonder merk zou met de oude grens zijn vervallen.
    const { counter: _c, ...unmarked } = d;
    void _c;
    expect(hilly(unmarked)).toBe('hilly');
  });
});

describe('hartslagverloop uit de kilometers: de grens hoort bij de telling van de kilometers', () => {
  const OPTS = { logKm: 15, logMinutes: 90, builtAt: '2026-11-14T10:00:00.000Z', bestKm: null };
  const flat = buildRunDetail(segmentRun(Array.from({ length: 15 }, (_, i) => ({ m: 1000, pace: 360, hr: 140 + i }))), OPTS)!;
  const withClimb = (perKm: number, counter?: number): RunDetail => {
    const { counter: _c, ...rest } = flat;
    void _c;
    return { ...rest, ...(counter !== undefined ? { counter } : {}), kms: flat.kms.map((k) => ({ ...k, gainM: perKm, lossM: perKm })) };
  };
  const hilly = (rd: RunDetail) => {
    const r = driftFromKms(rd, { easyOrLong: true });
    return isUnavailable(r) ? r.unavailable : 'ok';
  };

  it('een oud log houdt 15 m per km, een nieuw log telt met 20', () => {
    expect(hilly(withClimb(14))).toBe('ok');
    expect(hilly(withClimb(17))).toBe('hilly');
    expect(hilly(withClimb(17, 2))).toBe('ok');
    expect(hilly(withClimb(21, 2))).toBe('hilly');
  });

  it('een nieuwer merk dan de app kent krijgt de strengste grens', () => {
    expect(hilly(withClimb(17, 3))).toBe('hilly');
    expect(hilly(withClimb(14, 3))).toBe('ok');
  });

  it('leest het merk van de kilometers, niet dat van het profiel', () => {
    // De regel krijgt alleen `runDetail`: een oud profiel op hetzelfde log verandert niets.
    expect(hilly(withClimb(17, 2))).toBe('ok');
  });

  it('een loop die de app nu zelf telt met 17 m per km houdt zijn oordeel', () => {
    const rd = buildRunDetail(segmentRun(Array.from({ length: 15 }, (_, i) => ({ m: 1000, pace: 360, hr: 140 + i, climb: 17 }))), OPTS)!;
    expect(rd.counter).toBe(2);
    expect(hilly(rd)).toBe('ok');
  });
});

// --- punt 2 en 3: vergelijkbare lopen ------------------------------------------------------------

describe('vergelijkbare lopen: het horlogegetal wantrouwen en alleen gelijke tellingen vergelijken', () => {
  const date = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
  const spec = { minutes: 40, pace: 330, hr: 145, seed: 1 };
  const base = buildRunDetail(segmentRun(Array.from({ length: 6 }, () => ({ m: 1000, pace: 330, hr: 150 }))), { logKm: 6, logMinutes: 33, builtAt: '2026-10-27T10:00:00.000Z' }) as RunDetail;
  interface Mk {
    // Eigen stijging per km in de bewaarde kilometers, en het merk daarvan (undefined: oud).
    own?: number;
    counter?: number;
    // Het getal van het horloge op het log.
    watch?: number;
    // De overeenkomst van het profiel met het horloge, en het merk van het profiel.
    agree?: number;
    detailCounter?: number;
    // De eigen stijging van het profiel in meters (de som van de stukken), waar de overeenkomst bij hoort.
    detailOwn?: number;
  }
  const mk = (id: string, d: number, o: Mk): SessionLog => {
    const log = runLog({ id, date: date(d), spec, strap: true });
    const { counter: _c, ...rd } = base;
    void _c;
    const { counter: _d, ...detail } = log.detail!;
    void _d;
    return {
      ...log,
      templateId: 'tpl_easy_run',
      runDetail: {
        ...rd,
        ...(o.counter !== undefined ? { counter: o.counter } : {}),
        kms: base.kms.map((k): RunKm => {
          const { gainM: _g, lossM: _l, ...km } = k;
          void _g;
          void _l;
          return o.own !== undefined ? { ...km, gainM: o.own, lossM: o.own } : km;
        }),
      },
      detail: {
        ...detail,
        ...(o.detailOwn !== undefined ? { slices: detail.slices.map((s) => ({ ...s, gainM: o.detailOwn! / detail.slices.length })) } : {}),
        ...(o.detailCounter !== undefined ? { counter: o.detailCounter } : {}),
        quality: { ...detail.quality, ...(o.agree !== undefined ? { gainAgreementPct: o.agree } : {}) },
      },
      cardioData: { ...log.cardioData!, ...(o.watch !== undefined ? { elevationGainM: o.watch } : {}) },
    };
  };
  const ids = (subject: SessionLog, history: SessionLog[]) => similarRuns(subject, context([...history, subject])).logs.map((l) => l.id);
  const NEW = { counter: 2, detailCounter: 2 };

  it('een horlogegetal van 0 is geen meting: dan telt de eigen telling', () => {
    const subject = mk('s', 18, { ...NEW, own: 3, watch: 0 });
    const history = [mk('a', 15, { ...NEW, own: 3, watch: 0 }), mk('b', 12, { ...NEW, own: 4, watch: 0 }), mk('c', 9, { ...NEW, own: 2, watch: 0 }), mk('hill', 6, { ...NEW, own: 25, watch: 0 })];
    // Met het getal 0 op beide zou de heuvelloop als gelijk zijn doorgegaan.
    expect(ids(subject, history)).toEqual(['a', 'b', 'c']);
  });

  it('een 0 op alleen het eerdere log maakt het niet vlak', () => {
    const subject = mk('s', 18, { ...NEW, own: 20, watch: 120 });
    const history = [mk('a', 15, { ...NEW, own: 20, watch: 120 }), mk('b', 12, { ...NEW, own: 21, watch: 0 }), mk('flat', 9, { ...NEW, own: 2, watch: 0 })];
    expect(ids(subject, history)).toEqual(['a', 'b']);
  });

  it('een nieuw heuvellog waarvan de eigen telling ver van het horloge ligt gelooft het horloge niet', () => {
    // Het horloge meldt op alle 150 m (25 m per km). Op een log telde de app 750 m (500 procent),
    // op een ander 60 m (40 procent): beide ver buiten de marge en ruim 20 m ernaast.
    const subject = mk('s', 18, { ...NEW, own: 25, watch: 150, agree: 100, detailOwn: 150 });
    const history = [
      mk('a', 15, { ...NEW, own: 25, watch: 150, agree: 100, detailOwn: 150 }),
      mk('b', 12, { ...NEW, own: 26, watch: 150, agree: 104, detailOwn: 156 }),
      mk('c', 9, { ...NEW, own: 24, watch: 150, agree: 96, detailOwn: 144 }),
    ];
    const high = mk('high', 6, { ...NEW, own: 125, watch: 150, agree: 500, detailOwn: 750 });
    const low = mk('low', 5, { ...NEW, own: 10, watch: 150, agree: 40, detailOwn: 60 });
    // Met het horlogegetal zouden beide als gelijk zijn doorgegaan; de eigen telling zegt anders.
    expect(ids(subject, [...history, high, low])).toEqual(['a', 'b', 'c']);
  });

  it('de bodem in meters: buiten de marge maar minder dan 20 m uit elkaar zegt niets', () => {
    expect(GAIN_DISAGREEMENT_FLOOR_M).toBe(20);
    // 14 m eigen tegen 30 m horloge: 47 procent, 16 m verschil.
    expect(gainDisagreement(47, 14)).toBeUndefined();
    // 57 m eigen tegen 33 m horloge: 173 procent, 24 m verschil.
    expect(gainDisagreement(173, 57)).toBe('high');
    // 60 m tegen 150 m: 40 procent, 90 m verschil.
    expect(gainDisagreement(40, 60)).toBe('low');
    // Binnen de marge is het nooit ver, hoe groot het verschil ook is.
    expect(gainDisagreement(70, 700)).toBeUndefined();
    expect(gainDisagreement(undefined, 700)).toBeUndefined();
    // Met het horlogegetal van het log erbij telt dat getal.
    expect(gainDisagreement(47, 14, 30)).toBeUndefined();
    expect(gainDisagreement(47, 14, 60)).toBe('low');
    // Eigen telling niets: het horlogegetal is niet af te leiden. Zonder getal geldt het als ver.
    expect(gainDisagreement(0, 0, 12)).toBeUndefined();
    expect(gainDisagreement(0, 0, 80)).toBe('low');
    expect(gainDisagreement(0, 0)).toBe('low');
    // Een overeenkomst zonder eigen telling erbij: alleen het percentage beslist.
    expect(gainDisagreement(200, 0)).toBe('high');
  });

  it('een vlak nieuw log met 14 m eigen tegen 30 m horloge blijft vergelijkbaar met oude logs', () => {
    const subject = mk('s', 18, { ...NEW, own: 2.3, watch: 30, agree: 47, detailOwn: 14 });
    const history = [
      mk('a', 15, { own: 1, watch: 30, agree: 20, detailOwn: 6 }),
      mk('b', 12, { own: 1, watch: 28, agree: 25, detailOwn: 7 }),
      mk('c', 9, { own: 1, watch: 33, agree: 15, detailOwn: 5 }),
    ];
    const c = similarRuns(subject, context([...history, subject]));
    expect(c.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(c.enough).toBe(true);
    // En als eerder log tegenover een nieuw: ook dan telt zijn horlogegetal.
    expect(ids(mk('n', 19, { ...NEW, own: 5, watch: 30, agree: 100, detailOwn: 30 }), [subject])).toEqual(['s']);
  });

  it('de onderkant van de marge leest het merk van het profiel, niet dat van de kilometers', () => {
    // Het horloge meldt op alle 150 m; het profiel telde 60 m (40 procent, 90 m ernaast).
    const subject = mk('s', 18, { own: 25, watch: 150, agree: 95, detailOwn: 142 });
    // Profiel met merk 2, kilometers zonder: het horloge geldt niet, de kilometers (10 tegen 25 m per km) wel.
    const newDetail = mk('x', 15, { detailCounter: 2, own: 10, watch: 150, agree: 40, detailOwn: 60 });
    expect(ids(subject, [newDetail])).toEqual([]);
    // Omgekeerd, een oud profiel met nieuw getelde kilometers: de oude teller telde te laag, het
    // horlogegetal blijft gelden en het log blijft erbij.
    const oldDetail = mk('y', 15, { counter: 2, own: 10, watch: 150, agree: 40, detailOwn: 60 });
    expect(ids(subject, [oldDetail])).toEqual(['y']);
  });

  it('een oud log met een lage overeenkomst houdt zijn horlogegetal: de oude teller telde altijd te laag', () => {
    const subject = mk('s', 18, { ...NEW, own: 20, watch: 120, agree: 100, detailOwn: 120 });
    const history = [mk('a', 15, { own: 8, watch: 120, agree: 40, detailOwn: 48 }), mk('b', 12, { own: 8, watch: 118, agree: 42, detailOwn: 50 }), mk('c', 9, { own: 8, watch: 122, agree: 38, detailOwn: 46 })];
    expect(ids(subject, history)).toEqual(['a', 'b', 'c']);
  });

  it('een oud log dat veel meer telde dan het horloge (boven 140 procent, 20 m of meer) gelooft het horloge niet', () => {
    const subject = mk('s', 18, { own: 3, watch: 20, agree: 90, detailOwn: 18 });
    const history = [mk('a', 15, { own: 3, watch: 20, agree: 90, detailOwn: 18 }), mk('odd', 12, { own: 20, watch: 20, agree: 600, detailOwn: 120 })];
    // Beide zonder merk: de eigen tellingen zijn te vergelijken, en 20 tegen 3 m per km is anders.
    expect(ids(subject, history)).toEqual(['a']);
  });

  it('vergelijkt eigen tellingen alleen bij gelijk merk', () => {
    // Geen horlogegetal. Dezelfde route geeft oud 1 m en nieuw 4 m per km: binnen 5 m, en toch
    // geen maat. Het oude log is geen kandidaat, en er wordt geen reden bij verzonnen.
    const subject = mk('s', 18, { ...NEW, own: 4 });
    const history = [mk('a', 15, { ...NEW, own: 4 }), mk('b', 12, { ...NEW, own: 5 }), mk('c', 9, { ...NEW, own: 3 }), mk('old', 6, { own: 1 })];
    expect(ids(subject, history)).toEqual(['a', 'b', 'c']);
    const onlyOld = similarRuns(subject, context([mk('old1', 15, { own: 1 }), mk('old2', 12, { own: 1 }), subject]));
    expect(onlyOld.logs).toEqual([]);
    expect(onlyOld.reasons).toEqual([{ code: 'tooFew', count: 0 }]);
  });

  it('twee oude logs zonder horlogegetal vergelijken wel met elkaar', () => {
    const subject = mk('s', 18, { own: 1 });
    expect(ids(subject, [mk('a', 15, { own: 2 }), mk('hill', 12, { own: 12 })])).toEqual(['a']);
  });

  it('een nieuwer merk dan de app kent vergelijkt alleen met hetzelfde merk', () => {
    const subject = mk('s', 18, { counter: 3, own: 4 });
    const history = [mk('same', 15, { counter: 3, own: 5 }), mk('ours', 12, { counter: 2, own: 4 }), mk('old', 9, { own: 4 })];
    expect(ids(subject, history)).toEqual(['same']);
  });

  it('met een betrouwbaar horlogegetal op beide doet het merk er niet toe', () => {
    const subject = mk('s', 18, { counter: 3, own: 9, watch: 50 });
    const history = [mk('ours', 15, { ...NEW, own: 8, watch: 50, agree: 100 }), mk('old', 12, { own: 1, watch: 49, agree: 20 })];
    expect(ids(subject, history)).toEqual(['ours', 'old']);
  });

  it('zonder hoogte op het eerdere log valt er niets te toetsen: het blijft kandidaat, zoals voorheen', () => {
    const subject = mk('s', 18, { ...NEW, own: 4 });
    expect(ids(subject, [mk('none', 15, {})])).toEqual(['none']);
  });
});

describe('klimmen en dalen: de hoogte wantrouwen heeft dezelfde bodem in meters', () => {
  const made = runLog({ id: 'k', date: '2026-11-12', spec: { minutes: 40, pace: 330, hr: 145, seed: 3 } }).detail!;
  const withOwn = (ownM: number, agree: number): ActivityDetail => ({ ...made, slices: made.slices.map((s) => ({ ...s, gainM: ownM / made.slices.length })), quality: { ...made.quality, gainAgreementPct: agree } });

  it('vlak, 14 m eigen tegen 30 m horloge: geen reden om de hoogte niet te vertrouwen', () => {
    expect(climbsOf(withOwn(14, 47))).toEqual([]);
    expect(descentsOf(withOwn(14, 47))).toEqual([]);
  });

  it('heuvel, 60 m eigen tegen 150 m horloge: de hoogte geldt niet', () => {
    expect(climbsOf(withOwn(60, 40))).toEqual({ unavailable: 'altitudeDisagrees' });
    expect(descentsOf(withOwn(750, 500))).toEqual({ unavailable: 'altitudeDisagrees' });
  });
});

// --- punt 4: een nieuwer merk dan de app kent -------------------------------------------------------

describe('een nieuwer merk dan de app kent is niet oud', () => {
  const spec = { minutes: 40, pace: 330, hr: 145, seed: 3 };
  const fresh = runLog({ id: 'new', date: '2026-11-12', spec });
  const rd = buildRunDetail(makeStreams(spec), { logKm: 7.3, logMinutes: 40, builtAt: '2026-11-12T10:00:00.000Z' })!;
  const read = (log: unknown): SessionLog => migrateLogRunDetail(migrateLogDetail(JSON.parse(JSON.stringify(log)) as SessionLog));

  it('blijft bij het importeren op profiel en kilometers staan', () => {
    const back = read({ ...fresh, detail: { ...fresh.detail!, counter: 3 }, runDetail: { ...rd, counter: 3 } });
    expect(back.detail!.counter).toBe(3);
    expect(back.detail!.slices).toEqual(fresh.detail!.slices);
    expect(back.runDetail!.counter).toBe(3);
  });

  it('iets dat geen heel getal vanaf 2 is valt uit het profiel weg; de rest blijft', () => {
    for (const odd of [1, 0, 2.5, -2, '3', null]) {
      const back = migrateActivityDetail(JSON.parse(JSON.stringify({ ...fresh.detail!, counter: odd })));
      expect(back).toBeDefined();
      expect('counter' in back!).toBe(false);
      expect(back!.slices).toEqual(fresh.detail!.slices);
    }
  });

  it('een onleesbaar merk op de kilometers reist mee en leest als geen merk', () => {
    const back = read({ ...fresh, runDetail: { ...rd, counter: 'x' } });
    expect(back.runDetail).toBeDefined();
    expect(counterMark(back.runDetail!.counter)).toBeUndefined();
  });

  it('vlak bij zone 2 krijgt de strengste grens (5 m), niet de ruimste', () => {
    const km = (i: number): RunKm => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: 330, paceSecKm: 330, gapSecKm: 320, hrAvg: 140, gainM: 7, lossM: 7 }) as RunKm;
    const kms = [0, 1, 2, 3, 4, 5].map(km);
    expect(kmPieces({ kms, counter: 3 })[0].flat).toBe(false);
    expect(kmPieces({ kms, counter: 2 })[0].flat).toBe(true);
  });
});

// --- punt 5: inkorten en ongedaan maken bij een oud log --------------------------------------------

describe('inkorten en ongedaan maken bij een log van voor de teller', () => {
  const spec: RunSpec = { minutes: 40, pace: 330, hr: 145, seed: 3, grade: (m) => 0.02 * Math.sin((m * Math.PI) / 4) };
  const streams = makeStreams(spec);
  const made = runLog({ id: 'old', date: '2026-10-10', spec });
  const madeRd = buildRunDetail(streams, { logKm: made.cardioData!.distanceKm!, logMinutes: 40, builtAt: '2026-10-10T10:00:00.000Z' })!;
  // Het log zoals het voor 12 november op het toestel stond: profiel en kilometers zonder merk,
  // met de lagere getallen van de oude telling, en een getal van het horloge.
  const { counter: _a, ...detailRest } = made.detail!;
  const { counter: _b, ...rdRest } = madeRd;
  void _a;
  void _b;
  const oldDetail: ActivityDetail = { ...detailRest, slices: detailRest.slices.map((s) => ({ ...s, gainM: Math.round(s.gainM * 6) / 10, lossM: Math.round(s.lossM * 6) / 10 })) };
  const oldRd: RunDetail = { ...rdRest, kms: rdRest.kms.map((k) => ({ ...k, ...(k.gainM !== undefined ? { gainM: Math.round(k.gainM * 6) / 10 } : {}) })) };
  const old: SessionLog = { ...made, rpe: 4, notes: 'Rustig', detail: oldDetail, runDetail: oldRd, cardioData: { ...made.cardioData!, elevationGainM: 60, elevationLossM: 58 } };
  const frozen = JSON.parse(JSON.stringify(old)) as SessionLog;
  const cut = trimLog(old, streams, 120, 2000, new Date('2026-11-14T10:00:00.000Z'))!;

  it('het ingekorte profiel is nieuw geteld en draagt het merk; het oude staat ongewijzigd in de uitzondering', () => {
    expect(cut).toBeDefined();
    expect(cut.detail!.counter).toBe(2);
    expect(cut.trim!.original.detail).toEqual(oldDetail);
    expect('counter' in cut.trim!.original.detail!).toBe(false);
    expect(cut.trim!.original.elevationGainM).toBe(60);
    expect(cut.cardioData!.elevationGainM).toBeLessThan(60);
    // De grens voor een oordeel volgt het profiel van dat moment.
    expect(climbLimitFor(cut.detail!.counter, VERDICT_MAX_CLIMB_PER_KM)).toBe(20);
    expect(climbLimitFor(cut.trim!.original.detail!.counter, VERDICT_MAX_CLIMB_PER_KM)).toBe(15);
  });

  it('inkorten raakt de kilometers en wat je zelf invulde niet aan, en verandert het log dat het kreeg niet', () => {
    expect(cut.runDetail).toEqual(oldRd);
    expect('counter' in cut.runDetail!).toBe(false);
    expect(cut.rpe).toBe(4);
    expect(cut.notes).toBe('Rustig');
    expect(old).toEqual(frozen);
  });

  it('ongedaan maken geeft het oude log precies terug, zonder merk', () => {
    const back = undoTrim(cut);
    expect(back).toEqual(frozen);
    expect('counter' in back.detail!).toBe(false);
    expect('trim' in back).toBe(false);
    expect(climbLimitFor(back.detail!.counter, VERDICT_MAX_CLIMB_PER_KM)).toBe(15);
  });

  it('ook na een back-up tussendoor komt het oude profiel zonder merk terug', () => {
    const restored = migrateLogTrim(migrateLogRunDetail(migrateLogDetail(JSON.parse(JSON.stringify(cut)) as SessionLog)));
    expect(restored.detail!.counter).toBe(2);
    expect(undoTrim(restored)).toEqual(frozen);
  });

  it('kilometers die tijdens het inkorten opnieuw zijn gebouwd houden hun merk na ongedaan maken', () => {
    // Het ingekorte log past niet meer bij zijn kilometers; de app bouwt ze opnieuw, met de nieuwe
    // teller. Ongedaan maken zet alleen terug wat inkorten verving: het profiel is weer oud, de
    // kilometers blijven nieuw geteld. Elke regel leest het merk van zijn eigen veld.
    const rebuilt = buildRunDetail(streams, { logKm: cut.cardioData!.distanceKm!, logMinutes: cut.durationMinutes, builtAt: '2026-11-14T10:05:00.000Z' })!;
    const back = undoTrim({ ...cut, runDetail: rebuilt });
    expect(back.detail).toEqual(oldDetail);
    expect(back.runDetail!.counter).toBe(2);
    expect(sameCounter(back.detail!.counter, back.runDetail!.counter)).toBe(false);
    expect(climbLimitFor(back.detail!.counter, VERDICT_MAX_CLIMB_PER_KM)).toBe(15);
    expect(climbLimitFor(back.runDetail!.counter, VERDICT_MAX_CLIMB_PER_KM)).toBe(20);
  });

  it('een ingekort log wordt niet nog eens ingekort; eerst ongedaan maken', () => {
    expect(trimLog(cut, streams, 300, 1500, new Date('2026-11-14T11:00:00.000Z'))).toBeUndefined();
    const again = trimLog(undoTrim(cut), streams, 300, 1500, new Date('2026-11-14T11:00:00.000Z'))!;
    expect(again.trim!.original.detail).toEqual(oldDetail);
  });
});
