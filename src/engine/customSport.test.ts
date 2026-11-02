import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { activityToDraft, proposeImport, type ExternalActivity } from './activityImport';
import { autoCustomSports, customIdOf, customLabelOf, customQuestionLine, customTemplate, parseCustomSports, pendingCustomSports, type CustomSport } from './customSport';
import { withCountingSports } from './sportTemplate';
import { legFatigueOn } from './legFatigue';
import { logKindLabel, logSport } from './sports';
import { mapIntervalsActivity } from '../integrations/intervalsIcu';
import { countedSportOfExternalType } from '../data/sports';
import { resolveEffectiveStressProfile } from './stressProfile';

// Sporten die meetellen, stap 9: een eigen sport en yoga als gegevensrij. Nagemaakte data.
const { templates } = buildDefaultProgramData();
const D = '2026-11-05';
const tennis = (minutes = 75): ExternalActivity => ({ externalId: `test:tennis:${minutes}`, source: 'garmin', start: `${D}T19:00:00`, kind: 'other', durationSec: minutes * 60, treadmill: false, otherType: 'Tennis' });
const legsTennis: CustomSport = { id: 'custom_tennis', label: 'Tennis', type: 'Tennis', feel: 'legs', role: 'count' };

describe('yoga als gegevensrij', () => {
  it('wordt herkend aan zijn type, zonder code', () => {
    expect(countedSportOfExternalType('Yoga')).toBe('yoga');
  });
});

describe('de bron noemt het type, ASCEND bewaart het onder een eigen naam', () => {
  it('een onbekend type van intervals.icu wordt otherType; een bekende sport niet', () => {
    const raw = { id: 'i1', start_date_local: `${D}T19:00:00`, moving_time: 4500, type: 'Tennis' };
    expect(mapIntervalsActivity(raw)?.otherType).toBe('Tennis');
    expect(mapIntervalsActivity({ ...raw, type: 'Padel' })?.otherType).toBeUndefined();
    expect(mapIntervalsActivity({ ...raw, type: 'Run' })?.otherType).toBeUndefined();
    expect(customIdOf('Rock_Climbing')).toBe('custom_rock_climbing');
    expect(customLabelOf('VirtualRowing')).toBe('Virtual rowing');
  });
});

describe('je deed iets nieuws', () => {
  it('vraagt hoe het telt, tot je antwoordt', () => {
    const qs = pendingCustomSports([tennis()], {}, D);
    expect(qs.map((q) => q.type)).toEqual(['Tennis']);
    expect(customQuestionLine(qs[0])).toBe('Je deed iets nieuws: tennis. Hoe telt dit?');
    expect(pendingCustomSports([tennis()], { customSports: [legsTennis] }, D)).toEqual([]);
    expect(pendingCustomSports([tennis()], { customSports: [{ ...legsTennis, role: 'off' }] }, D)).toEqual([]);
  });

  it('met Vragen bij een nieuwe sport uit telt hij meteen mee, met het hele lijf als aanname', () => {
    expect(pendingCustomSports([tennis()], { sportCounting: { askNew: false } }, D)).toEqual([]);
    expect(autoCustomSports([tennis()], { sportCounting: { askNew: false } })).toEqual([{ id: 'custom_tennis', label: 'Tennis', type: 'Tennis', feel: 'whole', role: 'count' }]);
  });

  it('het antwoord vult de kenmerken in: benen, armen en schouders, of het hele lijf', () => {
    expect(resolveEffectiveStressProfile(customTemplate(legsTennis)).lowerBodyLoad).toBe('moderate');
    expect(resolveEffectiveStressProfile(customTemplate({ ...legsTennis, feel: 'arms' }))).toMatchObject({ lowerBodyLoad: 'none', upperBodyLoad: 'heavy' });
  });

  it('leest defensief', () => {
    expect(parseCustomSports([legsTennis, { type: 'Tennis', feel: 'legs', role: 'count' }, { type: 'X', feel: 'voeten', role: 'count' }, 'rommel'])).toEqual({ value: [legsTennis], skipped: 3 });
  });
});

describe('meetellen', () => {
  const all = withCountingSports(templates, { customSports: [legsTennis] });

  it('een eigen sport die meetelt wordt een voorstel onder zijn eigen sjabloon, geen loop', () => {
    expect(proposeImport(tennis(), [], templates, [])).toBeUndefined();
    const p = proposeImport(tennis(), [], all, []);
    expect(p?.template?.id).toBe('sport_custom_tennis');
    const draft = activityToDraft(tennis(), p!.template!);
    expect(draft.customSport).toBe('custom_tennis');
    const log = { ...draft, id: 'x' } as SessionLog;
    expect(logSport(log)).toBeUndefined();
    expect(logKindLabel(log)).toBe('Tennis');
  });

  it('telt mee voor je benen, met Negeren niet', () => {
    const log: SessionLog = { id: 't1', templateId: 'sport_custom_tennis', type: 'cardio', customSport: 'custom_tennis', completedDate: D, completedAt: `${D}T20:30:00Z`, variant: 'custom', durationMinutes: 75, rpe: 6, source: 'garmin' };
    const on = legFatigueOn('2026-11-06', { logs: [log], plannedSessions: [], templates: all, today: D }).index;
    const off = legFatigueOn('2026-11-06', { logs: [log], plannedSessions: [], templates: withCountingSports(templates, { customSports: [{ ...legsTennis, role: 'off' }] }), today: D }).index;
    expect(on).toBeGreaterThan(0);
    expect(off).toBe(0);
  });
});
