import { describe, it, expect, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ActivityDetail } from '../models/activityDetail';
import type { MorningCheckIn } from '../models/checkIn';
import type { TrainingGoal } from '../models/goals';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import {
  CALIBRATION_RULE, CALIBRATION_TEMPLATE_ID, DECLINE_QUIET_DAYS, calibrationAdvice, calibrationContext, calibrationIntervalDays,
  calibrationView, findCalibrationDay, readCalibration, resolveCalibrationHike, type CalibrationAdviceInput,
} from './ijktocht';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { applyPlanChangeItems } from './proposalEngine';
import { planPass } from './planPass';
import { hasRole } from './templateRoles';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { rankCandidateTemplates } from './weeklyPrescriptionBuilder';
import { buildSessionBrief } from './sessionBrief';
import { SESSION_STYLE } from '../data/sessionStyle';

// Alles hier is nagemaakt. Vandaag is woensdag 11 november 2026.
const TODAY = '2026-11-11';
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));

const planned = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0 });
const log = (templateId: string, date: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id: `log-${templateId}-${date}`, templateId, type: byId.get(templateId)?.type ?? 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 60, ...over,
} as SessionLog);
const easyRun = (date: string) => log('tpl_easy_run', date, { cardioData: { durationMinutes: 40, distanceKm: 6, source: 'manual' } });
const mountainGoal = (over: Partial<TrainingGoal> = {}): TrainingGoal => ({ id: 'g', name: 'Huttentocht', status: 'active', kind: 'trek_hut', targetDate: '2027-07-01', requirements: [], createdAt: '', updatedAt: '', ...over }) as TrainingGoal;
const raceGoal = (): TrainingGoal => ({ id: 'r', name: '10 km', status: 'active', kind: 'run_race', targetDate: '2027-04-01', requirements: [], createdAt: '', updatedAt: '' }) as TrainingGoal;

// De week van 9 november: di kracht boven, wo zware benen, za rustige loop, zo lange duurloop. De week erna:
// di kracht boven, wo zware benen. Maandag is de vaste rustdag.
const week = (): PlannedSession[] => [
  planned('upA', 'tpl_upper_a', '2026-11-10'),
  planned('legs', 'tpl_lower_a', '2026-11-11'),
  planned('sat', 'tpl_easy_run', '2026-11-14'),
  planned('long', 'tpl_long_run', '2026-11-15'),
  planned('upA2', 'tpl_upper_a', '2026-11-17'),
  planned('legs2', 'tpl_lower_a', '2026-11-18'),
];
const context = { intervalDays: 42, trips: [] };
const input = (over: Partial<CalibrationAdviceInput> = {}): CalibrationAdviceInput => ({
  today: TODAY, logs: [easyRun('2026-11-02')], plannedSessions: week(), templates, context, respondedIds: new Set(), restDay: 1, ...over,
});
const one = (over: Partial<CalibrationAdviceInput> = {}) => calibrationAdvice(input(over))[0];

describe('het sjabloon IJktocht', () => {
  const t = byId.get(CALIBRATION_TEMPLATE_ID)!;
  it('bestaat, rustig, zonder vaste dag, geen zware beendag en geen harde loop', () => {
    expect(t.name).toBe('IJktocht');
    expect(t.type).toBe('hiking');
    expect(t.defaultDayOfWeek).toBeUndefined();
    expect(t.weeklyProgression).toBeUndefined();
    expect(hasRole(t, 'calibration')).toBe(true);
    expect(isLegHeavyTemplate(t)).toBe(false);
    expect(isHardRun(t)).toBe(false);
  });

  it('komt nooit vanzelf in het weekvoorschrift: alleen een voorstel met Akkoord zet hem neer', () => {
    for (const key of ['aerobic_base', 'climbing', 'backpack_carry', 'hiking_endurance', 'time_on_feet']) {
      expect(rankCandidateTemplates(key as never, templates, new Set([key])), key).not.toContain(CALIBRATION_TEMPLATE_ID);
    }
  });

  it('de standaardweek van het demoprogramma heeft geen ijktocht', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T08:00:00'));
    const demo = buildDefaultProgramData();
    vi.useRealTimers();
    expect(demo.plannedSessions.some((s) => s.templateId === CALIBRATION_TEMPLATE_ID)).toBe(false);
  });

  it('heeft een eigen kop en feitenrij: rustig, zelfde route en rugzak', () => {
    expect(SESSION_STYLE[CALIBRATION_TEMPLATE_ID]).toBeDefined();
    const brief = buildSessionBrief(t, '2026-11-21', null, { templates });
    expect(brief.headline).toBe('WANDELEN · IJKTOCHT');
    expect(brief.facts).toEqual([
      { value: '60 min', label: 'totaal' },
      { value: 'Zone 2', label: 'hele zinnen' },
      { value: 'Zelfde', label: 'route en rugzak als vorige keer' },
    ]);
    expect(brief.howTo!.join(' ')).toBe(t.notes);
  });
});

describe('de instelling', () => {
  it('leest elke onbekende waarde als het advies (een oude back-up zonder het veld)', () => {
    expect(resolveCalibrationHike(undefined)).toBe('zes');
    expect(resolveCalibrationHike('soms')).toBe('zes');
    expect(resolveCalibrationHike('acht')).toBe('acht');
    expect(resolveCalibrationHike('uit')).toBe('uit');
    expect(calibrationIntervalDays('zes')).toBe(42);
    expect(calibrationIntervalDays('acht')).toBe(56);
  });

  it('alleen met een bergdoel of een bergtocht; uit is uit', () => {
    expect(calibrationContext(undefined, [], [], [], TODAY)).toBeUndefined();
    expect(calibrationContext(undefined, [raceGoal()], [], [], TODAY)).toBeUndefined();
    expect(calibrationContext(undefined, [mountainGoal()], [], [], TODAY)).toEqual({ intervalDays: 42, trips: [{ date: '2027-07-01', name: 'Huttentocht' }] });
    expect(calibrationContext('acht', [mountainGoal()], [], [], TODAY)?.intervalDays).toBe(56);
    expect(calibrationContext('uit', [mountainGoal()], [], [], TODAY)).toBeUndefined();
    const trek: LeavePeriod = { id: 't', kind: 'trek', startDate: '2027-03-01', endDate: '2027-03-05', trek: { name: 'Vogezen', terrain: 'mountain', tent: false, importance: 'goal' } };
    expect(calibrationContext(undefined, [], [], [trek], TODAY)?.trips).toEqual([{ date: '2027-03-01', name: 'Vogezen' }]);
  });
});

describe('IJKTOCHT: de nulmeting en daarna om de zes weken', () => {
  it('zonder logs zegt hij niets; met één log komt de nulmeting als voorstel, nooit stil', () => {
    expect(calibrationAdvice(input({ logs: [] }))).toEqual([]);
    const a = one()!;
    expect(a.ruleId).toBe(CALIBRATION_RULE);
    expect(a.id).toBe('ijktocht:nul');
    expect(a.title).toBe('Een nulmeting voor de berg');
    // Zaterdag en zondag deze week staan vol; de eerste vrije zaterdag is 21 november.
    expect(a.proposal?.changes).toEqual([expect.objectContaining({ action: 'add', newSessionDraft: { templateId: CALIBRATION_TEMPLATE_ID, scheduledDate: '2026-11-21', weekStartDate: '2026-11-16' } })]);
    expect(a.effect).toContain('Met Akkoord');
    expect(a.effect).toContain('Met Liever niet');
  });

  it('zonder context (uit, of geen bergdoel) niets', () => {
    expect(calibrationAdvice(input({ context: undefined }))).toEqual([]);
  });

  it('de grensdag: 41 dagen na de vorige niets, 42 dagen wel', () => {
    expect(one({ logs: [log(CALIBRATION_TEMPLATE_ID, '2026-10-01')] })).toBeUndefined();
    const a = one({ logs: [log(CALIBRATION_TEMPLATE_ID, '2026-09-30')] })!;
    expect(a.id).toBe('ijktocht:2026-09-30');
    expect(a.title).toBe('Tijd voor je ijktocht');
    expect(a.lead).toContain('6 weken geleden');
    // Om de acht weken: 55 dagen niets, 56 wel.
    expect(one({ context: { intervalDays: 56, trips: [] }, logs: [log(CALIBRATION_TEMPLATE_ID, '2026-09-17')] })).toBeUndefined();
    expect(one({ context: { intervalDays: 56, trips: [] }, logs: [log(CALIBRATION_TEMPLATE_ID, '2026-09-16')] })?.proposal).toBeDefined();
  });

  it('een ijktocht van na vandaag telt niet mee', () => {
    expect(one({ logs: [log(CALIBRATION_TEMPLATE_ID, '2026-09-30'), log(CALIBRATION_TEMPLATE_ID, '2026-11-20')] })?.id).toBe('ijktocht:2026-09-30');
  });

  it('staat er al een ijktocht klaar, dan geen voorstel; een overgeslagen telt niet', () => {
    expect(one({ plannedSessions: [...week(), planned('ijk', CALIBRATION_TEMPLATE_ID, '2026-11-28')] })).toBeUndefined();
    expect(one({ plannedSessions: [...week(), { ...planned('ijk', CALIBRATION_TEMPLATE_ID, '2026-11-28'), status: 'skipped' }] })?.proposal).toBeDefined();
  });

  it('ziek of op vakantie zonder training: stil', () => {
    expect(one({ illnessEpisodes: [{ id: 'z', startDate: '2026-11-10' } as never] })).toBeUndefined();
    expect(one({ leave: [{ id: 'v', kind: 'no_training', startDate: '2026-11-10', endDate: '2026-11-12' }] })).toBeUndefined();
  });

  it('na Liever niet twee weken stil, geteld vanaf de dag van je antwoord, daarna een nieuw id', () => {
    const answeredOn = { 'ijktocht:nul': '2026-10-29' };
    const respondedIds = new Set(['ijktocht:nul']);
    // 13 dagen na het antwoord: stil.
    expect(one({ answeredOn, respondedIds })).toBeUndefined();
    // 14 dagen: de vraag komt terug met een eigen id.
    expect(DECLINE_QUIET_DAYS).toBe(14);
    expect(one({ answeredOn: { 'ijktocht:nul': '2026-10-28' }, respondedIds })?.id).toBe('ijktocht:nul:2026-11-11');
    // Een antwoord zonder dag: stil tot de volgende ijktocht.
    expect(one({ respondedIds })).toBeUndefined();
  });

  it('na Akkoord staat hij in de week, blijft hij staan na twee planrondes en zwijgt het advies', () => {
    const a = one()!;
    const applied = applyPlanChangeItems(a.proposal!.changes, week(), () => 'ijk', { by: 'proposal', at: 'x' }).sessions;
    let n = 0;
    const ctx = { today: TODAY, logs: [easyRun('2026-11-02')], templates, program: null, blocks: [], restDay: 1, newId: () => `pass-${n++}` };
    const once = planPass(applied, ctx);
    const twice = planPass(once.sessions, ctx);
    for (const pass of [once, twice]) {
      expect(pass.sessions.find((x) => x.id === 'ijk')).toMatchObject({ status: 'planned', scheduledDate: '2026-11-21', templateId: CALIBRATION_TEMPLATE_ID });
      expect(pass.repairs.filter((r) => JSON.stringify(r).includes('"ijk"'))).toEqual([]);
    }
    expect(twice.sessions.filter((x) => x.id !== 'ijk').map((x) => [x.id, x.scheduledDate, x.status])).toEqual(week().map((x) => [x.id, x.scheduledDate, x.status]));
    expect(one({ plannedSessions: applied })).toBeUndefined();
    // Gedaan en gelogd: de volgende ronde begint bij die dag.
    expect(one({ today: '2026-11-22', plannedSessions: applied, logs: [easyRun('2026-11-02'), log(CALIBRATION_TEMPLATE_ID, '2026-11-21', { plannedSessionId: 'ijk' })] })).toBeUndefined();
  });

  it('zonder dag die past: een zin, geen voorstel', () => {
    const full: PlannedSession[] = [];
    for (let i = 0; i < 16; i++) {
      const d = new Date(Date.UTC(2026, 10, 12 + i)).toISOString().slice(0, 10);
      full.push(planned(`f${i}`, 'tpl_long_run', d));
    }
    const a = one({ plannedSessions: full })!;
    expect(a.proposal).toBeUndefined();
    expect(a.lead).toContain('geen vrije dag die past');
    expect(a.effect).toContain('Na Begrepen');
  });
});

describe('de dagkeuze', () => {
  it('zaterdag en zondag eerst; anders een doordeweekse vrije dag', () => {
    expect(findCalibrationDay(input(), '2026-11-12', '2026-11-25')).toBe('2026-11-21');
    // Alleen deze week: geen vrij weekend, dan een vrije dag doordeweeks. Donderdag 12 is de dag na zware benen.
    expect(findCalibrationDay(input(), '2026-11-12', '2026-11-15')).toBe('2026-11-13');
  });

  it('niets langs of zwaars de dag ervoor of erna', () => {
    // Zaterdag 21 met een lange duurloop op zondag 22: dan zondag de 22e niet en zaterdag ook niet.
    const sessions = [...week(), planned('long2', 'tpl_long_run', '2026-11-22')];
    expect(findCalibrationDay(input({ plannedSessions: sessions }), '2026-11-21', '2026-11-21')).toBeUndefined();
    // Een harde loop de dag ervoor.
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('tempo', 'tpl_tempo_run', '2026-11-20')] }), '2026-11-21', '2026-11-21')).toBeUndefined();
    // Een rustige loop de dag ervoor mag.
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('easy', 'tpl_easy_run', '2026-11-20')] }), '2026-11-21', '2026-11-21')).toBe('2026-11-21');
  });

  it('de grensdag voor een tocht: 14 dagen ervoor mag, 13 niet', () => {
    const trips = { intervalDays: 42, trips: [{ date: '2026-12-05', name: 'Eifel' }] };
    expect(findCalibrationDay(input({ context: trips }), '2026-11-21', '2026-11-21')).toBe('2026-11-21');
    expect(findCalibrationDay(input({ context: trips }), '2026-11-22', '2026-11-22')).toBeUndefined();
  });

  it('drie dagen voor een test en een week voor een wedstrijd vrij (de dag zelf telt mee)', () => {
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('test', 'tpl_test_run', '2026-11-25')] }), '2026-11-21', '2026-11-21')).toBe('2026-11-21');
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('test', 'tpl_test_run', '2026-11-24')] }), '2026-11-21', '2026-11-21')).toBeUndefined();
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('race', 'tpl_race', '2026-11-29')] }), '2026-11-21', '2026-11-21')).toBe('2026-11-21');
    expect(findCalibrationDay(input({ plannedSessions: [...week(), planned('race', 'tpl_race', '2026-11-28')] }), '2026-11-21', '2026-11-21')).toBeUndefined();
  });

  it('niet op of naast een dag van een ander voorstel, niet op de rustdag', () => {
    expect(findCalibrationDay(input({ taken: new Set(['2026-11-22']) }), '2026-11-21', '2026-11-21')).toBeUndefined();
    expect(findCalibrationDay(input({ restDay: 6 }), '2026-11-21', '2026-11-21')).toBeUndefined();
  });

  it('een tijdsbudget dat te klein is laat de dag vallen', () => {
    const tight = { sat: { preferredMinutes: 30, softFlexMinutes: 0, hardMaximumMinutes: 30 } };
    expect(findCalibrationDay(input({ dailyTimeBudget: tight as never }), '2026-11-21', '2026-11-21')).toBeUndefined();
  });
});

describe('samen met de afdaalklok in computeAdvice', () => {
  it('de ijktocht ontwijkt de dag van de trapsessie', () => {
    const base: AdviceInputs = {
      logs: [log('tpl_ruck_walk', '2026-10-21', { outdoorData: { durationMinutes: 90, elevationGainM: 150, elevationLossM: 150, source: 'garmin' } })],
      plannedSessions: week(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: TODAY, restDay: 1,
      descentClock: { trips: [] }, calibration: context,
    };
    const all = computeAdvice(base);
    // Zonder de instelling (geen context) geen ijktocht.
    expect(computeAdvice({ ...base, calibration: undefined }).some((a) => a.ruleId === CALIBRATION_RULE)).toBe(false);
    const descent = all.find((a) => a.ruleId === 'DESCENT-CLOCK');
    const calibration = all.find((a) => a.ruleId === CALIBRATION_RULE);
    expect(descent?.proposal).toBeDefined();
    expect(calibration?.proposal).toBeDefined();
    const dDay = descent!.proposal!.changes[0].newSessionDraft!.scheduledDate;
    const cDay = calibration!.proposal!.changes[0].newSessionDraft!.scheduledDate;
    expect(Math.abs(new Date(dDay).getTime() - new Date(cDay).getTime())).toBeGreaterThan(86_400_000);
  });
});

// --- De meting ----------------------------------------------------------------------------------------------

// Een nagemaakt profiel: 12 stukken van 5 minuten, één klim van 300 m in 30 minuten, hartslag per derde.
const detail = (over: { hr?: [number, number, number]; climbSec?: number; tempC?: number; coverage?: number } = {}): ActivityDetail => {
  const [a, b, c] = over.hr ?? [120, 125, 130];
  return {
    version: 1, source: 'garmin' as never, sliceCount: 12, movingSec: 3600,
    slices: Array.from({ length: 12 }, (_, i) => ({ sec: 300, distanceM: 500, gainM: 25, lossM: 25, heartRate: i < 4 ? a : i < 8 ? b : c })),
    stretches: [{ kind: 'climb', startSec: 0, sec: over.climbSec ?? 1800, distanceM: 2000, metres: 300, gradientPct: 15 }],
    ...(over.tempC !== undefined ? { conditions: { tempC: over.tempC, source: 'lookup' } } : {}),
    quality: { heartRateCoveragePct: over.coverage ?? 100 },
  };
};
const ijk = (date: string, d: ActivityDetail | undefined, packKg = 8, over: Partial<SessionLog> = {}) =>
  log(CALIBRATION_TEMPLATE_ID, date, { outdoorData: { durationMinutes: 60, distanceKm: 6, elevationGainM: 300, backpackWeightKg: packKg, source: 'garmin' }, ...(d ? { detail: d } : {}), ...over });
const checkIn = (date: string, legs: MorningCheckIn['legs']): MorningCheckIn => ({ date, legs } as MorningCheckIn);

describe('wat een ijktocht meet', () => {
  it('klimtempo op de klimmen, hartslag eerste en laatste derde, benen de ochtend erna', () => {
    const r = readCalibration(ijk('2026-10-03', detail()), [checkIn('2026-10-04', 'stijf'), checkIn('2026-10-03', 'flink')]);
    expect(r.climb).toEqual({ metresPerHour: 600, basis: 'klimmen' });
    expect(r.heart).toEqual({ first: 120, last: 130, rise: 10 });
    expect(r.legs).toBe('stijf');
    expect(r.packKg).toBe(8);
  });

  it('zonder profiel: de stijging over de hele tocht, en geen hartslag', () => {
    const r = readCalibration(ijk('2026-10-03', undefined), []);
    expect(r.climb).toEqual({ metresPerHour: 300, basis: 'geheel' });
    expect(r.heart).toBeUndefined();
    expect(r.legs).toBeUndefined();
  });

  it('een hartslag die niet de hele tocht meeliep telt niet', () => {
    expect(readCalibration(ijk('2026-10-03', detail({ coverage: 70 })), []).heart).toBeUndefined();
  });
});

describe('de rij en het blad in Je stand', () => {
  it('zonder ijktocht geen rij', () => {
    expect(calibrationView([easyRun('2026-11-02')], [])).toBeUndefined();
  });

  it('één ijktocht: de nulmeting, met de drie regels', () => {
    const v = calibrationView([ijk('2026-10-03', detail())], [checkIn('2026-10-04', 'fris')])!;
    expect(v.row).toBe('nulmeting op za 3 oktober');
    expect(v.lines.map((l) => l.head)).toEqual(['Klimtempo', 'Hartslag aan het eind', 'Benen de dag erna']);
    expect(v.lines[0].text).toBe('600 m per uur op de klimmen.');
    expect(v.lines[1].text).toBe('In het laatste deel 10 slagen hoger dan in het eerste.');
    expect(v.lines[2].text).toBe('De ochtend erna: fris.');
    expect(v.caveats).toEqual([]);
  });

  it('sneller en minder oplopen tegen de vorige, met de ruis van 8 procent', () => {
    const logs = [ijk('2026-08-22', detail({ climbSec: 2000, hr: [118, 126, 134] })), ijk('2026-10-03', detail())];
    const v = calibrationView(logs, [checkIn('2026-08-23', 'spierpijn'), checkIn('2026-10-04', 'stijf')])!;
    // 300 m in 2000 s is 540 m per uur; nu 600: ruim 11 procent sneller.
    expect(v.row).toBe('sneller bergop dan vorige keer');
    expect(v.lines[0].text).toBe('Sneller: 600 m per uur, vorige keer 540.');
    expect(v.lines[1].text).toBe('Loopt minder op: in het laatste deel 10 slagen hoger dan in het eerste, vorige keer 16 slagen hoger.');
    expect(v.lines[2].text).toBe('Frisser: de ochtend erna stijf, vorige keer spierpijn.');
    // Binnen 8 procent is gelijk.
    const close = calibrationView([ijk('2026-08-22', detail({ climbSec: 1900 })), ijk('2026-10-03', detail())], [])!;
    expect(close.lines[0].text).toContain('Gelijk');
    expect(close.row).toBe('gelijk aan vorige keer');
  });

  it('voorbehoud bij een andere rugzak, route of temperatuur', () => {
    const before = ijk('2026-08-22', detail({ tempC: 24 }), 6, { outdoorData: { durationMinutes: 60, distanceKm: 8, elevationGainM: 300, backpackWeightKg: 6, source: 'garmin' } });
    const v = calibrationView([before, ijk('2026-10-03', detail({ tempC: 10 }))], [])!;
    expect(v.caveats).toEqual([
      'Andere rugzak: 8 kg, vorige keer 6 kg.',
      'De afstand of de stijging verschilt, dus de route was waarschijnlijk niet dezelfde.',
      'Het was kouder: 10 graden, vorige keer 24. Warmte duwt je hartslag omhoog.',
    ]);
  });

  it('anders gemeten (klimmen tegen de hele tocht) is niet te vergelijken', () => {
    const v = calibrationView([ijk('2026-08-22', undefined), ijk('2026-10-03', detail())], [])!;
    expect(v.lines[0].text).toBe('600 m per uur op de klimmen. De vorige is anders gemeten, dus niet te vergelijken.');
  });
});
