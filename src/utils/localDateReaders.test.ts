// Plekken die een opgeslagen tijdstempel als dag lezen: net na middernacht in Nederland
// (23:30 UTC op 27 oktober is 00:30 op 28 oktober) moet het de lokale dag zijn.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import { formatDateNL } from './dates';
import { backupFileName } from '../storage/backup';
import { declinedRules, type StoredResponse } from '../engine/learning';
import { shouldOfferRestore } from '../engine/freshStart';
import { buildChangeLog } from '../engine/changeLog';
import { sourceUpdateLine } from '../engine/sourceCorrection';
import { rowSummary, type SettingsFacts } from '../engine/settingsSummary';
import type { PlanChangeProposal } from '../models/planChange';
import type { SessionLog } from '../models/training';

const NA_MIDDERNACHT = '2026-10-27T23:30:00.000Z';

describe('lokale dag van een tijdstempel', () => {
  it('de testomgeving draait in Nederlandse tijd', () => {
    expect(new Date(NA_MIDDERNACHT).getDate()).toBe(28);
  });

  it('de bestandsnaam van een back-up gebruikt de lokale dag', () => {
    expect(backupFileName(NA_MIDDERNACHT)).toBe('ascend-2026-10-28.ascend-backup.json');
  });

  it('een antwoord net na middernacht telt mee in de terugblik van zes weken', () => {
    const at = '2026-10-14T22:30:00.000Z'; // 15 oktober, 00:30
    const r = (response: StoredResponse['response']): StoredResponse => ({ ruleId: 'REST-PULL', response, at });
    // 26 november min 42 dagen is 15 oktober: die dag hoort er nog bij.
    expect([...declinedRules({ a: r('declined'), b: r('declined') }, '2026-11-26')]).toEqual(['REST-PULL']);
  });

  it('een verse start telt vanaf de lokale dag van het zaaien', () => {
    const input = { seededAt: '2026-10-14T22:30:00.000Z', today: '2026-10-28', logCount: 0 };
    expect(shouldOfferRestore(input)).toBe(true); // 13 dagen geleden, niet 14
  });

  it('het wijzigingslogboek rekent een voorstel van 00:30 bij die dag', () => {
    const p = {
      id: 'p1', trigger: 'manual', issue: 'x', changes: [], alternatives: [], consequences: '', explanation: '',
      createdAt: NA_MIDDERNACHT, resolvedAt: NA_MIDDERNACHT, resolution: 'rejected',
    } as unknown as PlanChangeProposal;
    expect(buildChangeLog([p], [], [], '2026-10-28')).toHaveLength(1);
  });

  it('"Bijgewerkt uit intervals.icu op" noemt de lokale dag', () => {
    const log = { sourceSync: { seen: {}, externalId: 'x', updated: { at: NA_MIDDERNACHT, block: 'cardioData', previous: {} } } } as unknown as SessionLog;
    expect(sourceUpdateLine(log)).toBe(`Bijgewerkt uit intervals.icu op ${formatDateNL('2026-10-28')}`);
  });

  it('de rij van MacroFactor noemt de lokale dag van de laatste export', () => {
    const f = { today: '2026-10-28', settings: {}, macroFactor: { readAt: NA_MIDDERNACHT, leads: true } } as unknown as SettingsFacts;
    const row = rowSummary('macrofactor', f);
    expect(row.value).not.toMatch(/27/);
    expect(row.value).toMatch(/28/);
  });
});
