import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import { sportOfLog } from './sportOfLog';
import { logKindLabel, logSport } from './sports';
import { lookOfLog, sportKeyOfLog } from '../components/logbook/sportLook';
import { extractEvidenceFromLogs } from './capability';
import { sportTemplateId } from './sportTemplate';
import { normalizeBackupToCurrentModel } from '../storage/backupNormalize';

// Backlog M: tot 14 november bewaarde Losse training een sport zonder countedSport of customSport, alleen met het
// templateId van het afgeleide sjabloon en type cardio. Bij het lezen telt zo'n log als die sport, niet als
// hardlopen. Nagemaakte logs; het log zelf verandert nooit.
const base = { completedDate: '2026-11-10', completedAt: '2026-11-10T19:00:00Z', variant: 'full', durationMinutes: 60, source: 'manual' } as const;
const oldSwim: SessionLog = { ...base, id: 'old_swim', templateId: sportTemplateId('swimming'), type: 'cardio', cardioData: { distanceKm: 2 } } as SessionLog;
const oldPadel: SessionLog = { ...base, id: 'old_padel', templateId: 'sport_padel', type: 'cardio', rpe: 7 } as SessionLog;
const oldFootball: SessionLog = { ...base, id: 'old_foot', templateId: 'sport_football', type: 'cardio' } as SessionLog;
const oldCustom: SessionLog = { ...base, id: 'old_tennis', templateId: 'sport_custom_tennis', type: 'cardio' } as SessionLog;
const realRun: SessionLog = { ...base, id: 'run', templateId: 'tpl_easy_run', type: 'cardio', cardioData: { distanceKm: 8, durationMinutes: 48 } } as SessionLog;
const newPadel: SessionLog = { ...base, id: 'new_padel', templateId: 'sport_padel', type: 'cardio', countedSport: 'padel' } as SessionLog;
const unknownId: SessionLog = { ...base, id: 'odd', templateId: 'sport_kitesurf', type: 'cardio' } as SessionLog;

describe('sportOfLog (oude sportlogs)', () => {
  it('leidt de sport af uit het templateId van een oud log zonder eigen veld', () => {
    expect(sportOfLog(oldSwim)).toEqual({ countedSport: 'swimming' });
    expect(sportOfLog(oldPadel)).toEqual({ countedSport: 'padel' });
    expect(sportOfLog(oldFootball)).toEqual({ countedSport: 'football' });
    expect(sportOfLog(oldCustom)).toEqual({ customSport: 'custom_tennis' });
  });

  it('een oud sportlog telt niet als hardlopen', () => {
    for (const l of [oldSwim, oldPadel, oldFootball, oldCustom]) {
      expect(logSport(l)).toBeUndefined();
      expect(sportKeyOfLog(l)).toBe('other');
    }
    expect(logKindLabel(oldSwim)).toBe('Zwemmen');
    expect(logKindLabel(oldCustom)).toBe('Tennis');
    expect(lookOfLog(oldPadel).label).toBe('Padel');
    expect(lookOfLog(oldCustom).label).toBe('Tennis');
    // Capaciteit: 2 km zwemmen is geen hardloopbewijs.
    expect(extractEvidenceFromLogs([oldSwim]).some((e) => e.key.discipline === 'running')).toBe(false);
  });

  it('een echte hardlooplog blijft hardlopen', () => {
    expect(sportOfLog(realRun)).toEqual({});
    expect(logSport(realRun)).toBe('running');
    expect(lookOfLog(realRun).label).toBe('Lopen');
  });

  it('een log met countedSport blijft zoals hij is', () => {
    expect(sportOfLog(newPadel)).toEqual({ countedSport: 'padel' });
    // Het eigen veld gaat voor op het templateId.
    expect(sportOfLog({ ...newPadel, templateId: 'sport_swimming' })).toEqual({ countedSport: 'padel' });
    expect(sportOfLog({ ...base, id: 'c', templateId: 'sport_padel', type: 'cardio', customSport: 'custom_tennis' } as SessionLog)).toEqual({ customSport: 'custom_tennis' });
  });

  it('een onbekend templateId valt terug zoals nu', () => {
    expect(sportOfLog(unknownId)).toEqual({});
    expect(logSport(unknownId)).toBe('running');
    expect(sportOfLog({ ...oldPadel, templateId: 'sport_' })).toEqual({});
    expect(sportOfLog({ ...oldPadel, templateId: 'sport_custom_' })).toEqual({});
    expect(sportOfLog({ ...oldPadel, templateId: 'sport_custom_Ten nis' })).toEqual({});
  });

  it('alleen een oud log van type cardio zonder eigen sport', () => {
    expect(sportOfLog({ ...oldPadel, type: 'hiking' })).toEqual({});
    expect(sportOfLog({ ...oldPadel, sport: 'cycling' })).toEqual({});
  });

  it('herschrijft het log nooit', () => {
    const before = JSON.stringify(oldSwim);
    sportOfLog(oldSwim);
    logSport(oldSwim);
    lookOfLog(oldSwim);
    expect(JSON.stringify(oldSwim)).toBe(before);
    expect('countedSport' in oldSwim).toBe(false);
  });

  it('een import van een nagemaakte oude back-up leest de sport goed, zonder migratie van de vorm', () => {
    const legacy = { schemaVersion: 1, exportDate: '2026-11-12T00:00:00.000Z', program: null, templates: [], plannedSessions: [], sessionLogs: [oldSwim, oldCustom, realRun], objectives: [], milestoneProgress: [], settings: {} };
    const logs = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(legacy))).sessionLogs ?? [];
    const byId = new Map(logs.map((l) => [l.id, l]));
    expect('countedSport' in byId.get('old_swim')!).toBe(false);
    expect(byId.get('old_swim')!.templateId).toBe('sport_swimming');
    expect(logSport(byId.get('old_swim')!)).toBeUndefined();
    expect(logKindLabel(byId.get('old_swim')!)).toBe('Zwemmen');
    expect(logKindLabel(byId.get('old_tennis')!)).toBe('Tennis');
    expect(logSport(byId.get('run')!)).toBe('running');
  });
});
