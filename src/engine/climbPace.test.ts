import { describe, it, expect } from 'vitest';
import type { SessionLog } from '../models/training';
import type { ActivityDetail, TerrainStretch } from '../models/activityDetail';
import { CLIMB_PACE_MIN, climbPace, climbPaceBasisLine, climbPaceWaitLine, goalDayOwnLine, hoursBandText, ownHikingBand, stageOwnLine, stageTimeEstimate } from './climbPace';
import { estimatedHikingMinutes } from './goalRoute';

// Nagemaakte tochten: alleen de klim- en dalstukken die het profiel ervan zou geven.
function stretch(kind: 'climb' | 'descent', metres: number, metresPerHour: number, gradientPct = 10): TerrainStretch {
  const sec = Math.round((metres / metresPerHour) * 3600);
  return { kind, startSec: 0, sec, distanceM: Math.round(metres / (gradientPct / 100)), metres, gradientPct };
}

function detail(stretches: TerrainStretch[], gainAgreementPct?: number): ActivityDetail {
  return { version: 1, source: 'garmin', sliceCount: 0, slices: [], stretches, movingSec: 3600, quality: { heartRateCoveragePct: 100, ...(gainAgreementPct !== undefined ? { gainAgreementPct } : {}) } };
}

let n = 0;
function hike(date: string, stretches: TerrainStretch[], extra: { packKg?: number; indoor?: boolean; run?: boolean; gainAgreementPct?: number } = {}): SessionLog {
  n++;
  return {
    id: `log_${n}`, templateId: extra.run ? 'tpl_easy_run' : 'tpl_mountain_hike', type: extra.run ? 'cardio' : 'hiking', sport: extra.run ? 'running' : 'hiking',
    completedDate: date, completedAt: `${date}T12:00:00.000Z`, variant: 'full', durationMinutes: 240, source: 'garmin',
    outdoorData: { durationMinutes: 240, distanceKm: 14, elevationGainM: 800, elevationLossM: 800, ...(extra.packKg !== undefined ? { backpackWeightKg: extra.packKg } : {}), ...(extra.indoor ? { environment: 'treadmill' } : {}) },
    detail: detail(stretches, extra.gainAgreementPct),
  } as SessionLog;
}

const TODAY = '2026-10-30';

// Drie tochten met elk twee klimmen en een daling: precies genoeg.
function enoughHikes(packKg?: number): SessionLog[] {
  return [
    hike('2026-09-05', [stretch('climb', 200, 400), stretch('climb', 120, 450), stretch('descent', 300, 700)], { packKg }),
    hike('2026-09-20', [stretch('climb', 180, 500), stretch('climb', 90, 420), stretch('descent', 250, 800)], { packKg }),
    hike('2026-10-11', [stretch('climb', 250, 480), stretch('climb', 60, 520), stretch('descent', 280, 750)], { packKg }),
  ];
}

describe('climbPace: je eigen klimtempo uit je tochten', () => {
  it('telt niets zonder klimmen', () => {
    expect(climbPace([], TODAY)).toBeUndefined();
  });

  it('wacht tot er zes klimmen uit drie tochten zijn, en zegt hoeveel er al zijn', () => {
    const two = enoughHikes().slice(0, 2);
    expect(climbPace(two, TODAY)).toEqual({ state: 'notYet', climbs: 4, trips: 2 });
    // Zes klimmen, maar uit twee tochten: ook nog niet.
    const crowded = [
      hike('2026-09-05', [stretch('climb', 200, 400), stretch('climb', 120, 450), stretch('climb', 100, 470)]),
      hike('2026-09-20', [stretch('climb', 180, 500), stretch('climb', 90, 420), stretch('climb', 80, 430)]),
    ];
    expect(climbPace(crowded, TODAY)).toMatchObject({ state: 'notYet', climbs: 6, trips: 2 });
    expect(CLIMB_PACE_MIN).toEqual({ climbs: 6, trips: 3 });
  });

  it('geeft na genoeg klimmen de mediaan omhoog en omlaag, met de band van het middelste deel', () => {
    const r = climbPace(enoughHikes(), TODAY);
    expect(r?.state).toBe('enough');
    if (r?.state !== 'enough') return;
    // 400, 420, 450, 480, 500, 520: de mediaan is 465, op tien meter 470.
    expect(r.pace.upMph).toBe(470);
    expect(r.pace.upSlow).toBeLessThan(r.pace.upMph);
    expect(r.pace.upFast).toBeGreaterThan(r.pace.upMph);
    expect(r.pace.downMph).toBe(750);
    expect(r.pace).toMatchObject({ climbs: 6, trips: 3, descents: 3, lastDate: '2026-10-11' });
    expect(r.pace.packKg).toBeUndefined();
  });

  it('noemt het rugzakgewicht van de klimmen als dat bekend is', () => {
    const r = climbPace(enoughHikes(9), TODAY);
    expect(r?.state === 'enough' && r.pace.packKg).toBe(9);
  });

  it('laat hardlopen, de loopband, een onbetrouwbare hoogte, de toekomst en het oude jaar buiten', () => {
    const noise = [
      hike('2026-09-01', [stretch('climb', 200, 900)], { run: true }),
      hike('2026-09-02', [stretch('climb', 200, 900)], { indoor: true }),
      hike('2026-09-03', [stretch('climb', 200, 900)], { gainAgreementPct: 200 }),
      hike('2026-11-02', [stretch('climb', 200, 900)]),
      hike('2025-09-01', [stretch('climb', 200, 900)]),
      // Te klein: onder 50 meter telt niet.
      hike('2026-09-04', [stretch('climb', 40, 900)]),
    ];
    const r = climbPace([...enoughHikes(), ...noise], TODAY);
    expect(r?.state === 'enough' && r.pace.upMph).toBe(470);
  });

  it('telt vandaag mee, morgen niet', () => {
    const today = hike(TODAY, [stretch('climb', 200, 470)]);
    const r = climbPace([...enoughHikes().slice(0, 2), today], TODAY);
    expect(r).toMatchObject({ state: 'notYet', climbs: 5, trips: 3 });
  });
});

describe('ownHikingBand en stageTimeEstimate: een etappe op je eigen tempo', () => {
  const pace = (() => {
    const r = climbPace(enoughHikes(), TODAY);
    if (r?.state !== 'enough') throw new Error('test vraagt genoeg klimmen');
    return r.pace;
  })();

  it('rekent met de norm voor vlak en je eigen tempo voor omhoog en omlaag, als band van minstens een uur', () => {
    const band = ownHikingBand(pace, { km: 20, up: 1100, down: 1100 });
    expect(band.high - band.low).toBeGreaterThanOrEqual(60);
    expect(band.low % 30).toBe(0);
    expect(band.high % 30).toBe(0);
    // Sneller dan 300 m per uur omhoog: korter dan de norm.
    expect(band.mid).toBeLessThan(estimatedHikingMinutes(20, 1100, 1100));
    expect(band.low).toBeLessThanOrEqual(band.mid);
    expect(band.high).toBeGreaterThanOrEqual(band.mid);
  });

  it('maakt het trager met een zwaardere rugzak dan op je klimmen, nooit sneller met een lichtere', () => {
    const light = climbPace(enoughHikes(5), TODAY);
    if (light?.state !== 'enough') throw new Error('genoeg');
    const same = ownHikingBand(light.pace, { km: 20, up: 1100, down: 1100 });
    const heavy = ownHikingBand(light.pace, { km: 20, up: 1100, down: 1100 }, { packKg: 15, bodyKg: 75 });
    const lighter = ownHikingBand(light.pace, { km: 20, up: 1100, down: 1100 }, { packKg: 2, bodyKg: 75 });
    expect(heavy.mid).toBeGreaterThan(same.mid);
    expect(lighter.mid).toBe(same.mid);
    // Zonder lichaamsgewicht geen omrekening.
    expect(ownHikingBand(light.pace, { km: 20, up: 1100, down: 1100 }, { packKg: 15 }).mid).toBe(same.mid);
  });

  it('valt terug op de oude schatting zonder genoeg klimmen, en als de instelling uit staat', () => {
    const stage = { km: 15.4, up: 663, down: 713 };
    expect(stageTimeEstimate(undefined, stage)).toEqual({ kind: 'norm', minutes: estimatedHikingMinutes(15.4, 663, 713) });
    expect(stageTimeEstimate({ state: 'notYet', climbs: 2, trips: 1 }, stage).kind).toBe('norm');
    expect(stageTimeEstimate({ state: 'enough', pace }, stage, { on: false }).kind).toBe('norm');
    const own = stageTimeEstimate({ state: 'enough', pace }, stage);
    expect(own.kind).toBe('own');
  });

  it('zegt de etappetijd en de dag van je hoofddoel alleen op je eigen tempo', () => {
    const own = stageTimeEstimate({ state: 'enough', pace }, { km: 20, up: 1100, down: 1100 });
    expect(stageOwnLine(own)).toMatch(/^Op je eigen tempo \d+(,5)? tot \d+(,5)? uur lopen, zonder pauzes\.$/);
    expect(goalDayOwnLine(own, { km: 20, up: 1100, down: 1100 })).toContain('20 km met 1.100 m omhoog en 1.100 m omlaag');
    expect(goalDayOwnLine(own, { km: 20, up: 1100, down: 1100 })).toContain('De wandelnorm zegt 8 uur 20 min.');
    const norm = stageTimeEstimate(undefined, { km: 20, up: 1100, down: 1100 });
    expect(stageOwnLine(norm)).toBeUndefined();
    expect(goalDayOwnLine(norm, { km: 20, up: 1100, down: 1100 })).toBeUndefined();
  });

  it('zegt de band in hele en halve uren', () => {
    expect(hoursBandText({ low: 390, high: 450 })).toBe('6,5 tot 7,5 uur');
    expect(hoursBandText({ low: 360, high: 420 })).toBe('6 tot 7 uur');
  });
});

describe('de woorden bij je klimtempo', () => {
  it('zegt waar het getal op rust en hoeveel er nog nodig zijn', () => {
    const r = climbPace(enoughHikes(9), TODAY);
    if (r?.state !== 'enough') throw new Error('genoeg');
    expect(climbPaceBasisLine(r.pace)).toBe('Uit 6 klimmen in 3 tochten van het laatste jaar, op hellingen van ongeveer 10 procent, met gemiddeld 9 kg rugzak.');
    const none = climbPace(enoughHikes(), TODAY);
    if (none?.state !== 'enough') throw new Error('genoeg');
    expect(climbPaceBasisLine(none.pace)).toContain('zonder bekend rugzakgewicht');
    expect(climbPaceWaitLine({ state: 'notYet', climbs: 1, trips: 1 })).toBe('Je eigen klimtempo zie je na 6 klimmen van minstens 50 meter uit 3 tochten. Nu zijn het er 1 uit 1 tocht.');
  });
});
