import { describe, expect, it } from 'vitest';
import { CONDITIONAL_ROWS, rowAvailability, settingAvailabilityOnPage } from './settingsAvailability';
import { rowSummary, type SettingsFacts } from './settingsSummary';
import { DEFAULT_WATCH_USE } from './watchUse';
import { SETTINGS_PAGES, allRowIds } from '../data/settingsLayout';
import { SETTINGS_INDEX } from '../data/settingsIndex';

function facts(over: Partial<SettingsFacts> = {}): SettingsFacts {
  return {
    today: '2026-10-22',
    settings: { strengthTrackedExternally: false, introSoundEnabled: true },
    dailyTimeBudget: {},
    pairing: 'automatic',
    position: null,
    goal: null,
    treks: 0,
    vacations: 0,
    activeInjuries: 0,
    strengthExternal: false,
    ambition: { chosen: 'standaard', effective: 'standaard' },
    weight: null,
    watch: { linked: true, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false },
    macroFactor: { readAt: '2026-10-22T08:00:00.000Z', leads: true },
    strengthDurations: [{ name: 'A', minutes: 60, source: 'default', basedOn: 0 }],
    folderSupported: true,
    folderChosen: false,
    storage: 'protected',
    snapshots: 0,
    buildLabel: '22 okt, 18:59',
    longSundayVisible: true,
    ...over,
  };
}

describe('rowAvailability', () => {
  it('staat er alles, dan is er niets aan de hand', () => {
    for (const id of CONDITIONAL_ROWS) expect(rowAvailability(id, facts())).toEqual({ available: true });
  });

  it('Kracht meerekenen uit: de Forge-keuzes staan er niet, de sportschool en de schakelaar wel', () => {
    const off = facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: true, strengthModel: { enabled: false } } });
    expect(rowAvailability('forge-opwarmen', off)).toEqual({ available: false, reason: 'Deze keuze verschijnt pas als Kracht meerekenen aan staat.' });
    expect(settingAvailabilityOnPage('sportschool', off)).toEqual({ available: true });
    expect(settingAvailabilityOnPage('forge', off)).toEqual({ available: true });
  });

  it('niet gekoppeld: de horlogeschakelaars en de MacroFactor-keuzes staan er niet', () => {
    const none = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false }, macroFactor: { leads: true } });
    expect(rowAvailability('slaap', none).available).toBe(false);
    expect(rowAvailability('macrofactor-leidend', none).available).toBe(false);
    expect(settingAvailabilityOnPage('horloge-gebruik', none).available).toBe(false);
    expect(settingAvailabilityOnPage('garmin', none).available).toBe(true);
  });

  it('twee trainingen op een dag op Nee: zware dingen staat er niet', () => {
    expect(rowAvailability('zware-dingen', facts({ pairing: 'never' })).available).toBe(false);
  });

  it('elke rij die ontbreekt heeft een eigen reden, en elke reden is een zin zonder streepje', () => {
    const states: SettingsFacts[] = [
      facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: true, strengthModel: { enabled: false }, overviews: { weekReview: false, clothingAdvice: false } }, pairing: 'never', strengthDurations: [], folderSupported: false, longSundayVisible: false, watch: null, macroFactor: null }),
    ];
    for (const f of states) {
      for (const page of SETTINGS_PAGES) {
        for (const row of allRowIds(page.id)) {
          if (!rowSummary(row, f).hidden) continue;
          const a = rowAvailability(row, f);
          expect(a.available).toBe(false);
          if (!a.available) {
            expect(CONDITIONAL_ROWS, row).toContain(row);
            expect(a.reason).toMatch(/^Deze keuze verschijnt/);
            expect(a.reason).not.toMatch(/[–—]/);
          }
        }
      }
    }
  });

  it('elke instelling uit de index kent zijn beschikbaarheid', () => {
    for (const item of SETTINGS_INDEX) expect(['object']).toContain(typeof settingAvailabilityOnPage(item.id, facts()));
  });
});
