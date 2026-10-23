import { describe, expect, it } from 'vitest';
import { durationNote, groupSummary, rowSummary, searchValue, SUB_MAX_LENGTH, type SettingsFacts } from './settingsSummary';
import { PAGE_ROWS, SETTINGS_PAGES, allRowIds } from '../data/settingsLayout';
import { DEFAULT_WATCH_USE } from './watchUse';

const TODAY = '2026-10-22';

function facts(over: Partial<SettingsFacts> = {}): SettingsFacts {
  return {
    today: TODAY,
    settings: { strengthTrackedExternally: false, introSoundEnabled: true, lastExportedAt: '2026-10-10T09:00:00.000Z' },
    dailyTimeBudget: {
      tue: { preferredMinutes: 60 }, wed: { preferredMinutes: 60 }, thu: { preferredMinutes: 60 },
      fri: { preferredMinutes: 60 }, sat: { preferredMinutes: 120 }, sun: { preferredMinutes: 150 },
    },
    pairing: 'automatic',
    position: { weekInProgram: 9, totalWeeks: 45, phaseName: 'OPBOUW' },
    goal: { name: 'GR5 / ALPENKLAAR', date: '2027-07-04' },
    treks: 2,
    vacations: 1,
    activeInjuries: 0,
    strengthExternal: true,
    ambition: { chosen: 'standaard', effective: 'standaard' },
    weight: { kg: 85.62, source: 'macrofactor', date: '2026-10-22' },
    watch: { linked: true, syncedAt: new Date(2026, 9, 22, 14, 2).toISOString(), use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false },
    macroFactor: { readAt: '2026-10-22T08:00:00.000Z', leads: true },
    strengthDurations: [
      { name: 'Bovenlichaam A', minutes: 55, source: 'learned', basedOn: 3 },
      { name: 'Benen A', minutes: 70, source: 'learned', basedOn: 4 },
    ],
    journeyOpen: 5,
    packKg: 8.4,
    folderSupported: true,
    folderChosen: true,
    storage: 'protected',
    snapshots: 2,
    buildLabel: '22 okt, 18:59',
    longSundayVisible: true,
    ...over,
  };
}

describe('rowSummary: planning', () => {
  it('telt de dagen met tijd en noemt de rustdag', () => {
    expect(rowSummary('trainingstijd', facts()).value).toBe('6 dagen');
    expect(rowSummary('trainingstijd', facts({ dailyTimeBudget: {} }))).toEqual({ value: 'Niet ingesteld', dim: true });
    expect(rowSummary('rustdag', facts()).value).toBe('Maandag');
    expect(rowSummary('rustdag', facts({ settings: { ...facts().settings, restDay: 3 } })).value).toBe('Woensdag');
  });

  it('een sport staat uit, op het weekschema (auto) of op een vast aantal', () => {
    const settings = { ...facts().settings, sportFrequency: { running: 3 } };
    expect(rowSummary('sport-running', facts({ settings }))).toEqual({ value: '3× per week' });
    expect(rowSummary('sport-hiking', facts({ settings }))).toEqual({ value: 'Weekschema', auto: true });
    expect(rowSummary('sport-cycling', facts({ settings }))).toEqual({ value: 'Uit', dim: true });
  });

  it('twee trainingen op een dag toont de korte keuze', () => {
    expect(rowSummary('meerdere', facts({ pairing: 'never' })).value).toBe('Nee');
    expect(rowSummary('meerdere', facts({ pairing: 'only_if_useful' })).value).toBe('Alleen nodig');
  });

  it('Ambitie zegt tijdelijk als ASCEND terugvalt', () => {
    expect(rowSummary('ambitie', facts()).value).toBe('Standaard');
    expect(rowSummary('ambitie', facts({ ambition: { chosen: 'stevig', effective: 'standaard' } })).value).toBe('Standaard, tijdelijk');
  });

  it('Benen en een zware loop verdwijnt als twee trainingen niet mag', () => {
    expect(rowSummary('zware-dingen', facts()).hidden).toBe(false);
    expect(rowSummary('zware-dingen', facts({ pairing: 'never' })).hidden).toBe(true);
  });

  it('de groep Planning zegt de rustdag en het aantal dagen, niet alleen "6 dagen"', () => {
    const s = groupSummary('planning', facts({ settings: { ...facts().settings, sportFrequency: { running: 3 } } }));
    expect(s.value).toBe('Rust ma, 6 dagen');
    expect(s.sub).toBe('Hardlopen 3× per week');
  });
});

describe('rowSummary: doel en tochten', () => {
  it('toont het doel, het programma en de tochten met echte waarden', () => {
    expect(rowSummary('doelen', facts()).value).toBe('GR5, 4 jul');
    expect(rowSummary('programma', facts())).toEqual({ value: 'Week 9 van 45', sub: 'Opbouw, teruggerekend vanaf je doel' });
    expect(rowSummary('vrije-dagen', facts()).value).toBe('1 gepland');
    expect(rowSummary('reisplanner', facts()).value).toBe('5 open');
    expect(rowSummary('paklijst', facts()).value).toBe('8,4 kg');
  });

  it('de groep Doel en tochten noemt het aantal tochten, niet de week', () => {
    const s = groupSummary('doel', facts());
    expect(s.value).toBe('2 tochten');
    expect(s.sub).toBe('GR5 op 4 juli, opbouw');
    expect(groupSummary('doel', facts({ treks: 1 })).value).toBe('1 tocht');
  });

  it('zonder doel staat er geen doel en een uitnodiging', () => {
    const s = groupSummary('doel', facts({ goal: null, treks: 0 }));
    expect(s).toEqual({ value: 'Geen doel', dim: true, sub: 'Kies een doel om naartoe te plannen' });
    expect(rowSummary('doelen', facts({ goal: null }))).toEqual({ value: 'Geen doel', dim: true, sub: 'Een doel geeft ASCEND een einddatum' });
  });

  it('de lange zondag is verborgen bij een bergdoel', () => {
    expect(rowSummary('lange-zondag', facts({ longSundayVisible: false })).hidden).toBe(true);
    expect(rowSummary('lange-zondag', facts()).value).toBe('Bergtocht');
  });
});

describe('rowSummary: forge', () => {
  it('Forge staat standaard aan, met het advies als keuze', () => {
    expect(rowSummary('forge', facts()).checked).toBe(true);
    expect(rowSummary('forge-volgorde', facts()).value).toBe('Gewicht');
    expect(rowSummary('forge-sets', facts()).value).toBe('Dalend');
    expect(rowSummary('forge-opwarmen', facts()).value).toBe('Slim');
    expect(rowSummary('forge-schatting', facts()).value).toBe('Tot 20');
    expect(rowSummary('forge-rust', facts()).checked).toBe(true);
    expect(rowSummary('forge-signaal', facts()).value).toBe('Geluid en trillen');
    expect(rowSummary('forge-scherm', facts()).checked).toBe(true);
    expect(rowSummary('forge-doorgeven', facts()).checked).toBe(true);
    expect(rowSummary('forge-schijven', facts()).checked).toBe(true);
    expect(rowSummary('forge-doorgeven', facts({ settings: { ...facts().settings, strengthModel: { carryWeights: false } } })).checked).toBe(false);
    expect(rowSummary('forge-programma', facts())).toEqual({ value: 'Van ASCEND', dim: true });
    expect(groupSummary('forge', facts())).toEqual({ value: 'Aan', sub: 'Eerst gewicht, opwarmen slim' });
  });

  it('uit: de groep noemt de sportschool', () => {
    const settings = { ...facts().settings, strengthModel: { enabled: false } };
    expect(groupSummary('forge', facts({ settings }))).toEqual({ value: 'Uit', dim: true, sub: 'Sportschool: 2 stangen, 7 schijven' });
  });

  it('de sportschool in kilo\'s', () => {
    expect(rowSummary('stangen', facts()).value).toBe('20 en 15 kg');
    expect(rowSummary('schijven', facts()).value).toBe('1,25 tot 25 kg');
    expect(rowSummary('dumbbells', facts()).value).toBe('2 tot 50 kg');
    expect(rowSummary('kabels', facts()).value).toBe('Per 5 kg');
  });

  it('de trainingsduur is auto als ASCEND hem leerde, en verdwijnt zonder krachttrainingen', () => {
    expect(rowSummary('trainingsduur', facts())).toEqual({ value: '55 tot 70 min', auto: true });
    expect(rowSummary('trainingsduur', facts({ strengthDurations: [{ name: 'A', minutes: 60, source: 'default', basedOn: 0 }] }))).toEqual({ value: '60 min', auto: false });
    expect(rowSummary('trainingsduur', facts({ strengthDurations: [] })).hidden).toBe(true);
  });

  it('sets en gewichten volgt de bron van het krachtblok', () => {
    expect(rowSummary('kracht', facts()).value).toBe('In MacroFactor');
    expect(rowSummary('kracht', facts({ strengthExternal: false })).value).toBe('In ASCEND');
  });
});

describe('rowSummary: lichaam', () => {
  it('gewicht uit MacroFactor is auto, met de bron en de datum', () => {
    expect(rowSummary('lichaamsgewicht', facts())).toEqual({ value: '85,6 kg', auto: true, sub: 'MacroFactor, 22 okt' });
    expect(rowSummary('lichaamsgewicht', facts({ weight: { kg: 84, source: 'manual', date: '2026-10-01' } }))).toEqual({ value: '84 kg', auto: false, sub: 'Zelf ingevuld, 1 okt' });
    expect(rowSummary('lichaamsgewicht', facts({ weight: null }))).toEqual({ value: 'Niet ingevuld', dim: true });
  });

  it('hartslag: drempel, maximum of niets', () => {
    const hr = (heartRate: { lthr?: number; maxHr?: number }) => facts({ settings: { ...facts().settings, heartRate } });
    expect(rowSummary('hartslag', hr({ lthr: 172 })).value).toBe('Drempel 172');
    expect(rowSummary('hartslag', hr({ maxHr: 194 })).value).toBe('Max 194');
    expect(rowSummary('hartslag', hr({}))).toEqual({ value: 'Niet ingevuld', dim: true, sub: 'Zonder hartslag alleen zonenummers' });
  });

  it('blessures: geen of het aantal', () => {
    expect(rowSummary('blessures', facts()).value).toBe('Geen');
    expect(rowSummary('blessures', facts({ activeInjuries: 2 })).value).toBe('2 actief');
    expect(groupSummary('lichaam', facts({ settings: { ...facts().settings, heartRate: { lthr: 172 } } })).sub).toBe('Drempel 172 bpm, geen blessures');
  });
});

describe('rowSummary: vandaag en meldingen', () => {
  it('telt wat aan staat, standaard acht', () => {
    expect(groupSummary('vandaag', facts()).value).toBe('8 aan');
    const settings = { ...facts().settings, overviews: { weekReview: false, morningCheckIn: false }, introSoundEnabled: false };
    expect(groupSummary('vandaag', facts({ settings })).value).toBe('5 aan');
  });

  it('de dag van de terugblik hoort bij de terugblik', () => {
    expect(rowSummary('weekterugblik-dag', facts()).value).toBe('Zo en ma');
    const settings = { ...facts().settings, overviews: { weekReview: false } };
    expect(rowSummary('weekterugblik-dag', facts({ settings })).hidden).toBe(true);
  });

  it('plaats: volgt je locatie (auto), een gekozen plaats of niets', () => {
    const at = (homeLocation: { name: string; lat: number; lon: number } | undefined, overviews = {}) => facts({ settings: { ...facts().settings, homeLocation, overviews } });
    expect(rowSummary('weerplaats', at({ name: 'Mijn locatie', lat: 1, lon: 2 }))).toEqual({ value: 'Volgt je locatie', auto: true });
    expect(rowSummary('weerplaats', at({ name: 'Mijn locatie', lat: 1, lon: 2 }, { weatherFollowsLocation: false })).value).toBe('Mijn locatie');
    expect(rowSummary('weerplaats', at({ name: 'Utrecht', lat: 1, lon: 2 })).value).toBe('Utrecht');
    expect(rowSummary('weerplaats', at(undefined))).toEqual({ value: 'Niet gekozen', dim: true });
    expect(groupSummary('vandaag', at({ name: 'Mijn locatie', lat: 1, lon: 2 })).sub).toBe('Weer volgt je locatie');
  });

  it('wat ASCEND over je kleding leerde, alleen met kledingadvies aan', () => {
    expect(rowSummary('kleding-voorkeur', facts())).toEqual({ value: 'Standaard', auto: false, dim: true, hidden: false });
    const settings = { ...facts().settings, clothingAdjust: { running: 1 } };
    expect(rowSummary('kleding-voorkeur', facts({ settings }))).toMatchObject({ value: 'Hardlopen 1° lichter', auto: true });
    expect(rowSummary('kleding-voorkeur', facts({ settings: { ...settings, overviews: { clothingAdvice: false } } })).hidden).toBe(true);
  });
});

describe('rowSummary: koppelingen', () => {
  it('Garmin verbonden met de tijd van de laatste keer', () => {
    expect(rowSummary('garmin', facts())).toEqual({ value: 'Verbonden', dot: 'ok', sub: 'Laatst bijgewerkt om 14:02' });
    expect(groupSummary('koppelingen', facts())).toEqual({ value: 'Verbonden', dot: 'ok', sub: 'Garmin om 14:02, MacroFactor 22 okt' });
  });

  it('niet gekoppeld: alleen de rij om te koppelen, de schakelaars staan er niet', () => {
    const f = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false }, macroFactor: { leads: true } });
    expect(rowSummary('garmin', f)).toEqual({ value: 'Koppelen', sub: 'Trainingen, slaap en hartslag' });
    expect(rowSummary('slaap', f).hidden).toBe(true);
    expect(rowSummary('macrofactor', f)).toEqual({ title: 'Export inlezen', value: 'Nog niet', dim: true, sub: 'Kracht en gewicht uit MacroFactor' });
    expect(rowSummary('macrofactor-leidend', f).hidden).toBe(true);
    expect(groupSummary('koppelingen', f)).toEqual({ value: 'Geen', dim: true, sub: 'Garmin en MacroFactor nog niet gekoppeld' });
  });

  it('Vanzelf afvinken werkt alleen als Trainingen aan staat', () => {
    const f = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, activities: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('vanzelf-afvinken', f)).toMatchObject({ checked: false, sub: 'Werkt alleen als Trainingen aan staat' });
    expect(rowSummary('garmin-trainingen', f).checked).toBe(false);
  });
});

describe('rowSummary: gegevens en back-up', () => {
  it('de back-up zegt hoe lang geleden, of nog nooit', () => {
    expect(rowSummary('backup', facts()).value).toBe('12 dagen geleden');
    const never = facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: true } });
    expect(rowSummary('backup', never)).toEqual({ value: 'Nog nooit', dim: true });
    expect(groupSummary('gegevens', never)).toEqual({ value: 'Nog nooit', dim: true, sub: 'Alleen op deze telefoon, 2 kopieën' });
    expect(groupSummary('gegevens', facts()).value).toBe('12 dagen');
  });

  it('de vaste map staat er alleen als de browser dat kan', () => {
    expect(rowSummary('backupmap', facts({ folderSupported: false })).hidden).toBe(true);
    expect(rowSummary('backupmap', facts({ folderChosen: false }))).toEqual({ value: 'Niet gekozen', dim: true });
  });

  it('opslag en kopieën', () => {
    expect(rowSummary('opslag', facts()).value).toBe('Ja');
    expect(rowSummary('opslag', facts({ storage: 'not_protected' })).value).toBe('Nee');
    expect(rowSummary('momentopnamen', facts({ snapshots: 0 }))).toEqual({ value: '0', dim: true });
  });
});

describe('zoekwaarde', () => {
  it('een schakelaar is Aan of Uit, de rest zijn waarde', () => {
    expect(searchValue('ochtendcheck', facts())).toEqual({ text: 'Aan', dim: false });
    const settings = { ...facts().settings, overviews: { morningCheckIn: false } };
    expect(searchValue('ochtendcheck', facts({ settings }))).toEqual({ text: 'Uit', dim: true });
    expect(searchValue('forge-sets', facts())).toEqual({ text: 'Dalend', dim: false });
  });
});

// De regel voor een rij: één regel onder de titel die op 360 px past.
describe('de regel onder een rij is kort genoeg', () => {
  const variants: SettingsFacts[] = [
    facts(),
    facts({ goal: null, treks: 0, position: null, weight: null, watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false }, macroFactor: { leads: true }, snapshots: 0, strengthDurations: [] }),
    facts({ settings: { strengthTrackedExternally: false, introSoundEnabled: false, strengthModel: { enabled: false }, sportFrequency: { running: 3, hiking: 2 }, heartRate: { maxHr: 190 } }, activeInjuries: 3, pairing: 'never' }),
    facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, activities: false }, autoTick: true, leads: true, sendEnabled: true } }),
  ];

  it('geen regel is langer dan het maximum', () => {
    for (const f of variants) {
      for (const page of SETTINGS_PAGES) {
        expect(groupSummary(page.id, f).sub.length).toBeLessThanOrEqual(SUB_MAX_LENGTH);
        for (const row of allRowIds(page.id)) {
          const sub = rowSummary(row, f).sub;
          if (sub) expect(sub.length, `${row}: ${sub}`).toBeLessThanOrEqual(SUB_MAX_LENGTH);
        }
      }
    }
  });

  it('geen gedachtestreepjes en geen tabellen in wat de rijen zeggen', () => {
    for (const f of variants) {
      for (const page of SETTINGS_PAGES) {
        const texts = [JSON.stringify(groupSummary(page.id, f)), ...PAGE_ROWS[page.id].rows.map((r) => JSON.stringify(rowSummary(r, f)))];
        for (const t of texts) expect(t).not.toMatch(/[–—]/);
      }
    }
  });
});

describe('durationNote', () => {
  it('zegt waar de duur vandaan komt', () => {
    expect(durationNote('learned', 3, 3)).toBe('Uit 3 trainingen');
    expect(durationNote('estimate', 0, 1)).toBe('Jouw schatting');
    expect(durationNote('default', 0, 2)).toBe('Standaard, nog 1 training');
    expect(durationNote('default', 0, 0)).toBe('Standaard, nog 3 trainingen');
  });
});

describe('rowSummary: wat er na het samenvoegen bij kwam', () => {
  const withSettings = (extra: object) => facts({ settings: { ...facts().settings, ...extra } });

  it('na je hoofddoel: niets meer plannen is het advies', () => {
    expect(rowSummary('na-hoofddoel', facts()).value).toBe('Niets meer');
    expect(rowSummary('na-hoofddoel', withSettings({ afterMainGoal: 'maintain' })).value).toBe('Onderhoud');
  });

  it('de terugknop en het hervatten kennen hun advies', () => {
    expect(rowSummary('terugknop', facts()).value).toBe('Naar Vandaag');
    expect(rowSummary('terugknop', withSettings({ tabBack: 'previous' })).value).toBe('Vorige tab');
    expect(rowSummary('hervatten', facts()).value).toBe('2 uur');
    expect(rowSummary('hervatten', withSettings({ resumeMinutes: 0 }))).toEqual({ value: 'Uit', dim: true });
    expect(rowSummary('hervatten', withSettings({ resumeMinutes: 480 })).value).toBe('8 uur');
  });

  it('de opties voor het sturen naar je horloge staan er alleen met een koppeling', () => {
    expect(rowSummary('horloge-voorvoegsel', facts())).toEqual({ value: 'Kort', hidden: false });
    expect(rowSummary('horloge-voorvoegsel', withSettings({ watchNamePrefix: 'none' })).value).toBe('Geen');
    expect(rowSummary('horloge-gedaan-weghalen', facts()).checked).toBe(true);
    expect(rowSummary('horloge-gedaan-weghalen', withSettings({ watchRemoveDone: false })).checked).toBe(false);
    expect(rowSummary('horloge-status', withSettings({ showWatchStatus: false })).checked).toBe(false);
    expect(rowSummary('horloge-status-week', facts()).checked).toBe(true);
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    for (const id of ['horloge-voorvoegsel', 'horloge-gedaan-weghalen', 'horloge-status', 'horloge-status-week']) expect(rowSummary(id, unlinked).hidden).toBe(true);
  });
});

describe('rowSummary: loopinzicht en details van loopjes', () => {
  const withSettings = (extra: object) => facts({ settings: { ...facts().settings, ...extra } });

  it('loopinzicht staat standaard aan, met de onderwerpen eronder', () => {
    expect(rowSummary('loopinzicht', facts()).checked).toBe(true);
    expect(rowSummary('loop-efficientie', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('loop-vorm', withSettings({ runInsight: { topics: { form: false } } })).checked).toBe(false);
    expect(rowSummary('loopweer', withSettings({ runInsight: { weather: false } })).checked).toBe(false);
    expect(rowSummary('borstband', facts()).checked).toBe(true);
  });

  it('staat loopinzicht uit, dan staan de onderwerpen er niet', () => {
    const off = withSettings({ runInsight: { enabled: false } });
    for (const id of ['loop-efficientie', 'loop-langedagen', 'loop-berg', 'loop-vorm']) expect(rowSummary(id, off).hidden).toBe(true);
    expect(rowSummary('loopweer', off).hidden).toBeUndefined();
  });

  it('details van loopjes volgt Trainingen en de koppeling', () => {
    expect(rowSummary('horloge-details', facts()).checked).toBe(true);
    const noDetails = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, details: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', noDetails).checked).toBe(false);
    const noActivities = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, activities: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', noActivities)).toMatchObject({ checked: false, sub: 'Werkt alleen als Trainingen aan staat' });
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', unlinked).hidden).toBe(true);
  });
});

describe('rowSummary: de ochtendkaart en de ochtendmelding', () => {
  const withSettings = (extra: object) => facts({ settings: { ...facts().settings, ...extra } });

  it('de ochtendkaart staat standaard aan, en is er niet zonder ochtendcheck', () => {
    expect(rowSummary('ochtendkaart', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('ochtendkaart', withSettings({ overviews: { morningCard: false } })).checked).toBe(false);
    expect(rowSummary('ochtendkaart', withSettings({ overviews: { morningCheckIn: false } })).hidden).toBe(true);
  });

  it('de ochtendmelding staat standaard uit en laat de tijd gedimd zien zolang hij uit staat', () => {
    expect(rowSummary('ochtendmelding', facts())).toEqual({ checked: false, sub: undefined });
    expect(rowSummary('ochtendmelding-tijd', facts())).toEqual({ value: 'Rond 07:30', dim: true, hidden: false });
    const on = withSettings({ morningNotice: { enabled: true, time: '08:00' } });
    expect(rowSummary('ochtendmelding', on).checked).toBe(true);
    expect(rowSummary('ochtendmelding-tijd', on)).toEqual({ value: 'Rond 08:00', dim: false, hidden: false });
    expect(rowSummary('ochtendmelding-tijd', withSettings({ morningNotice: { enabled: true } })).value).toBe('Rond 07:30');
  });

  it('zegt eerlijk wat de telefoon niet kan, in een regel die past', () => {
    const on = { morningNotice: { enabled: true } };
    const nothing = rowSummary('ochtendmelding', facts({ settings: { ...facts().settings, ...on }, notice: { support: 'unavailable', granted: false } }));
    expect(nothing).toEqual({ value: 'Niet mogelijk', dim: true, sub: 'Alleen als je de app opent' });
    const browser = rowSummary('ochtendmelding', facts({ settings: { ...facts().settings, ...on }, notice: { support: 'not_installed', granted: false } }));
    expect(browser.sub).toBe('Zet ASCEND eerst op je beginscherm');
    expect(browser.checked).toBeUndefined();
    for (const r of [nothing, browser]) expect((r.sub ?? '').length).toBeLessThanOrEqual(SUB_MAX_LENGTH);
  });

  it('staat uit zolang de toestemming ontbreekt of is geweigerd, ook als de instelling aan staat', () => {
    const settings = { ...facts().settings, morningNotice: { enabled: true } };
    expect(rowSummary('ochtendmelding', facts({ settings, notice: { support: 'ready', granted: false } })).checked).toBe(false);
    const blocked = rowSummary('ochtendmelding', facts({ settings, notice: { support: 'blocked', granted: false } }));
    expect(blocked).toEqual({ checked: false, sub: 'Geblokkeerd in je telefoon' });
    expect(rowSummary('ochtendmelding-tijd', facts({ settings, notice: { support: 'blocked', granted: false } })).dim).toBe(true);
    expect(rowSummary('ochtendmelding-tijd', facts({ settings, notice: { support: 'unavailable', granted: false } })).hidden).toBe(true);
    expect(rowSummary('ochtendmelding', facts({ settings, notice: { support: 'ready', granted: true } })).checked).toBe(true);
  });

  it('het zoekresultaat zegt hetzelfde als de rij', () => {
    expect(searchValue('ochtendmelding', facts())).toEqual({ text: 'Uit', dim: true });
    expect(searchValue('ochtendmelding', facts({ notice: { support: 'unavailable', granted: false } }))).toEqual({ text: 'Niet mogelijk', dim: true });
  });
});
