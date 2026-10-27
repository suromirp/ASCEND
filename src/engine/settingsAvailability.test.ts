import { describe, expect, it } from 'vitest';
import { CONDITIONAL_ROWS, adjustedRows, adviceTarget, rowAvailability, settingAvailabilityOnPage } from './settingsAvailability';
import { rowSummary, type SettingsFacts } from './settingsSummary';
import { DEFAULT_WATCH_USE } from './watchUse';
import { SETTINGS_PAGES, SHOW_WHEN, allRowIds } from '../data/settingsLayout';
import { SETTINGS_INDEX } from '../data/settingsIndex';

const watch = (over: Partial<NonNullable<SettingsFacts['watch']>> = {}): NonNullable<SettingsFacts['watch']> => ({
  linked: true, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: true, ...over,
});

function facts(over: Partial<SettingsFacts> = {}): SettingsFacts {
  return {
    today: '2026-10-22',
    settings: { strengthTrackedExternally: false, introSoundEnabled: true },
    dailyTimeBudget: {},
    pairing: 'automatic',
    position: { weekInProgram: 3, totalWeeks: 20, phaseName: 'Basis' },
    goal: { name: 'Voorbeeldtocht', date: '2027-07-01' },
    treks: 1,
    vacations: 0,
    activeInjuries: 0,
    strengthExternal: false,
    ambition: { chosen: 'standaard', effective: 'standaard' },
    weight: null,
    hasBodyFat: true,
    watch: watch(),
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

const withSettings = (extra: Partial<SettingsFacts['settings']>) => facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: true, ...extra } });

describe('rowAvailability', () => {
  it('staat alles aan en is alles gekoppeld, dan is er niets aan de hand', () => {
    for (const id of CONDITIONAL_ROWS) expect(rowAvailability(id, facts()), id).toEqual({ available: true });
  });

  it('Kracht meerekenen uit: de Forge-keuzes staan er niet, de sportschool en de schakelaar wel', () => {
    const off = withSettings({ strengthModel: { enabled: false } });
    expect(rowAvailability('forge-opwarmen', off)).toEqual({ available: false, reason: 'Zichtbaar zodra Kracht meerekenen aan staat', parent: 'forge' });
    expect(settingAvailabilityOnPage('sportschool', off)).toEqual({ available: true });
    expect(settingAvailabilityOnPage('forge', off)).toEqual({ available: true });
  });

  it('Geschatte 1RM tonen uit: de keuze tussen 1RM en werkgewicht en de MacroFactor-1RM staan er niet', () => {
    const noOneRm = withSettings({ strengthModel: { showOneRm: false } });
    const expected = { available: false, reason: 'Zichtbaar zodra Geschatte 1RM tonen aan staat', parent: 'forge-1rm' };
    expect(rowAvailability('forge-weergave', noOneRm)).toEqual(expected);
    expect(settingAvailabilityOnPage('forge-1rm-macrofactor', noOneRm)).toEqual(expected);
    expect(rowAvailability('forge-weergave', facts())).toEqual({ available: true });
  });

  it('niet gekoppeld: de horlogeschakelaars en de MacroFactor-keuzes staan er niet, met de reden', () => {
    const none = facts({ watch: watch({ linked: false }), macroFactor: { leads: true } });
    expect(rowAvailability('slaap', none)).toEqual({ available: false, reason: 'Zichtbaar zodra Garmin is gekoppeld', parent: 'garmin' });
    expect(rowAvailability('macrofactor-leidend', none)).toMatchObject({ available: false, parent: 'macrofactor' });
    expect(settingAvailabilityOnPage('horloge-gebruik', none).available).toBe(false);
    expect(settingAvailabilityOnPage('garmin', none).available).toBe(true);
  });

  it('Trainingen uit: de Garmin-kinderen verdwijnen, ze worden niet uitgegrijsd', () => {
    const noActivities = facts({ watch: watch({ use: { ...DEFAULT_WATCH_USE, activities: false } }) });
    for (const id of ['vanzelf-afvinken', 'garmin-leidend', 'correcties-overnemen', 'horloge-details']) {
      expect(rowAvailability(id, noActivities), id).toEqual({ available: false, reason: 'Zichtbaar zodra Trainingen van je horloge aan staat', parent: 'garmin-trainingen' });
      expect(rowSummary(id, noActivities).hidden).toBe(true);
      expect(rowSummary(id, noActivities).sub).toBeUndefined();
    }
    expect(rowAvailability('slaap', noActivities)).toEqual({ available: true });
  });

  it('Trainingen naar je horloge uit: de opties voor het sturen verdwijnen', () => {
    const noSend = facts({ watch: watch({ sendEnabled: false }) });
    for (const id of ['horloge-voorvoegsel', 'horloge-hartslag', 'horloge-rustige-loop', 'horloge-gedaan-weghalen', 'horloge-status']) {
      expect(rowAvailability(id, noSend), id).toMatchObject({ available: false, parent: 'naar-horloge' });
    }
  });

  it('sets in MacroFactor: de rusttimer, het bijsturen en de invulkeuzes doen niets en verdwijnen, het scherm aan blijft', () => {
    const external = facts({ strengthExternal: true });
    for (const id of ['bundel-rusttimer', 'forge-rust', 'forge-signaal', 'forge-geluid', 'forge-bijsturen', 'bundel-invullen', 'forge-rir-vooraf', 'forge-doorvoeren', 'forge-schijven']) {
      expect(rowAvailability(id, external), id).toMatchObject({ available: false, parent: 'kracht' });
    }
    expect(rowAvailability('forge-scherm', external)).toEqual({ available: true });
    expect(rowAvailability('forge-opwarmen', external)).toEqual({ available: true });
  });

  it('de rusttimer uit: het signaal en het geluid verdwijnen, bij geen signaal ook het geluid', () => {
    const noTimer = withSettings({ strengthModel: { restAuto: false } });
    expect(rowAvailability('forge-signaal', noTimer)).toMatchObject({ available: false, parent: 'forge-rust' });
    expect(rowAvailability('forge-geluid', noTimer)).toMatchObject({ available: false, parent: 'forge-rust' });
    const noAlert = withSettings({ strengthModel: { restAlert: 'off' } });
    expect(rowAvailability('forge-geluid', noAlert)).toMatchObject({ available: false, parent: 'forge-signaal' });
  });

  it('zonder doel en zonder tocht: de rijen van het doel en de tochten staan er niet', () => {
    const none = facts({ goal: null, position: null, treks: 0 });
    expect(rowAvailability('programma', none)).toMatchObject({ available: false, parent: 'doelen' });
    expect(rowAvailability('na-hoofddoel', none)).toMatchObject({ available: false, parent: 'doelen' });
    expect(rowAvailability('bundel-tochten', none)).toMatchObject({ available: false, parent: 'doelen' });
    expect(rowAvailability('rust-na-tocht', none).available).toBe(false);
    // Een tocht zonder hoofddoel is genoeg voor het blad Tochten.
    expect(rowAvailability('bundel-tochten', facts({ goal: null, position: null, treks: 1 }))).toEqual({ available: true });
  });

  it('twee trainingen op een dag op Nee: zware dingen staat er niet', () => {
    expect(rowAvailability('zware-dingen', facts({ pairing: 'never' })).available).toBe(false);
  });

  it('elke rij die ontbreekt heeft een eigen reden "Zichtbaar zodra ...", zonder streepje', () => {
    const states: SettingsFacts[] = [
      facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: true, strengthModel: { enabled: false, restAuto: false }, overviews: { weekReview: false, clothingAdvice: false, morningCheckIn: false }, runInsight: { enabled: false }, sky: 'night' }, pairing: 'never', strengthDurations: [], folderSupported: false, longSundayVisible: false, watch: null, macroFactor: null, goal: null, position: null, treks: 0, strengthExternal: true, hasBodyFat: false, notice: { support: 'unavailable', granted: false } }),
      facts({ watch: watch({ use: { ...DEFAULT_WATCH_USE, activities: false }, sendEnabled: false }) }),
    ];
    for (const f of states) {
      for (const page of SETTINGS_PAGES) {
        for (const row of allRowIds(page.id)) {
          // De rij Aangepaste instellingen is er niet als niets anders staat: geen afhankelijkheid.
          if (row === 'aangepast' || !rowSummary(row, f).hidden) continue;
          const a = rowAvailability(row, f);
          expect(a.available, row).toBe(false);
          if (!a.available) {
            expect(CONDITIONAL_ROWS, row).toContain(row);
            expect(a.reason).toMatch(/^Zichtbaar zodra /);
            expect(a.reason).not.toMatch(/[–—]/);
            expect(SETTINGS_INDEX.map((i) => i.id), `${row}: ${a.parent} is geen instelling`).toContain(a.parent);
          }
        }
      }
    }
  });

  it('elke voorwaarde noemt een instelling uit de index als oplossing', () => {
    const ids = new Set(SETTINGS_INDEX.map((i) => i.id));
    for (const [row, blockers] of Object.entries(SHOW_WHEN)) for (const b of blockers) expect(ids.has(b.parent), `${row} -> ${b.parent}`).toBe(true);
  });

  it('elke instelling uit de index kent zijn beschikbaarheid', () => {
    for (const item of SETTINGS_INDEX) expect(['object']).toContain(typeof settingAvailabilityOnPage(item.id, facts()));
  });
});

describe('adviceTarget', () => {
  it('een zichtbare instelling springt naar haar eigen rij, een verborgen naar de rij die het oplost', () => {
    expect(adviceTarget('horloge-status', facts())).toEqual({ page: 'koppelingen', row: 'bundel-horloge-sturen', sheet: true });
    const unlinked = facts({ watch: watch({ linked: false, sendEnabled: false }) });
    const target = adviceTarget('horloge-status', unlinked);
    expect(target?.reason).toBeTruthy();
    expect(target?.page).toBe('koppelingen');
    expect(target?.row).not.toBe('horloge-status');
    expect(adviceTarget('bestaat-niet', facts())).toBeUndefined();
  });
});

describe('adjustedRows', () => {
  it('is leeg zolang alles op het advies staat', () => {
    expect(adjustedRows(facts().settings).size).toBe(0);
  });

  it('wijst de rij aan, ook als de instelling in het blad van een rij zit', () => {
    const s = withSettings({ ambition: 'stevig', strengthModel: { restSound: 'bell' } }).settings;
    const rows = adjustedRows(s);
    expect(rows.has('ambitie')).toBe(true);
    expect(rows.has('bundel-rusttimer')).toBe(true);
    expect(rows.has('forge-geluid')).toBe(false);
    expect(adjustedRows(s, 'planning').has('ambitie')).toBe(true);
    expect(adjustedRows(s, 'gegevens').size).toBe(0);
  });
});

describe("de rij Aangepaste instellingen", () => {
  it("is er niet zolang alles op het advies staat, en telt anders het aantal", () => {
    expect(rowSummary("aangepast", facts()).hidden).toBe(true);
    const r = rowSummary("aangepast", withSettings({ ambition: "stevig" }));
    expect(r.hidden).toBe(false);
    expect(r.value).toBe("1");
  });
});
