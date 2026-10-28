import { describe, it, expect } from 'vitest';
import { computeComboReadiness, computeGoalReadiness, dayShareOf, readinessInputOf, requirementsFromDetails } from './goalReadiness';
import { computeGr5Readiness } from './gr5Readiness';
import { GR5_GOLDEN } from './gr5Readiness.golden';
import { estimatedHikingMinutes } from './goalRoute';
import type { GoalRequirement } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens, dezelfde als waarmee de bevroren uitkomsten zijn gemaakt.
const TODAY = '2026-10-21';
const req = (kind: GoalRequirement['kind'], amount: number, unit: string, scope: GoalRequirement['scope']): GoalRequirement => ({
  id: `${kind}-${scope}`, kind, scope, target: { amount, unit } as GoalRequirement['target'],
});
const GR5: GoalRequirement[] = [
  req('distance', 20, 'km', 'PER_DAY'), req('elevationGain', 1000, 'm', 'PER_DAY'), req('elevationLoss', 1000, 'm', 'PER_DAY'),
  req('packWeight', 14, 'kg', 'SINGLE_EVENT'), req('consecutiveDays', 6, 'days', 'CONSECUTIVE_DAYS'),
];
const TENT: GoalRequirement[] = [
  req('distance', 600, 'km', 'TOTAL_EVENT'), req('elevationGain', 30000, 'm', 'TOTAL_EVENT'), req('elevationLoss', 28000, 'm', 'TOTAL_EVENT'),
  req('eventDays', 30, 'days', 'TOTAL_EVENT'), req('packWeight', 12, 'kg', 'SINGLE_EVENT'), req('consecutiveDays', 30, 'days', 'CONSECUTIVE_DAYS'),
];
let n = 0;
const base = (date: string, minutes: number): SessionLog => ({
  id: `l${n++}`, templateId: 't', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
});
const hike = (date: string, minutes: number, upDown: number, packKg?: number): SessionLog => ({
  ...base(date, minutes),
  outdoorData: { durationMinutes: minutes, elevationGainM: upDown, elevationLossM: upDown, backpackWeightKg: packKg, source: 'manual' },
});
const run = (date: string, minutes: number, km: number, gain = 0): SessionLog => ({
  ...base(date, minutes), type: 'cardio', sport: 'running', templateId: 'tpl_easy_run',
  cardioData: { modality: 'run', durationMinutes: minutes, distanceKm: km, elevationGainM: gain, source: 'manual' },
} as SessionLog);
const ride = (date: string, minutes: number, km: number, gain = 0): SessionLog => ({
  ...base(date, minutes), type: 'cardio', sport: 'cycling', templateId: 'tpl_bike',
  cardioData: { modality: 'bike', durationMinutes: minutes, distanceKm: km, elevationGainM: gain, source: 'manual' },
} as SessionLog);
const lift = (date: string): SessionLog => ({ ...base(date, 60), type: 'strength', templateId: 'tpl_upper_a' });

const D = estimatedHikingMinutes(20, 1000, 1000);
const SCENARIOS: Record<string, { reqs: GoalRequirement[]; logs: SessionLog[] }> = {
  empty: { reqs: GR5, logs: [] },
  half: { reqs: GR5, logs: [hike('2026-10-10', D / 2, 500, 7), hike('2026-10-11', 120, 200)] },
  full: { reqs: GR5, logs: [hike('2026-10-10', D, 1000, 14), hike('2026-10-11', 150, 400, 14)] },
  aged: { reqs: GR5, logs: [hike('2026-09-01', D, 1000, 10), hike('2026-10-15', 100, 300, 5), hike('2026-10-16', 100, 300, 5), hike('2026-10-17', 100, 300, 5)] },
  tent: { reqs: TENT, logs: [hike('2026-10-10', 300, 700, 9), hike('2026-10-11', 200, 300, 9)] },
};

describe('Klaar voor je doel, meerdaagse tocht: exact gelijk aan de oude GR5-uitkomst', () => {
  for (const [name, { reqs, logs }] of Object.entries(SCENARIOS)) {
    it(`${name}: de wrapper geeft hetzelfde als vóór het generaliseren`, () => {
      const now = computeGr5Readiness(reqs, logs, TODAY);
      expect(JSON.parse(JSON.stringify(now))).toEqual(GR5_GOLDEN[name as keyof typeof GR5_GOLDEN]);
    });
  }

  it('geen eisen: niets om mee te vergelijken, zoals voorheen', () => {
    expect(computeGr5Readiness([], [], TODAY)).toBeUndefined();
    expect(GR5_GOLDEN.none).toBeNull();
  });

  it('computeGoalReadiness met de GR5-naam en twee dagen geeft dezelfde percentages en zinnen', () => {
    for (const [name, { reqs, logs }] of Object.entries(SCENARIOS)) {
      const r = computeGoalReadiness({ kind: 'trek_hut', requirements: reqs }, logs, TODAY, { naming: { the: 'de GR5', your: 'je GR5' }, homeDays: 2 });
      const golden = GR5_GOLDEN[name as keyof typeof GR5_GOLDEN] as { percent: number; sentence: string; change?: number };
      expect(r.percent).toBe(golden.percent);
      expect(r.sentence).toBe(golden.sentence);
      expect(r.change).toBe(golden.change);
      expect(r.missing).toEqual([]);
    }
  });

  it('een doel dat migreerde (details met homeDaysInRow 2) rekent hetzelfde als de eisen', () => {
    const { reqs, logs } = SCENARIOS.half;
    const viaDetails = computeGoalReadiness({ kind: 'trek_hut', details: { homeDaysInRow: 2 }, requirements: reqs }, logs, TODAY, { naming: { the: 'de GR5', your: 'je GR5' } });
    expect(viaDetails.percent).toBe(GR5_GOLDEN.half.percent);
  });

  it('met tent geldt standaard een grens van drie dagen thuis, tenzij het doel er twee kiest', () => {
    const logs = [hike('2026-10-10', 120, 300, 8), hike('2026-10-11', 120, 300, 8), hike('2026-10-12', 120, 300, 8)];
    const tent = computeGoalReadiness({ kind: 'trek_tent', requirements: GR5 }, logs, TODAY);
    const hut = computeGoalReadiness({ kind: 'trek_hut', requirements: GR5 }, logs, TODAY);
    const days = (r: typeof tent) => r.meters.find((m) => m.key === 'dagen')!;
    expect(days(tent).parts[0].need).toBe(3);
    expect(days(hut).parts[0].need).toBe(2);
    expect(days(tent).share).toBe(1);
  });
});

describe('het aandeel van de doeldag (afgeleid)', () => {
  it('1,0 tot 3 uur, 0,6 bij 8 uur, 0,5 vanaf 12 uur', () => {
    expect(dayShareOf(60)).toBe(1);
    expect(dayShareOf(180)).toBe(1);
    expect(dayShareOf(8 * 60)).toBeCloseTo(0.6, 5);
    expect(dayShareOf(12 * 60)).toBe(0.5);
    expect(dayShareOf(20 * 60)).toBe(0.5);
    expect(dayShareOf(8.4 * 60)).toBeCloseTo(0.59, 2);
  });

  const hikeGoal = { kind: 'day_hike' as const, details: { distanceKm: 16, gainM: 1200, lossM: 1200, packKg: 6 } };

  it('een bergtocht van 8,4 uur vraagt ongeveer 5 uur en 710 m, en zegt dat het afgeleid is', () => {
    const r = computeGoalReadiness(hikeGoal, [], TODAY);
    const long = r.meters.find((m) => m.key === 'langsteDag')!;
    expect(long.parts[0].need).toBeGreaterThanOrEqual(295);
    expect(long.parts[0].need).toBeLessThanOrEqual(310);
    const climb = r.meters.find((m) => m.key === 'hoogte')!;
    expect(climb.parts[0].need).toBeGreaterThan(690);
    expect(climb.parts[0].need).toBeLessThan(725);
    expect(long.evidence).toBe('afgeleid');
    expect(r.derivedNote).toMatch(/aandeel van de doeldag/);
    expect(r.sentence).toContain('dingen die je doel vraagt');
  });

  it('een korte dag onder 3 uur vraagt de hele dag', () => {
    const r = computeGoalReadiness({ kind: 'day_hike', details: { distanceKm: 6, gainM: 300, lossM: 300 } }, [], TODAY);
    expect(r.meters.find((m) => m.key === 'langsteDag')!.parts[0].need).toBe(estimatedHikingMinutes(6, 300, 300));
  });

  it('de dagrugzak onder 5 kg telt niet als meter, en de verse afdaling alleen vanaf 300 m dalen', () => {
    const light = computeGoalReadiness({ kind: 'day_hike', details: { distanceKm: 8, gainM: 400, lossM: 200, packKg: 3 } }, [], TODAY);
    expect(light.meters.map((m) => m.key)).toEqual(['langsteDag', 'hoogte']);
    const steep = computeGoalReadiness(hikeGoal, [], TODAY);
    expect(steep.meters.map((m) => m.key)).toEqual(['langsteDag', 'hoogte', 'rugzak', 'afdalenVers']);
  });

  it('de versheid daalt van 100% bij 14 dagen naar 0% bij 63 dagen', () => {
    const at = (daysAgo: number) => {
      const date = new Date(Date.parse(TODAY) - daysAgo * 86_400_000).toISOString().slice(0, 10);
      const r = computeGoalReadiness(hikeGoal, [hike(date, 200, 500, 6)], TODAY);
      return r.meters.find((m) => m.key === 'afdalenVers')!.share;
    };
    expect(at(3)).toBe(1);
    expect(at(14)).toBe(1);
    expect(at(38)).toBeGreaterThan(0.4);
    expect(at(38)).toBeLessThan(0.6);
    expect(at(60)).toBeLessThan(0.1);
    expect(computeGoalReadiness(hikeGoal, [], TODAY).meters.find((m) => m.key === 'afdalenVers')!.share).toBe(0);
  });

  it('mountaineering heeft vijf meters met stijgen en dalen apart, en een vaste verwijzing', () => {
    const r = computeGoalReadiness({ kind: 'mountaineering', details: { distanceKm: 14, gainM: 1800, lossM: 1800, expectedMinutes: 12 * 60, packKg: 10, days: 3 } }, [], TODAY);
    expect(r.meters.map((m) => m.key)).toEqual(['langsteDag', 'stijgen', 'dalen', 'rugzak', 'dagen']);
    expect(r.meters[0].parts[0].need).toBe(360); // 12 uur, aandeel 0,5
    expect(r.meters[1].parts[0].need).toBe(900);
    expect(r.meters[4].parts[0].need).toBe(2);
  });
});

describe('meters die nog niet meetbaar zijn tellen niet mee maar worden genoemd', () => {
  const tri = { kind: 'triathlon' as const, details: { variant: 'olympisch' } };

  it('triathlon zonder zwemlogs: zwemmen en de koppeltraining ontbreken, de rest bepaalt het percentage', () => {
    const logs = [ride('2026-10-10', 80, 40), run('2026-10-12', 60, 10), run('2026-10-14', 60, 6), ride('2026-10-15', 90, 40)];
    const r = computeGoalReadiness(tri, logs, TODAY);
    expect(r.missing.map((m) => m.key)).toEqual(['langsteZwemmen', 'koppel']);
    expect(r.missing[0].reason).toMatch(/zwemmen/);
    expect(r.meters.map((m) => m.key)).toEqual(['langsteFiets', 'langsteLoop', 'weekvolume']);
    expect(r.meters[0].share).toBe(1);
    expect(r.meters[1].share).toBe(1);
    const mean = r.meters.reduce((a, m) => a + m.share, 0) / 3;
    expect(r.percent).toBe(Math.min(99, Math.round(mean * 100)));
    expect(r.missingSentence).toBe('Hier is nog niets van gemeten: je langste zwemmen en je koppeltrainingen.');
    // De zin telt alleen wat meetelt.
    expect(r.sentence).toContain('drie dingen');
    expect(r.sentence).not.toContain('zwemmen');
  });

  it('een koppeltraining die de aanroeper aanlevert telt wel mee', () => {
    const r = computeGoalReadiness(tri, [], TODAY, { external: (id) => (id === 'koppel' ? { share: 0.5, text: '1 van 2' } : undefined) });
    expect(r.meters.map((m) => m.key)).toContain('koppel');
    expect(r.missing.map((m) => m.key)).toEqual(['langsteZwemmen']);
  });

  it('niets te meten (sterker worden zonder krachttrend): geen percentage, wel de lijst van wat ontbreekt', () => {
    const r = computeGoalReadiness({ kind: 'stronger', details: {} }, [], TODAY);
    expect(r.percent).toBeUndefined();
    expect(r.meters).toEqual([]);
    expect(r.missing.map((m) => m.key)).toEqual(['krachttrend', 'hardeSets', 'volhouden']);
    expect(r.missingSentence).toBe('Hier is nog niets van gemeten: je krachttrend, je harde sets per spiergroep en je volhouden.');
  });

  it('een gegeven dat ontbreekt maakt de meter ontbrekend, niet nul', () => {
    const r = computeGoalReadiness({ kind: 'trail', details: { variant: 'kort', distanceKm: 20 } }, [], TODAY, { external: () => ({ share: 1, text: '90%' }) });
    // Zonder verwachte tijd kan de langste inspanning niet gemeten worden.
    expect(r.missing.map((m) => m.key)).toContain('langsteInspanning');
    expect(r.meters.map((m) => m.key)).toContain('weekuren');
  });
});

describe('de andere soorten', () => {
  it('hardlopen 10 km: langste loop en weekvolume uit de logs, volhouden van buiten', () => {
    const logs = [run('2026-10-05', 70, 10), run('2026-10-12', 40, 5), run('2026-10-14', 35, 5), run('2026-10-18', 50, 8), run('2026-10-19', 30, 4)];
    const r = computeGoalReadiness({ kind: 'run_race', details: { distanceKm: 10 } }, logs, TODAY, {
      external: (id) => (id === 'volhouden' ? { share: 0.9, text: '90%' } : id === 'verwachteTijd' ? { share: 1, text: '51 min' } : undefined),
    });
    expect(r.meters.map((m) => m.key)).toEqual(['verwachteTijd', 'langsteLoop', 'weekvolume', 'volhouden']);
    expect(r.meters[1].share).toBe(1); // 10 km
    expect(r.meters[2].parts[0].need).toBe(22.5);
    expect(r.meters[2].parts[0].best).toBe(8); // 32 km in 4 weken
    expect(r.percent).toBeLessThan(100);
  });

  it('een meter zonder gewicht die open blijft is geen "meeste te winnen" en houdt het getal niet onder 100', () => {
    const logs = ['2026-09-26', '2026-09-28', '2026-09-30', '2026-10-03', '2026-10-05', '2026-10-07', '2026-10-10', '2026-10-12', '2026-10-14', '2026-10-17', '2026-10-19', '2026-10-20'].map((d) => run(d, 60, 10));
    const external = (id: string) => (id === 'volhouden' ? { share: 0.5, text: '50%' } : id === 'verwachteTijd' ? { share: 1, text: '51 min' } : undefined);
    const r = computeGoalReadiness({ kind: 'run_race', details: { distanceKm: 10 } }, logs, TODAY, { external, weights: { verwachteTijd: 0.6, langsteLoop: 0.2, weekvolume: 0.2, volhouden: 0 } });
    expect(r.meters.filter((m) => m.key !== 'volhouden').every((m) => m.share >= 1)).toBe(true);
    expect(r.percent).toBe(100);
    expect(r.weakest).toBeUndefined();
    expect(r.weakestSentence).toBeUndefined();
  });

  it('een marathon voorspelt geen tijd: die meter valt weg, de rest blijft', () => {
    const r = computeGoalReadiness({ kind: 'run_race', details: { distanceKm: 42.2 } }, [], TODAY, { external: () => ({ share: 1, text: 'x' }) });
    expect(r.meters.map((m) => m.key)).toEqual(['langsteLoop', 'weekvolume', 'volhouden']);
    expect(r.meters[0].parts[0].need).toBe(30);
    expect(r.meters[1].parts[0].need).toBe(30);
  });

  it('een ultra telt dagen achter elkaar, een korte trail volhouden', () => {
    const logs = [run('2026-10-10', 120, 14, 800), run('2026-10-11', 100, 12, 600), run('2026-10-12', 95, 12, 500)];
    const ultra = computeGoalReadiness({ kind: 'trail', details: { distanceKm: 60, gainM: 3000, lossM: 3000, expectedMinutes: 600 } }, logs, TODAY);
    expect(ultra.meters.map((m) => m.key)).toEqual(['langsteInspanning', 'weekuren', 'stijgen', 'dalen', 'dagenOpRij']);
    expect(ultra.meters[0].parts[0].need).toBe(240); // 40% van 10 uur
    expect(ultra.meters[4].share).toBe(1);
    expect(ultra.meters[2].parts[0].best).toBe(1900);
    const kort = computeGoalReadiness({ kind: 'trail', details: { distanceKm: 20, gainM: 800, expectedMinutes: 180 } }, logs, TODAY);
    expect(kort.meters.map((m) => m.key)).toEqual(['langsteInspanning', 'weekuren', 'stijgen']);
    expect(kort.missing.map((m) => m.key)).toEqual(['volhouden']);
  });

  it('fietsen: een reis telt dagen en mist de bagage; een tocht niet', () => {
    const logs = [ride('2026-10-10', 150, 60, 300), ride('2026-10-11', 160, 60, 200)];
    const reis = computeGoalReadiness({ kind: 'bike', details: { variant: 'reis', distanceKm: 400, expectedMinutes: 300, days: 5 } }, logs, TODAY);
    expect(reis.meters.map((m) => m.key)).toEqual(['langsteRit', 'weekvolume', 'dagenOpRij']);
    expect(reis.missing.map((m) => m.key)).toEqual(['bagage']);
    expect(reis.meters[2].parts[0].need).toBe(3);
    const tocht = computeGoalReadiness({ kind: 'bike', details: { variant: 'tocht', distanceKm: 80, expectedMinutes: 200 } }, logs, TODAY);
    expect(tocht.meters.map((m) => m.key)).toEqual(['langsteRit', 'weekvolume']);
    expect(tocht.missing.map((m) => m.key)).toEqual(['volhouden']);
    expect(tocht.meters[0].parts[0].need).toBe(160);
  });

  it('fit blijven: 150 minuten en twee krachtdagen, met de richtlijn als standaard', () => {
    const logs = [
      ...['2026-10-01', '2026-10-06', '2026-10-09', '2026-10-13', '2026-10-16', '2026-10-20'].map((d) => hike(d, 100, 0)),
      lift('2026-10-08'), lift('2026-10-15'), lift('2026-10-19'),
    ];
    const r = computeGoalReadiness({ kind: 'fit' }, logs, TODAY);
    const minutes = r.meters.find((m) => m.key === 'minutenPerWeek')!;
    expect(minutes.parts[0].need).toBe(150);
    expect(minutes.evidence).toBe('sterk');
    const strength = r.meters.find((m) => m.key === 'krachtdagen')!;
    expect(strength.parts[0].need).toBe(2);
    expect(strength.parts[0].best).toBe(0.8); // 3 krachtdagen in 4 weken
    expect(strength.share).toBeCloseTo(0.4, 5);
    const raised = computeGoalReadiness({ kind: 'fit', details: { weeklyMinutes: 300 } }, logs, TODAY);
    expect(raised.meters.find((m) => m.key === 'minutenPerWeek')!.parts[0].need).toBe(300);
  });

  it('sterker worden met een eigen krachttrend van buiten', () => {
    const r = computeGoalReadiness({ kind: 'stronger', details: {} }, [], TODAY, { external: (id) => (id === 'krachttrend' ? { share: 0.5, text: 'nog 7 kg voor 5 herhalingen' } : undefined) });
    expect(r.percent).toBe(50);
    expect(r.sentence).toContain('nog 7 kg voor 5 herhalingen');
    expect(r.missing.map((m) => m.key)).toEqual(['hardeSets', 'volhouden']);
  });
});

describe('een doel zonder soort en eisen uit gegevens', () => {
  it('readinessInputOf geeft undefined voor een doel zonder soort', () => {
    expect(readinessInputOf({ requirements: [] })).toBeUndefined();
    expect(readinessInputOf({ kind: 'fit', requirements: [] })).toEqual({ kind: 'fit', details: undefined, requirements: [] });
  });

  it('een tocht uit gegevens rekent zoals dezelfde tocht uit eisen', () => {
    const details = { distanceKm: 600, gainM: 30000, lossM: 28000, days: 30, packKg: 12, homeDaysInRow: 2 };
    const logs = SCENARIOS.tent.logs;
    const a = computeGoalReadiness({ kind: 'trek_hut', details }, logs, TODAY);
    const b = computeGoalReadiness({ kind: 'trek_hut', requirements: TENT }, logs, TODAY, { homeDays: 2 });
    expect(a.percent).toBe(b.percent);
    expect(requirementsFromDetails('trek_hut', details).map((r) => r.kind)).toEqual(['distance', 'elevationGain', 'elevationLoss', 'eventDays', 'packWeight', 'consecutiveDays']);
  });
});

describe('een combinatiedoel toont het laagste onderdeel met de naam erbij', () => {
  it('fietsen en trekken: het laagste bepaalt', () => {
    const logs = [ride('2026-10-10', 300, 100), ride('2026-10-11', 300, 100), ride('2026-10-12', 300, 100), ride('2026-10-13', 300, 100)];
    const combo = computeComboReadiness([
      { name: 'Fietsen', input: { kind: 'bike', details: { variant: 'tocht', distanceKm: 100, expectedMinutes: 300 } }, options: { external: () => ({ share: 1, text: 'x' }) } },
      { name: 'Trekken', input: { kind: 'trek_hut', requirements: GR5 } },
    ], logs, TODAY);
    expect(combo.lowest?.name).toBe('Trekken');
    expect(combo.percent).toBe(combo.parts.find((p) => p.name === 'Trekken')!.readiness.percent);
    expect(combo.sentence).toMatch(/^Trekken is je laagste onderdeel, op \d+%\. Fietsen staat op \d+%\.$/);
    expect(combo.parts).toHaveLength(2);
  });

  it('een onderdeel zonder iets om te meten telt niet mee, maar staat wel in de lijst', () => {
    const combo = computeComboReadiness([
      { name: 'Kracht', input: { kind: 'stronger' } },
      { name: 'Fit', input: { kind: 'fit' }, options: { external: () => ({ share: 1, text: 'x' }) } },
    ], [], TODAY);
    expect(combo.lowest?.name).toBe('Fit');
    expect(combo.parts.map((p) => p.name)).toEqual(['Kracht', 'Fit']);
    const none = computeComboReadiness([{ name: 'Kracht', input: { kind: 'stronger' } }], [], TODAY);
    expect(none.percent).toBeUndefined();
  });
});

describe('reviewpunten van ronde 2a (trail en fietsen)', () => {
  const daysAgo = (n: number) => new Date(Date.parse(TODAY) - n * 86_400_000).toISOString().slice(0, 10);
  const trail = { kind: 'trail' as const, details: { distanceKm: 40, gainM: 2000, lossM: 2000, expectedMinutes: 400 } };
  const fresh = (logs: SessionLog[]) => computeGoalReadiness(trail, logs, TODAY).meters.find((m) => m.key === 'dalen')!.share;
  const down = (n: number, m: number): SessionLog => ({ ...run(daysAgo(n), 120, 15), cardioData: { modality: 'run', durationMinutes: 120, distanceKm: 15, elevationGainM: m, elevationLossM: m, source: 'manual' } } as SessionLog);

  it('dalen vers: minstens 600 m, vol tot 21 dagen, nul na 6 weken', () => {
    expect(fresh([down(20, 700)])).toBe(1);
    expect(fresh([down(21, 700)])).toBe(1);
    expect(fresh([down(31, 700)])).toBeGreaterThan(0.3);
    expect(fresh([down(31, 700)])).toBeLessThan(0.7);
    expect(fresh([down(42, 700)])).toBe(0);
    // Een afdaling van 400 m telt niet als bergafprikkel.
    expect(fresh([down(5, 400)])).toBe(0);
  });

  it('trail stijgen valt terug op ongeveer 2.000 m per week als het doel geen D+ heeft', () => {
    const noGain = computeGoalReadiness({ kind: 'trail', details: { distanceKm: 40, lossM: 2000, expectedMinutes: 400 } }, [run(daysAgo(3), 120, 15, 1000)], TODAY);
    const part = noGain.meters.find((m) => m.key === 'stijgen')!.parts[0];
    expect(part.need).toBe(2000);
    const withGain = computeGoalReadiness(trail, [run(daysAgo(3), 120, 15, 1000)], TODAY).meters.find((m) => m.key === 'stijgen')!.parts[0];
    expect(withGain.need).toBe(1200);
  });

  it('fiets dagen achter elkaar: een dag telt vanaf 60% van de geplande dagafstand', () => {
    const reis = { kind: 'bike' as const, details: { variant: 'reis', distanceKm: 400, expectedMinutes: 300, days: 5 } }; // 80 km per dag
    // Ritten van 100 minuten (korter dan twee uur): 60 km telt (80% van 80 km), 40 km niet (50%).
    const rides = (km: number) => [0, 1, 2].map((i) => ride(daysAgo(i + 1), 100, km));
    const run3 = (km: number) => computeGoalReadiness(reis, rides(km), TODAY).meters.find((m) => m.key === 'dagenOpRij')!.parts[0].best;
    expect(run3(60)).toBe(3);
    expect(run3(40)).toBe(0);
    // Zonder afstand en dagen in het doel geldt de terugval van twee uur.
    const zonder = computeGoalReadiness({ kind: 'bike', details: { variant: 'reis', expectedMinutes: 300, days: 5 } }, [0, 1, 2].map((i) => ride(daysAgo(i + 1), 130, 10)), TODAY);
    expect(zonder.meters.find((m) => m.key === 'dagenOpRij')!.parts[0].best).toBe(3);
  });
});
