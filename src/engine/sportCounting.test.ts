import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { activityToDraft, pendingProposals, proposeImport, type ExternalActivity } from './activityImport';
import { legFatigueOn } from './legFatigue';
import { cleanSportCounting, resolveSportCounting, sportRole } from './sportRole';
import { countingSportTemplates, sportTemplate, sportTemplateId, withCountingSports } from './sportTemplate';
import { adviceFelt, pendingSports, sportQuestionLine } from './sportAsk';
import { logKindLabel, logSport, sessionKindLabel, templateSport } from './sports';
import { autoTickMatch } from './autoTick';

// Sporten die meetellen, stap 4: importeren en meetellen. Nagemaakte data.
const { templates } = buildDefaultProgramData();
const D = '2026-11-05';

const activity = (sport: ExternalActivity['countedSport'], start: string, minutes: number, extra: Partial<ExternalActivity> = {}): ExternalActivity => ({
  externalId: `test:${sport}:${start}`, source: 'garmin', start, kind: 'other', durationSec: minutes * 60, treadmill: false, countedSport: sport, ...extra,
});

const counting = { sportHandling: { padel: { role: 'count' }, swimming: { role: 'count' }, football: { role: 'count' } } };

let n = 0;
const sportLog = (sport: NonNullable<SessionLog['countedSport']>, date: string, minutes: number, rpe?: number): SessionLog => ({
  id: `s${n++}`, templateId: sportTemplateId(sport), type: 'cardio', countedSport: sport, completedDate: date, completedAt: `${date}T19:00:00Z`,
  variant: 'custom', durationMinutes: minutes, rpe, source: 'garmin',
});

describe('de rol zonder keuze', () => {
  it('een nieuwe sport heeft nog geen rol en telt dus niet mee', () => {
    expect(sportRole({}, 'padel')).toBeUndefined();
    expect(countingSportTemplates({})).toEqual([]);
  });

  it('met Vragen bij een nieuwe sport uit begint hij op Telt mee', () => {
    expect(sportRole({ sportCounting: { askNew: false } }, 'padel')).toBe('count');
    // Een sport die ASCEND plant blijft zoals hij was.
    expect(sportRole({ sportCounting: { askNew: false } }, 'cycling')).toBe('off');
  });

  it('de instelling leest defensief en heeft het advies als standaard', () => {
    expect(resolveSportCounting(undefined)).toEqual({ askNew: true, askFelt: true, rest: 'ruim' });
    expect(resolveSportCounting({ askFelt: false, rest: 'korter' })).toEqual({ askNew: true, askFelt: false, rest: 'korter' });
    expect(cleanSportCounting({ askNew: 'ja', rest: 'kort', extra: 1 })).toEqual({ value: undefined, skipped: 3 });
    expect(cleanSportCounting({ askFelt: false })).toEqual({ value: { askFelt: false }, skipped: 0 });
  });
});

describe('het afgeleide sjabloon', () => {
  it('is er alleen voor een sport die meetelt', () => {
    expect(countingSportTemplates({ sportHandling: { padel: { role: 'count' }, swimming: { role: 'off' } } }).map((t) => t.id)).toEqual(['sport_padel']);
    expect(withCountingSports(templates, counting).length).toBe(templates.length + 3);
  });

  it('is geen hardlopen, en heet naar de sport', () => {
    const t = sportTemplate('swimming');
    expect(templateSport(t)).toBeUndefined();
    expect(sessionKindLabel(t)).toBe('Zwemmen');
    const l = sportLog('padel', D, 60);
    expect(logSport(l)).toBeUndefined();
    expect(logKindLabel(l)).toBe('Padel');
  });
});

describe('de vraag op Vandaag', () => {
  it('een sport zonder rol vraagt hoe hij telt, de nieuwste activiteit eerst', () => {
    const acts = [activity('swimming', '2026-11-01T07:00:00', 45), activity('swimming', '2026-11-04T07:00:00', 40), activity('padel', '2026-11-03T20:00:00', 90)];
    const qs = pendingSports(acts, {}, D);
    expect(qs.map((q) => [q.sport, q.activity.start.slice(0, 10), q.count])).toEqual([['swimming', '2026-11-04', 2], ['padel', '2026-11-03', 1]]);
    expect(sportQuestionLine(qs[0])).toBe('Je deed zwemmen. Hoe telt dit?');
  });

  it('na een keuze is de vraag weg, ook bij Negeren', () => {
    const acts = [activity('padel', '2026-11-03T20:00:00', 90)];
    expect(pendingSports(acts, { sportHandling: { padel: { role: 'off' } } }, D)).toEqual([]);
    expect(pendingSports(acts, { sportCounting: { askNew: false } }, D)).toEqual([]);
  });

  it('het blad kiest de gebruikelijke zwaarte voor', () => {
    expect(adviceFelt('football')).toBe('zwaar');
    expect(adviceFelt('padel')).toBe('pittig');
  });
});

describe('importeren', () => {
  const padel = activity('padel', '2026-11-03T20:00:00', 90, { avgHeartRate: 142 });

  it('zonder rol geen voorstel: er verandert niets', () => {
    expect(proposeImport(padel, [], templates, [])).toBeUndefined();
    expect(pendingProposals([padel], [], [], templates, [])).toEqual([]);
  });

  it('met Telt mee een voorstel onder het sjabloon van de sport', () => {
    const all = withCountingSports(templates, counting);
    const p = proposeImport(padel, [], all, []);
    expect(p?.template?.id).toBe('sport_padel');
    const draft = activityToDraft(padel, p!.template!);
    expect(draft).toMatchObject({ templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', durationMinutes: 90, completedDate: '2026-11-03', externalId: padel.externalId });
    expect(draft.sport).toBeUndefined();
    expect(draft.cardioData?.avgHeartRate).toBe(142);
  });

  it('een opgeslagen activiteit wordt geen tweede keer voorgesteld', () => {
    const all = withCountingSports(templates, counting);
    const stored = { ...activityToDraft(padel, sportTemplate('padel')), id: 'x' } as SessionLog;
    expect(proposeImport(padel, [], all, [stored])).toBeUndefined();
  });

  it('een padelpartij vinkt nooit vanzelf een loop af', () => {
    const all = withCountingSports(templates, counting);
    const run = { id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned' as const, order: 0 };
    expect(autoTickMatch(padel, [run], all, [], D)).toBeUndefined();
  });
});

describe('meetellen voor je benen', () => {
  const all = withCountingSports(templates, counting);
  const at = (logs: SessionLog[], tpls = all) => legFatigueOn(addDay(D), { logs, plannedSessions: [], templates: tpls, today: D }).index;

  it('een padelpartij verhoogt de beenindex, een uur zwemmen nauwelijks', () => {
    const padel = at([sportLog('padel', D, 90, 5)]);
    const swim = at([sportLog('swimming', D, 60, 5)]);
    expect(padel).toBeGreaterThan(8);
    expect(swim).toBeLessThan(3);
    expect(padel).toBeGreaterThan(swim * 4);
  });

  it('een voetbalwedstrijd telt zwaarder dan padel', () => {
    expect(at([sportLog('football', D, 90, 7)])).toBeGreaterThan(at([sportLog('padel', D, 90, 7)]));
  });

  it('een gelogde sport met rol Negeren telt niet mee', () => {
    const off = withCountingSports(templates, { sportHandling: { padel: { role: 'off' } } });
    expect(at([sportLog('padel', D, 90, 7)], off)).toBe(0);
  });
});

function addDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}
