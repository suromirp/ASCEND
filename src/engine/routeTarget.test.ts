import { describe, expect, it } from 'vitest';
import type { SessionLog, SessionTemplate } from '../models/training';
import type { RouteTarget } from '../models/route';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { DEFAULT_PACE_SEC_KM, isTrekDay, walkShortText, resolveRouteStyle, roundStart, routeTarget, searchesOnOpen, targetText, walkKind, wantsRoute, wantsRouteAt } from './routeTarget';
import { climbHikes } from './fixtures/climbLogs';
import { progressionTarget } from './programLayout';
import { recentRunPace } from './recentRunPace';
import { templateSport } from './sports';
import { hasRole } from './templateRoles';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const easy = byId('tpl_easy_run');

// Een nagemaakte loop op een nagemaakte dag.
const run = (date: string, km: number, minutes: number): SessionLog => ({
  id: `log_${date}`, templateId: 'tpl_easy_run', completedDate: date, type: 'cardio', variant: 'full', durationMinutes: minutes,
  cardioData: { modality: 'running', durationMinutes: minutes, distanceKm: km },
} as unknown as SessionLog);

describe('routeTarget', () => {
  it('zonder lopen en zonder test: de duur op een rustig standaardtempo, op een halve kilometer', () => {
    const t = routeTarget({ template: easy, date: '2026-11-12' });
    expect(t).toEqual({ distanceKm: Math.round(((35 * 60) / DEFAULT_PACE_SEC_KM) * 2) / 2, ascentM: 0 });
    expect(t.distanceKm).toBe(5.5);
  });

  it('rekent met het echte tempo van je laatste lopen, en anders met het tempo uit je test', () => {
    const logs = [run('2026-11-05', 7, 35)]; // 5:00 per km
    expect(routeTarget({ template: easy, date: '2026-11-12', logs }).distanceKm).toBe(7);
    expect(routeTarget({ template: easy, date: '2026-11-12', testPace: { fast: 330, slow: 370 } }).distanceKm).toBe(6);
    // Je eigen lopen gaan voor de test.
    expect(routeTarget({ template: easy, date: '2026-11-12', logs, testPace: { fast: 330, slow: 370 } }).distanceKm).toBe(7);
  });

  it('een afstand en hoogtemeters op de training zelf gaan voor', () => {
    const long = { ...easy, id: 'tpl_x', outdoorTarget: { targetDistanceKm: 14, targetElevationM: 300 } };
    expect(routeTarget({ template: long, date: '2026-11-12' })).toEqual({ distanceKm: 14, ascentM: 300 });
  });

  it('een heuveltraining zonder getal vraagt ongeveer drie meter stijgen per minuut', () => {
    const hills = { ...easy, id: 'tpl_y', roles: ['hills'] } as SessionTemplate;
    expect(routeTarget({ template: hills, date: '2026-11-12' }).ascentM).toBe(110);
  });

  it('blijft binnen 2 en 40 km', () => {
    expect(routeTarget({ template: { ...easy, cardioTarget: { targetDistanceKm: 0.4 } }, date: '2026-11-12' }).distanceKm).toBe(2);
    expect(routeTarget({ template: { ...easy, cardioTarget: { targetDistanceKm: 80 } }, date: '2026-11-12' }).distanceKm).toBe(40);
  });
});

describe('wantsRoute, roundStart, resolveRouteStyle, targetText', () => {
  it('alleen een looptraining krijgt een route', () => {
    expect(wantsRoute(easy)).toBe(true);
    expect(wantsRoute(templates.find((t) => t.type === 'strength'))).toBe(false);
    expect(wantsRoute(undefined)).toBe(false);
  });

  it('het startpunt gaat afgerond op twee decimalen de deur uit', () => {
    expect(roundStart({ lat: 52.123456, lon: 5.654321 })).toEqual({ lat: 52.12, lon: 5.65 });
  });

  it('Avontuurlijk is het advies; iets onbekends ook', () => {
    expect(resolveRouteStyle(undefined)).toBe('adventure');
    expect(resolveRouteStyle('simple')).toBe('simple');
    expect(resolveRouteStyle('onzin')).toBe('adventure');
  });

  it('zegt de training in woorden', () => {
    expect(targetText({ distanceKm: 9, ascentM: 300 })).toBe('9 km, 300 hoogtemeters');
    expect(targetText({ distanceKm: 5.5, ascentM: 0 })).toBe('5,5 km');
  });
});

describe('wantsRouteAt: een route alleen buiten en te voet', () => {
  it('Loopband: geen route; Buiten: wel', () => {
    expect(wantsRouteAt(easy, 'run_treadmill')).toBe(false);
    expect(wantsRouteAt(easy, 'run_outdoor')).toBe(true);
    expect(wantsRouteAt(easy, 'run_walk')).toBe(true);
  });
  it('binnen en op de fiets: geen looplus', () => {
    expect(wantsRouteAt(easy, 'bike_indoor')).toBe(false);
    expect(wantsRouteAt(easy, 'bike_outdoor')).toBe(false);
  });
  it('zonder keuze of met een sleutel die de training niet kent: de training zelf, zoals voorheen', () => {
    expect(wantsRouteAt(easy, undefined)).toBe(true);
    expect(wantsRouteAt(easy, 'bestaat_niet')).toBe(true);
  });
  it('kracht krijgt nooit een lus; een wandeling buiten wel (Routes voor wandelen, stap 2)', () => {
    expect(wantsRouteAt(byId('tpl_upper_a'), 'run_outdoor')).toBe(false);
    expect(wantsRouteAt(byId('tpl_ruck_walk'), 'loaded_hike')).toBe(true);
  });
});

// ---- Routes voor wandelen, stap 2 (docs/visie/Ontwerp routes wandelen en rugzak.md) ------------------

const { program } = buildDefaultProgramData();
// Het doel zonder het tempo (rates, alleen in het geheugen; apart getoetst).
const noRates = ({ rates: _rates, ...rest }: RouteTarget) => rest;

// Het doel van een looptraining zoals het was voor de wandelroutes (15 november), letterlijk overgenomen:
// geen enkel loopsjabloon mag een ander doel krijgen.
function runTargetBefore({ template, date, logs = [], testPace }: { template: SessionTemplate; date: string; logs?: SessionLog[]; testPace?: { fast: number; slow: number } }) {
  const step = progressionTarget(template, program, date);
  const minutes = step?.minutes ?? template.durationVariants.full;
  const fixedKm = template.cardioTarget?.targetDistanceKm ?? template.outdoorTarget?.targetDistanceKm;
  const recent = recentRunPace(logs, template.id, date)?.range;
  const range = recent ?? testPace;
  const pace = range && range.fast > 0 && range.slow > 0 ? (range.fast + range.slow) / 2 : DEFAULT_PACE_SEC_KM;
  const rawKm = fixedKm ?? (minutes * 60) / pace;
  const distanceKm = Math.min(40, Math.max(2, Math.round(rawKm * 2) / 2));
  const asked = step?.step.elevationGainM ?? template.outdoorTarget?.targetElevationM;
  const ascentM = asked ?? (hasRole(template, 'hills') ? Math.round((minutes * 3) / 10) * 10 : 0);
  return { distanceKm, ascentM: Math.max(0, ascentM) };
}

// Elke dag van het programma, en de week erna.
const programDays = (): string[] => {
  const weeks = program.phases.reduce((n, p) => n + p.weekCount, 0) + 1;
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(program.startDate, i));
};

// De datum van week `week` van fase `phaseId` (de zaterdag).
const dayIn = (phaseId: string, week: number): string => {
  let start = program.startDate;
  for (const p of program.phases) {
    if (p.id === phaseId) return addDays(start, (week - 1) * 7 + 5);
    start = addDays(start, p.weekCount * 7);
  }
  throw new Error(phaseId);
};

describe('loopsjablonen: precies hetzelfde doel als voor de wandelroutes', () => {
  const runs = templates.filter((t) => t.type !== 'strength' && templateSport(t) === 'running');
  it('er zijn loopsjablonen, en geen ervan is een wandeltraining', () => {
    expect(runs.length).toBeGreaterThan(8);
    for (const t of runs) expect(walkKind(t)).toBeUndefined();
  });
  it('elke dag van het programma, zonder lopen, met je laatste lopen en met een test', () => {
    const logs = [run('2026-11-05', 7, 35)];
    for (const template of runs) {
      for (const date of programDays()) {
        for (const extra of [{}, { logs }, { testPace: { fast: 330, slow: 370 } }]) {
          // Ook met een lichaamsgewicht en de keuzes erbij: een loop leest die niet.
          const now = routeTarget({ template, date, program, ...extra, bodyKg: 75, walkPace: 'norm', walkClash: 'ascent' });
          expect(now).toStrictEqual(runTargetBefore({ template, date, ...extra }));
        }
      }
    }
  });
});

describe('wandelsjablonen per fase', () => {
  const mountain = byId('tpl_mountain_hike');
  const dayOne = byId('tpl_hike_day_one');
  const ruck = byId('tpl_ruck_walk');
  const climb = byId('tpl_bergconditie');
  const recovery = byId('tpl_herstel');
  const target = (template: SessionTemplate, date: string) => routeTarget({ template, date, program });

  it('vijf wandelsjablonen krijgen een lus, Trap af niet', () => {
    for (const t of [mountain, dayOne, ruck, climb]) expect(walkKind(t)).toBe('walk');
    expect(walkKind(recovery)).toBe('recovery');
    for (const t of [mountain, dayOne, ruck, climb, recovery]) expect(wantsRoute(t)).toBe(true);
    const stairs = byId('tpl_stairs_down');
    expect(walkKind(stairs)).toBeUndefined();
    expect(wantsRoute(stairs)).toBe(false);
    // Ook een opgeslagen Trap af zonder de rol descent (van voor die rol): de rollen van zijn id.
    expect(wantsRoute({ ...stairs, roles: [] })).toBe(false);
    // Een herstel zonder de keuze Herstelwandeling (een eigen sjabloon) is geen wandeling.
    expect(wantsRoute({ ...recovery, id: 'tpl_eigen_herstel' })).toBe(false);
  });

  it('Basis en Opbouw: de getallen van het sjabloon; de bergtocht van 3 uur met 500 m wordt 375 m en 8 km', () => {
    for (const phase of ['phase_1', 'phase_2']) {
      expect(target(mountain, dayIn(phase, 1))).toMatchObject({ distanceKm: 8, ascentM: 375, askedAscentM: 500, minutes: 180 });
      expect(noRates(target(recovery, dayIn(phase, 1)))).toStrictEqual({ distanceKm: 3, ascentM: 0, minutes: 45 });
    }
    expect(noRates(target(ruck, dayIn('phase_1', 1)))).toStrictEqual({ distanceKm: 4, ascentM: 0, minutes: 60, packKg: 5 });
    expect(noRates(target(climb, dayIn('phase_1', 1)))).toStrictEqual({ distanceKm: 2, ascentM: 90, minutes: 45, askedAscentM: 400 });
  });

  it('Bergcapaciteit en Expeditieklaar: de stap van de ladder, met de rugzak van de week', () => {
    expect(noRates(target(mountain, dayIn('phase_3', 1)))).toStrictEqual({ distanceKm: 5.5, ascentM: 250, minutes: 120, packKg: 11, askedAscentM: 400 });
    expect(noRates(target(mountain, dayIn('phase_4', 1)))).toStrictEqual({ distanceKm: 10.5, ascentM: 500, minutes: 240, packKg: 13, askedAscentM: 800 });
    expect(noRates(target(dayOne, dayIn('phase_4', 1)))).toStrictEqual({ distanceKm: 6.5, ascentM: 310, minutes: 150, packKg: 13, askedAscentM: 500 });
    expect(noRates(target(ruck, dayIn('phase_4', 1)))).toStrictEqual({ distanceKm: 5, ascentM: 0, minutes: 74, packKg: 13 });
  });

  it('elke dag: de duur is die van de stap, en nooit meer hoogtemeters dan gevraagd', () => {
    for (const template of [mountain, dayOne, ruck, climb, recovery]) {
      for (const date of programDays()) {
        const t = target(template, date);
        const step = progressionTarget(template, program, date);
        expect(t.minutes).toBe(step?.minutes ?? template.durationVariants.full);
        expect(t.ascentM).toBeLessThanOrEqual(t.askedAscentM ?? 0);
        expect(t.distanceKm).toBeGreaterThanOrEqual(2);
        for (const n of [t.distanceKm, t.ascentM, t.minutes!]) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it('hoogtemeters eerst houdt wat de training vraagt; de wandelnorm en je eigen tempo als keuze', () => {
    const date = dayIn('phase_1', 1);
    expect(routeTarget({ template: mountain, date, program, walkClash: 'ascent' })).toMatchObject({ ascentM: 500, askedAscentM: 500, minutes: 180 });
    const pace = { climbs: 8, trips: 4, upMph: 450, upSlow: 400, upFast: 500, descents: 5, downMph: 700, packKg: 6, gradeLow: 9, gradeHigh: 12, lastDate: '2026-10-01' };
    expect(routeTarget({ template: mountain, date, program, climb: { state: 'enough', pace } }).ascentM).toBe(500);
    expect(routeTarget({ template: mountain, date, program, climb: { state: 'enough', pace }, walkPace: 'norm' }).ascentM).toBe(375);
  });

  it('loopband en binnen: geen route', () => {
    expect(wantsRouteAt(mountain, 'mountain_hike_treadmill_stairs')).toBe(false);
    expect(wantsRouteAt(mountain, 'mountain_hike_outdoor')).toBe(true);
    expect(wantsRouteAt(ruck, 'incline_treadmill')).toBe(false);
    expect(wantsRouteAt(climb, 'stairmaster')).toBe(false);
    expect(wantsRouteAt(climb, 'bike_easy_friday')).toBe(false);
    expect(wantsRouteAt(climb, 'hill_hike')).toBe(true);
    expect(wantsRouteAt(recovery, 'rest')).toBe(false);
    expect(wantsRouteAt(recovery, 'gentle_mobility')).toBe(false);
    expect(wantsRouteAt(recovery, 'very_easy_bike')).toBe(false);
    expect(wantsRouteAt(recovery, 'recovery_walk')).toBe(true);
  });

  it('een herstelwandeling zoekt alleen na een tik; de rest zoals de instelling Lus zoeken zegt', () => {
    expect(searchesOnOpen(recovery)).toBe(false);
    expect(searchesOnOpen(recovery, { minutes: 45 }, 'onzin')).toBe(false);
    expect(searchesOnOpen(recovery, { minutes: 45 }, 'withRecovery')).toBe(true);
    for (const t of [mountain, dayOne, ruck, climb, easy]) expect(searchesOnOpen(t, routeTarget({ template: t, date: dayIn('phase_1', 1), program }))).toBe(true);
  });

  it('een wandeling boven 3 uur zoekt niet vanzelf, tot en met 180 minuten wel; een loop kent die grens niet', () => {
    expect(searchesOnOpen(mountain, { minutes: 180 })).toBe(true);
    expect(searchesOnOpen(mountain, { minutes: 181 })).toBe(false);
    expect(searchesOnOpen(mountain, { minutes: Number.NaN })).toBe(false);
    expect(searchesOnOpen(mountain, target(mountain, dayIn('phase_4', 1)))).toBe(false);
    expect(searchesOnOpen(easy, { minutes: 240 })).toBe(true);
  });

  it('een dag van een tocht in je planning is een tochtdag; de dagen eromheen niet', () => {
    const trek = [{ id: 'l1', kind: 'trek' as const, startDate: '2027-06-10', endDate: '2027-06-14' }];
    expect(isTrekDay(trek, '2027-06-10')).toBe(true);
    expect(isTrekDay(trek, '2027-06-14')).toBe(true);
    expect(isTrekDay(trek, '2027-06-15')).toBe(false);
    expect(isTrekDay([{ ...trek[0], kind: 'free_days' }], '2027-06-12')).toBe(false);
    expect(isTrekDay(undefined, '2027-06-12')).toBe(false);
  });

  it('een korte wandeling krijgt geen ondergrens van 2 km, wel van 1 km', () => {
    const short = { ...recovery, durationVariants: { full: 20 } };
    expect(routeTarget({ template: short, date: dayIn('phase_1', 1) }).distanceKm).toBe(1.5);
    expect(routeTarget({ template: { ...recovery, durationVariants: { full: 5 } }, date: dayIn('phase_1', 1) }).distanceKm).toBe(1);
    // Een loop houdt zijn ondergrens van 2 km.
    expect(routeTarget({ template: { ...easy, durationVariants: { full: 5 } }, date: dayIn('phase_1', 1) }).distanceKm).toBe(2);
  });

  it('targetText zegt de duur en wat de training vraagt, niet wat in de duur past', () => {
    const t = target(mountain, dayIn('phase_1', 1));
    expect(t.ascentM).toBe(375);
    expect(targetText(t)).toBe('3 uur met 500 hoogtemeters en 6 kg rugzak');
    expect(targetText({ ...t, packKg: undefined })).toBe('3 uur met 500 hoogtemeters');
    expect(targetText(target(ruck, dayIn('phase_1', 1)))).toBe('1 uur met 5 kg rugzak');
    expect(targetText(target(recovery, dayIn('phase_1', 1)))).toBe('45 minuten');
    expect(walkShortText(t)).toBe('3 uur, ongeveer 8 km');
    expect(walkShortText({ distanceKm: 8, ascentM: 0 })).toBeUndefined();
    // Het tempo gaat mee: de wandelnorm zonder rugzak.
    expect(t.rates).toMatchObject({ basis: 'norm', upMph: 300, downMph: 500, flatKmh: 4 });
  });

  it('de rugzak rekent door routeTarget heen, alleen met een eigen klimtempo en je lichaamsgewicht', () => {
    // Gemeten met 2 kg op je klimmen; de training vraagt 14 kg.
    const heavy = { ...mountain, outdoorTarget: { targetElevationM: 500, backpackWeightKg: 14 } };
    const date = dayIn('phase_1', 1);
    const logs = climbHikes(2);
    const without = routeTarget({ template: heavy, date, logs });
    const withBody = routeTarget({ template: heavy, date, logs, bodyKg: 75 });
    expect(noRates(without)).toStrictEqual({ distanceKm: 8.5, ascentM: 500, minutes: 180, packKg: 14, askedAscentM: 500 });
    expect(noRates(withBody)).toStrictEqual({ distanceKm: 8, ascentM: 500, minutes: 180, packKg: 14, askedAscentM: 500 });
    expect(withBody.distanceKm).toBeLessThan(without.distanceKm);
    // Zonder eigen klimtempo doet het lichaamsgewicht niets: de wandelnorm rekent zonder rugzak.
    expect(routeTarget({ template: heavy, date, bodyKg: 75 })).toStrictEqual(routeTarget({ template: heavy, date }));
    // Met de keuze wandelnorm ook niet.
    expect(routeTarget({ template: heavy, date, logs, bodyKg: 75, walkPace: 'norm' })).toStrictEqual(routeTarget({ template: heavy, date }));
  });
});
