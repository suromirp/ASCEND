import { describe, expect, it } from 'vitest';
import { formatDateNL } from '../utils/dates';
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
    watch: { linked: true, syncedAt: new Date(2026, 9, 22, 14, 2).toISOString(), use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: true },
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

  it('de rij Rustdag zegt dat je een eigen week koos, met de dagen', () => {
    expect(rowSummary('rustdag', facts()).sub).toBeUndefined();
    const shaped = facts({ settings: { ...facts().settings, restDay: 3, weekShape: { days: { tpl_long_run: 7, tpl_upper_a: 2, tpl_easy_run: 4, tpl_hill_intervals: 6 } } } });
    expect(rowSummary('rustdag', shaped)).toEqual({ value: 'Woensdag', sub: 'Eigen week: di, do, za, zo' });
    // Een beschadigde vorm telt niet.
    const damaged = facts({ settings: { ...facts().settings, weekShape: { days: { tpl_long_run: 9 } } } });
    expect(rowSummary('rustdag', damaged).sub).toBeUndefined();
  });

  it('een sport staat uit, op het weekschema (auto) of op een vast aantal', () => {
    const settings = { ...facts().settings, sportFrequency: { running: 3 } };
    expect(rowSummary('sport-running', facts({ settings }))).toEqual({ value: '3× per week' });
    expect(rowSummary('sport-hiking', facts({ settings }))).toEqual({ value: 'Aan', auto: true });
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
    expect(rowSummary('programma', facts())).toEqual({ value: 'Week 9 van 45', sub: 'Opbouw, teruggerekend vanaf je doel', hidden: false });
    expect(rowSummary('vrije-dagen', facts()).value).toBe('1 gepland');
    expect(rowSummary('reisplanner', facts()).value).toBe('5 open');
    expect(rowSummary('paklijst', facts()).value).toBe('8,4 kg');
    // Bergschoenen inlopen: het doel in de rij, de stand eronder zodra er een datum is.
    expect(rowSummary('bergschoenen', facts()).value).toBe('100 km');
    expect(rowSummary('bergschoenen', facts()).sub).toBeUndefined();
    expect(rowSummary('bergschoenen', facts({ settings: { ...facts().settings, bootBreakInKm: 150 }, bootKm: 42.4 }))).toMatchObject({ value: '150 km', sub: '42 van 150 km ingelopen' });
    expect(rowSummary('bergschoenen-herinnering', facts()).checked).toBe(true);
    expect(rowSummary('bergschoenen-herinnering', facts({ settings: { ...facts().settings, bootBreakInReminder: false } })).checked).toBe(false);
    expect(rowSummary('water-per-etappe', facts())).toEqual({ checked: true, hidden: false });
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

describe('rowSummary: het geluid na de rust en het trillen', () => {
  // De rusttimer bestaat alleen als je sets in ASCEND bijhoudt.
  const withForge = (strengthModel: object) => facts({ strengthExternal: false, settings: { ...facts().settings, strengthModel } });

  it('bij geluid en trillen, of alleen geluid, staat de rij er gewoon', () => {
    expect(rowSummary('forge-geluid', withForge({})).hidden).toBeFalsy();
    expect(rowSummary('forge-geluid', withForge({ restAlert: 'sound' })).hidden).toBeFalsy();
    expect(rowSummary('forge-geluid', withForge({ restAlert: 'sound' })).sub).toBeUndefined();
  });

  it('bij alleen trillen kies je met het geluid het ritme: de rij blijft, met een feit eronder', () => {
    const r = rowSummary('forge-geluid', withForge({ restAlert: 'vibrate', restSound: 'boxing' }));
    expect(r.hidden).toBeFalsy();
    expect(r.value).toBe('Boksbel');
    expect(r.sub).toBe('Je voelt alleen het ritme');
  });

  it('zonder signaal, of zonder rusttimer vanzelf, is er niets te kiezen', () => {
    expect(rowSummary('forge-geluid', withForge({ restAlert: 'off' })).hidden).toBe(true);
    expect(rowSummary('forge-geluid', withForge({ restAuto: false })).hidden).toBe(true);
  });
});

describe('rowSummary: forge', () => {
  it('Forge staat standaard aan, met het advies als keuze', () => {
    expect(rowSummary('forge', facts()).checked).toBe(true);
    expect(rowSummary('forge-volgorde', facts()).value).toBe('Gewicht');
    expect(rowSummary('forge-sets', facts()).value).toBe('Dalend');
    expect(rowSummary('forge-opwarmen', facts()).value).toBe('Slim');
    expect(rowSummary('forge-opwarmbereik', facts()).value).toBe('Per spiergroep');
    expect(rowSummary('forge-schatting', facts()).value).toBe('Tot 20');
    expect(rowSummary('forge-rust', facts()).checked).toBe(true);
    expect(rowSummary('forge-signaal', facts()).value).toBe('Geluid en trillen');
    expect(rowSummary('forge-geluid', facts()).value).toBe('Klokjes');
    expect(rowSummary('forge-geluid', facts({ settings: { ...facts().settings, strengthModel: { restSound: 'whistle' } } })).value).toBe('Fluitje');
    expect(rowSummary('forge-scherm', facts()).checked).toBe(true);
    expect(rowSummary('forge-schijven', facts()).checked).toBe(true);
    expect(rowSummary('forge-1rm', facts()).checked).toBe(true);
    expect(rowSummary('forge-1rm', facts({ settings: { ...facts().settings, strengthModel: { showOneRm: false } } })).checked).toBe(false);
    expect(rowSummary('forge-doorvoeren', facts()).value).toBe('Gelijke sets');
    expect(rowSummary('forge-doorvoeren', facts({ settings: { ...facts().settings, strengthModel: { carryWeights: false } } })).value).toBe('Uit');
    expect(rowSummary('forge-doorvoeren', facts({ settings: { ...facts().settings, strengthModel: { carryMode: 'shift' } } })).value).toBe('Zelfde verschil');
    expect(rowSummary('forge-programma', facts())).toEqual({ value: 'Van ASCEND', dim: true, hidden: false });
    expect(groupSummary('forge', facts())).toEqual({ value: 'Aan', sub: 'Eerst gewicht, opwarmen slim' });
  });

  it('Forge toont: 1RM als advies, werkgewicht als je het kiest, en weg zonder het 1RM-blok', () => {
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-weergave', facts())).toEqual({ value: '1RM', hidden: false });
    expect(rowSummary('forge-weergave', withForge({ oneRmView: 'work_weight' })).value).toBe('Werkgewicht');
    expect(rowSummary('forge-weergave', withForge({ showOneRm: false })).hidden).toBe(true);
    expect(rowSummary('forge-weergave', withForge({ enabled: false })).hidden).toBe(true);
  });

  it('MacroFactor-1RM erbij: aan als advies, uit te zetten, weg zonder het 1RM-blok', () => {
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-1rm-macrofactor', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('forge-1rm-macrofactor', withForge({ showMacroFactorOneRm: false })).checked).toBe(false);
    expect(rowSummary('forge-1rm-macrofactor', withForge({ showOneRm: false })).hidden).toBe(true);
  });

  it('Vergelijken met, extra regels en volgorde: het advies staat erin, een keuze verandert de rij, uit verbergt ze', () => {
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-vergelijken', facts())).toEqual({ value: '4 en 8 weken', hidden: false });
    expect(rowSummary('forge-vergelijken', withForge({ compareWeeks: '2_4' })).value).toBe('2 en 4 weken');
    expect(rowSummary('forge-vergelijken', withForge({ enabled: false })).hidden).toBe(true);
    expect(rowSummary('forge-extras', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('forge-extras', withForge({ showExtras: false })).checked).toBe(false);
    expect(rowSummary('forge-lijntjes', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('forge-lijntjes', withForge({ showTrendLines: false })).checked).toBe(false);
    expect(rowSummary('forge-volgorde-lijst', facts()).value).toBe('Meest getraind');
    expect(rowSummary('forge-volgorde-lijst', withForge({ listSort: 'name' })).value).toBe('Op naam');
  });

  it('Bijsturen staat aan, RIR vooraf staat op hint, en een keuze verandert de rij', () => {
    const withForge = (strengthModel: object) => facts({ strengthExternal: false, settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-bijsturen', withForge({}))).toEqual({ checked: true, hidden: false });
    expect(rowSummary('forge-bijsturen', withForge({ adjustLive: false })).checked).toBe(false);
    expect(rowSummary('forge-bijsturen', withForge({ enabled: false })).hidden).toBe(true);
    // Houd je sets in MacroFactor bij, dan is het workoutscherm alleen om mee te kijken: bijsturen en de invulkeuzes doen niets.
    for (const id of ['forge-bijsturen', 'forge-rir-vooraf', 'forge-doorvoeren', 'forge-schijven', 'forge-rust', 'bundel-rusttimer', 'bundel-invullen']) {
      expect(rowSummary(id, facts({ strengthExternal: true })).hidden, id).toBe(true);
    }
    expect(rowSummary('forge-scherm', facts({ strengthExternal: true })).hidden).toBeUndefined();
    expect(rowSummary('forge-rir-vooraf', facts()).value).toBe('Als hint');
    expect(rowSummary('forge-rir-vooraf', withForge({ rirPrefill: 'target' })).value).toBe('Met het doel');
    expect(rowSummary('forge-rir-vooraf', withForge({ rirPrefill: 'rommel' })).value).toBe('Als hint');
  });

  it('Toestellen leren staat aan met het label auto, en ASCEND naast MacroFactor staat uit en toont de stand', () => {
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-leren', facts())).toEqual({ value: 'Geleerd', hidden: false });
    expect(rowSummary('forge-leren', withForge({ learnStacks: false })).value).toBe('Profiel');
    expect(rowSummary('forge-leren', withForge({ stackWeights: 'used_only' })).value).toBe('Alleen gebruikt');
    expect(rowSummary('forge-leren', withForge({ enabled: false })).hidden).toBe(true);
    expect(rowSummary('forge-pauze', facts())).toEqual({ checked: true, hidden: false });
    expect(rowSummary('forge-pauze', withForge({ lighterAfterBreak: false })).checked).toBe(false);
    expect(rowSummary('forge-vermoeidheid', facts())).toEqual({ value: 'Leren', hidden: false });
    expect(rowSummary('forge-vermoeidheid', withForge({ fatigue: 'fixed' }))).toEqual({ value: 'Vast 3%', hidden: false });
    expect(rowSummary('forge-vermoeidheid', withForge({ enabled: false })).hidden).toBe(true);
    expect(rowSummary('forge-dumbbells', facts())).toEqual({ value: 'Vanzelf', hidden: false });
    expect(rowSummary('forge-dumbbells', withForge({ dumbbellLog: 'total' })).value).toBe('Totaal van twee');
    expect(rowSummary('forge-dumbbells', withForge({ enabled: false })).hidden).toBe(true);
    expect(rowSummary('forge-naast', facts())).toEqual({ checked: false, hidden: false });
    expect(rowSummary('forge-naast', withForge({ showComparison: true })).checked).toBe(true);
    expect(rowSummary('forge-naast', withForge({ enabled: false })).hidden).toBe(true);
    const tally = (hit: number, total: number) => ({ hit, total });
    const none = { near: { did: tally(0, 0), ascend: tally(0, 0) }, macrofactor: { did: tally(0, 0), ascend: tally(0, 0) }, forge: { ascend: tally(0, 0), other: { did: tally(0, 0), ascend: tally(0, 0) } } };
    const totals = { ...none, macrofactor: { did: tally(18, 25), ascend: tally(17, 25) } };
    const r = rowSummary('forge-naast', facts({ strengthCheck: { all: totals, since: none, from: '2026-10-24' } }));
    expect(r.sub).toBe('Raak: MacroFactor 72%, ASCEND 68%');
    expect(r.sub!.length).toBeLessThanOrEqual(SUB_MAX_LENGTH);
  });

  it('Stil meten sinds toont de startdatum en staat uit als Forge uit staat', () => {
    expect(rowSummary('forge-sinds', facts()).value).toBe(formatDateNL('2026-10-24'));
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('forge-sinds', withForge({ checkFrom: '2031-03-05' })).value).toBe('5 maart 2031');
    expect(rowSummary('forge-sinds', withForge({ enabled: false })).hidden).toBe(true);
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

  it('de sportschool en de gewichten per toestel', () => {
    const withForge = (strengthModel: object) => facts({ settings: { ...facts().settings, strengthModel } });
    expect(rowSummary('gym-profiel', facts()).value).toBe('Mijn sportschool');
    expect(rowSummary('toestelgewichten', facts())).toEqual({ value: 'Geen', dim: true });
    const gym = { id: 'a', name: 'Sportschool A', barsKg: [20], platesKg: [5], stackStepKg: 5, exerciseWeightsKg: { 'cable-fly': [4.5, 9, 13.5, 18] } };
    expect(rowSummary('toestelgewichten', withForge({ profiles: [gym], activeProfileId: 'a' }))).toEqual({ value: '1 toestel' });
    const two = withForge({ profiles: [gym, { ...gym, id: 'b', name: 'Sportschool B', exerciseWeightsKg: undefined }], activeProfileId: 'a' });
    expect(rowSummary('toestelgewichten', two)).toEqual({ value: '1 toestel', sub: 'Voor Sportschool A' });
    expect(rowSummary('gym-profiel', two).value).toBe('Sportschool A');
  });

  it('de trainingsduur is auto als ASCEND hem leerde, en verdwijnt zonder krachttrainingen', () => {
    expect(rowSummary('trainingsduur', facts())).toEqual({ value: '55 tot 70 min', auto: true, hidden: false });
    expect(rowSummary('trainingsduur', facts({ strengthDurations: [{ name: 'A', minutes: 60, source: 'default', basedOn: 0 }] }))).toEqual({ value: '60 min', auto: false, hidden: false });
    expect(rowSummary('trainingsduur', facts({ strengthDurations: [] })).hidden).toBe(true);
  });

  it('sets en gewichten volgt de bron van het krachtblok', () => {
    expect(rowSummary('kracht', facts()).value).toBe('In MacroFactor');
    expect(rowSummary('kracht', facts({ strengthExternal: false })).value).toBe('In ASCEND');
  });
});

describe('rowSummary: vetpercentage tonen', () => {
  it('staat standaard aan als er metingen zijn, en uit als je het zegt', () => {
    expect(rowSummary('vetpercentage', facts({ hasBodyFat: true }))).toEqual({ checked: true, hidden: false });
    expect(rowSummary('vetpercentage', facts({ hasBodyFat: true, settings: { ...facts().settings, showBodyFat: false } }))).toEqual({ checked: false, hidden: false });
  });

  it('is er niet zonder metingen met vetpercentage', () => {
    expect(rowSummary('vetpercentage', facts()).hidden).toBe(true);
    expect(rowSummary('vetpercentage', facts({ hasBodyFat: false })).hidden).toBe(true);
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

  it('figuur: Automatisch zegt eerlijk dat het nog niet bekend is', () => {
    expect(rowSummary('figuur', facts())).toEqual({ value: 'Man', auto: true, sub: 'Nog niet bekend, we tonen Man' });
    expect(rowSummary('figuur', facts({ linkedSex: 'vrouw' }))).toEqual({ value: 'Vrouw', auto: true, sub: 'Uit je koppeling' });
    expect(rowSummary('figuur', facts({ settings: { ...facts().settings, figure: 'vrouw' } }))).toEqual({ value: 'Vrouw' });
    expect(rowSummary('figuur', facts({ settings: { ...facts().settings, figure: 'man' }, linkedSex: 'vrouw' }))).toEqual({ value: 'Man' });
  });
});

describe('rowSummary: wat speelde er', () => {
  const withSettings = (over: Partial<SettingsFacts['settings']>) => facts({ settings: { ...facts().settings, ...over } });

  it('alles staat standaard aan, met je patroon als oorzaak', () => {
    expect(rowSummary('wat-teken', facts()).checked).toBe(true);
    expect(rowSummary('wat-overzicht', facts())).toEqual({ checked: true, sub: 'Wat doet dit met je?' });
    expect(rowSummary('wat-test', facts()).checked).toBe(true);
    expect(rowSummary('wat-oorzaak', facts())).toEqual({ value: 'Ook je patroon', sub: 'Uit weer, horloge, logboek en je patroon' });
  });

  it('een schakelaar die uit staat, en de oorzaak in drie stappen', () => {
    expect(rowSummary('wat-teken', withSettings({ influenceSign: false })).checked).toBe(false);
    expect(rowSummary('wat-overzicht', withSettings({ influenceOverview: false })).checked).toBe(false);
    expect(rowSummary('wat-test', withSettings({ influenceTestMove: false })).checked).toBe(false);
    expect(rowSummary('wat-oorzaak', withSettings({ influenceCause: 'weet' })).value).toBe('Wat ASCEND weet');
    expect(rowSummary('wat-oorzaak', withSettings({ influenceCause: 'uit' })).value).toBe('Uit');
  });

  it('vastgelegd telt de keren, en een blad dat alleen bekeken is telt niet', () => {
    expect(rowSummary('wat-vastgelegd', facts())).toEqual({ value: 'Nog niets', dim: true });
    const note = (id: string, over = {}) => ({ id, date: '2026-10-20', reasons: [], updatedAt: '2026-10-21T08:00:00.000Z', ...over });
    const list = [note('a', { reasons: [{ reason: 'stress' }] }), note('b', { excludeHeartRate: true }), note('c', { seen: true })];
    expect(rowSummary('wat-vastgelegd', withSettings({ influences: list }))).toEqual({ value: '2 keer', sub: 'Bekijken, wijzigen of wissen' });
  });

  it('zegt nergens een oordeel', () => {
    const f = withSettings({ influences: [{ id: 'a', date: '2026-10-20', reasons: [{ reason: 'alcohol' }], updatedAt: '2026-10-21T08:00:00.000Z' }] });
    for (const id of ['wat-teken', 'wat-oorzaak', 'wat-overzicht', 'wat-test', 'wat-vastgelegd']) {
      expect(JSON.stringify(rowSummary(id, f))).not.toMatch(/helaas|minder drinken/i);
    }
  });
});

describe('rowSummary: intensiteit tellen', () => {
  it('staat standaard op je hartslag en volgt de keuze', () => {
    expect(rowSummary('intensiteit', facts()).value).toBe('Naar je hartslag');
    expect(rowSummary('intensiteit', facts({ settings: { ...facts().settings, intensityCounting: 'plan' } })).value).toBe('Naar het plan');
    expect(rowSummary('intensiteit', facts({ settings: { ...facts().settings, intensityCounting: 'iets' as never } })).value).toBe('Naar je hartslag');
  });
});

describe('rowSummary: vandaag en meldingen', () => {
  it('telt wat aan staat, standaard negen', () => {
    expect(groupSummary('vandaag', facts()).value).toBe('9 aan');
    const settings = { ...facts().settings, overviews: { weekReview: false, morningCheckIn: false }, introSoundEnabled: false };
    expect(groupSummary('vandaag', facts({ settings })).value).toBe('6 aan');
  });

  it('beste moment: een schakelaar die standaard aan staat, ook als de sleutel ontbreekt', () => {
    expect(rowSummary('beste-moment', facts())).toEqual({ checked: true });
    expect(rowSummary('beste-moment', facts({ settings: { ...facts().settings, overviews: { weatherLine: false } } })).checked).toBe(true);
    expect(rowSummary('beste-moment', facts({ settings: { ...facts().settings, overviews: { bestMoment: false } } })).checked).toBe(false);
    const off = { ...facts().settings, overviews: { bestMoment: false } };
    expect(groupSummary('vandaag', facts({ settings: off })).value).toBe('8 aan');
  });

  it('de dag van de terugblik hoort bij de terugblik', () => {
    expect(rowSummary('weekterugblik-dag', facts()).value).toBe('Zo en ma');
    expect(rowSummary('ochtend-vanaf', facts()).value).toBe('05:00');
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
    expect(rowSummary('kleding-voorkeur', facts({ settings }))).toMatchObject({ value: 'Hardlopen 1° lichter', auto: false, dim: false });
    expect(rowSummary('kleding-voorkeur', facts({ settings: { ...settings, clothingAdjust: { running: -0.5 } } })).value).toBe('Hardlopen 0,5° warmer');
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

  it('Vanzelf afvinken verdwijnt als Trainingen uit staat, in plaats van uitgegrijsd te blijven', () => {
    const f = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, activities: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('vanzelf-afvinken', f)).toEqual({ checked: true, hidden: true });
    expect(rowSummary('vanzelf-afvinken', facts())).toEqual({ checked: true, hidden: false });
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
    expect(rowSummary('backupmap', facts({ folderChosen: false }))).toEqual({ value: 'Niet gekozen', dim: true, hidden: false });
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

  it('de lucht is op tijd, donker vanaf 20:00, en de begintijd verdwijnt bij een vaste keuze', () => {
    expect(rowSummary('lucht', facts()).value).toBe('Op tijd');
    expect(rowSummary('lucht-vanaf', facts()).value).toBe('Met de zon');
    expect(rowSummary('lucht-vanaf', withSettings({ skyNightFrom: '22:00' })).value).toBe('Vanaf 22:00');
    expect(rowSummary('lucht', withSettings({ sky: 'night' })).value).toBe('Altijd donker');
    expect(rowSummary('lucht-vanaf', withSettings({ sky: 'night' })).hidden).toBe(true);
    expect(rowSummary('lucht-vanaf', withSettings({ sky: 'day' })).hidden).toBe(true);
  });

  it('beweging is Normaal tot je iets anders kiest', () => {
    expect(rowSummary('beweging', facts()).value).toBe('Normaal');
    expect(rowSummary('beweging', withSettings({ motion: 'calm' })).value).toBe('Rustig');
    expect(rowSummary('beweging', withSettings({ motion: 'off' })).value).toBe('Uit');
    expect(rowSummary('beweging', withSettings({ motion: 'rommel' })).value).toBe('Normaal');
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
    expect(rowSummary('horloge-status', withSettings({ showWatchStatusOnWeek: false }))).toMatchObject({ checked: false, sub: 'Niet op Week' });
    expect(rowSummary('horloge-status', facts()).sub).toBeUndefined();
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    for (const id of ['horloge-voorvoegsel', 'horloge-gedaan-weghalen', 'horloge-status', 'horloge-status-week']) expect(rowSummary(id, unlinked).hidden).toBe(true);
  });
});

describe('rowSummary: hartslag op je horloge', () => {
  const withSettings = (over: Partial<SettingsFacts['settings']>, hrBasis?: { lthr?: number; maxHr?: number; failed?: boolean }) =>
    facts({ settings: { ...facts().settings, ...over }, watch: { ...facts().watch!, hrBasis } });

  it('standaard de zones van ASCEND, met de grens van zone 2', () => {
    const r = rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 } }, { lthr: 179 }));
    expect(r.value).toBe('ASCEND');
    expect(r.sub).toBe('Zone 2: 145 tot 159 bpm');
    expect(r.hidden).toBe(false);
  });

  it('zegt waarom het bij de zonenaam blijft', () => {
    expect(rowSummary('horloge-hartslag', withSettings({})).sub).toBe('Zonder drempel: de zonenaam');
    expect(rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 } })).sub).toBe('Drempel intervals.icu onbekend');
  });

  it('toont het verschil als de drempels meer dan 3 slagen verschillen, anders niet', () => {
    const far = rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 } }, { lthr: 187 }));
    expect(far.sub).toBe('Drempel: intervals.icu 187, ASCEND 179');
    expect(rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 } }, { lthr: 182 })).sub).toBe('Zone 2: 145 tot 159 bpm');
    expect(rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 } }, { lthr: 183 })).sub).toMatch(/^Drempel/);
    expect(rowSummary('horloge-hartslag', withSettings({ heartRate: { lthr: 179 }, watchHeartRate: 'intervals' }, { lthr: 187 })).sub).toBe('Drempel: intervals.icu 187, ASCEND 179');
    expect(far.sub!.length).toBeLessThanOrEqual(SUB_MAX_LENGTH);
  });

  it('de keuze van intervals.icu en de schakelaar voor de rustige loop', () => {
    expect(rowSummary('horloge-hartslag', withSettings({ watchHeartRate: 'intervals' })).value).toBe('intervals.icu');
    expect(rowSummary('horloge-rustige-loop', facts()).checked).toBe(true);
    expect(rowSummary('horloge-rustige-loop', withSettings({ watchCalmRun: false })).checked).toBe(false);
    expect(rowSummary('horloge-rustige-loop', withSettings({ watchHeartRate: 'intervals' })).hidden).toBe(true);
    // Zonder sturen naar het horloge is er ook geen ruime grens.
    expect(rowSummary('horloge-rustige-loop', facts({ watch: { ...facts().watch!, sendEnabled: false } })).hidden).toBe(true);
  });

  it('staan er alleen met een koppeling', () => {
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    for (const id of ['horloge-hartslag', 'horloge-rustige-loop']) expect(rowSummary(id, unlinked).hidden).toBe(true);
  });
});

describe('rowSummary: vragen bij een korte nacht', () => {
  const withSettings = (extra: object) => facts({ settings: { ...facts().settings, ...extra } });

  it('staat standaard aan en volgt de schakelaar', () => {
    expect(rowSummary('korte-nacht', facts()).checked).toBe(true);
    expect(rowSummary('korte-nacht', withSettings({ askShortNight: false })).checked).toBe(false);
    expect(rowSummary('korte-nacht', withSettings({ askShortNight: true })).checked).toBe(true);
  });

  it('is gedimd zolang de ochtendcheck uit staat', () => {
    expect(rowSummary('korte-nacht', facts()).hidden).toBeFalsy();
    expect(rowSummary('korte-nacht', withSettings({ overviews: { morningCheckIn: false } })).hidden).toBe(true);
  });
});

describe('rowSummary: tekst voor Strava', () => {
  const withSettings = (extra: object) => facts({ settings: { ...facts().settings, ...extra } });

  it('staat standaard aan, ook zonder koppeling met je horloge', () => {
    expect(rowSummary('strava-tekst', facts()).checked).toBe(true);
    expect(rowSummary('strava-tekst', withSettings({ stravaText: false })).checked).toBe(false);
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('strava-tekst', unlinked).hidden).toBeFalsy();
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

  it('details van loopjes verdwijnt als Trainingen uit staat of zonder koppeling', () => {
    expect(rowSummary('horloge-details', facts()).checked).toBe(true);
    const noDetails = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, details: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', noDetails).checked).toBe(false);
    const noActivities = facts({ watch: { linked: true, use: { ...DEFAULT_WATCH_USE, activities: false }, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', noActivities)).toEqual({ checked: true, hidden: true });
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('horloge-details', unlinked).hidden).toBe(true);
  });
});

describe('rowSummary: correcties uit intervals.icu overnemen', () => {
  const watch = (extra: object = {}) => facts({ watch: { linked: true, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false, ...extra } });

  it('staat standaard aan, ook bij een oudere stand zonder het veld', () => {
    expect(rowSummary('correcties-overnemen', facts()).checked).toBe(true);
    expect(rowSummary('correcties-overnemen', watch()).checked).toBe(true);
    expect(rowSummary('correcties-overnemen', watch({ corrections: true })).checked).toBe(true);
  });

  it('staat uit als je het uitzette', () => {
    expect(rowSummary('correcties-overnemen', watch({ corrections: false })).checked).toBe(false);
  });

  it('verdwijnt als Trainingen uit staat of zonder koppeling', () => {
    const noActivities = watch({ use: { ...DEFAULT_WATCH_USE, activities: false } });
    expect(rowSummary('correcties-overnemen', noActivities)).toEqual({ checked: true, hidden: true });
    const unlinked = facts({ watch: { linked: false, use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: false } });
    expect(rowSummary('correcties-overnemen', unlinked).hidden).toBe(true);
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

describe('rowSummary: rijen met een blad', () => {
  const withSettings = (extra: object, over: Partial<SettingsFacts> = {}) => facts({ settings: { ...facts().settings, ...extra }, ...over });

  it('Dagen en tijd telt de dagen en noemt de rustdag', () => {
    expect(rowSummary('bundel-dagen', facts())).toEqual({ value: '6 dagen', dim: false, sub: 'Rust op maandag' });
    expect(rowSummary('bundel-dagen', facts({ dailyTimeBudget: {} })).value).toBe('Rust ma');
    expect(rowSummary('bundel-dagen', facts({ dailyTimeBudget: {}, settings: { ...facts().settings, restDay: 3 } })).value).toBe('Rust wo');
    // Waarden in de rij blijven kort genoeg voor 360 px.
    for (const id of ['sport-running', 'sport-hiking', 'sport-cycling', 'bundel-dagen', 'forge-leren', 'forge-vermoeidheid']) {
      expect(rowSummary(id, facts()).value!.length, id).toBeLessThanOrEqual(14);
    }
    expect(rowSummary('forge-vermoeidheid', facts()).auto).toBeUndefined();
  });

  it('Tochten telt de tochten en staat er niet zonder doel of tocht', () => {
    expect(rowSummary('bundel-tochten', facts())).toEqual({ value: '2 tochten', hidden: false });
    expect(rowSummary('bundel-tochten', facts({ treks: 0 })).value).toBe('Geen tochten');
    expect(rowSummary('bundel-tochten', facts({ goal: null, position: null, treks: 0 })).hidden).toBe(true);
    expect(rowSummary('bundel-tochten', facts({ goal: null, treks: 1 })).hidden).toBe(false);
  });

  it('Mijn sportschool noemt het profiel en wat erin ligt', () => {
    expect(rowSummary('bundel-sportschool', facts())).toEqual({ value: 'Mijn sportschool', sub: '2 stangen, 7 schijven' });
  });

  it('Weergave op Forge, Rusttimer en Toets tegen MacroFactor vatten hun keuzes samen', () => {
    expect(rowSummary('bundel-weergave', facts())).toEqual({ value: '1RM', sub: 'Vergelijkt met 4 en 8 weken', hidden: false });
    expect(rowSummary('bundel-weergave', withSettings({ strengthModel: { showOneRm: false } })).value).toBe('Werkgewicht');
    expect(rowSummary('bundel-weergave', withSettings({ strengthModel: { enabled: false } })).hidden).toBe(true);
    const inApp = { strengthExternal: false };
    expect(rowSummary('bundel-rusttimer', facts(inApp))).toEqual({ value: 'Geluid en trillen', hidden: false });
    expect(rowSummary('bundel-rusttimer', withSettings({ strengthModel: { restAuto: false } }, inApp))).toMatchObject({ value: 'Uit', dim: true });
    expect(rowSummary('bundel-toets', facts())).toMatchObject({ value: 'Uit', dim: true, hidden: false });
    expect(rowSummary('bundel-toets', withSettings({ strengthModel: { showComparison: true } })).value).toBe('Aan');
    expect(rowSummary('bundel-toets', facts({ macroFactor: { leads: true } })).hidden).toBe(true);
  });

  it('Rekenmodel en Bij het invullen zeggen Advies, of hoeveel er anders staat', () => {
    const inApp = { strengthExternal: false };
    expect(rowSummary('bundel-rekenmodel', facts()).value).toBe('Advies');
    expect(rowSummary('bundel-rekenmodel', withSettings({ strengthModel: { fatigue: 'fixed', widenRange: false } })).value).toBe('2 aangepast');
    expect(rowSummary('bundel-invullen', facts(inApp)).value).toBe('Advies');
    expect(rowSummary('bundel-invullen', withSettings({ strengthModel: { rirPrefill: 'target' } }, inApp)).value).toBe('1 aangepast');
    expect(rowSummary('bundel-invullen', facts({ strengthExternal: true })).hidden).toBe(true);
  });

  it('Weer en kleding, Inzicht na een training en Wat ik van mijn horloge gebruik', () => {
    expect(rowSummary('bundel-weer', facts()).value).toBe('4 van 4 aan');
    expect(rowSummary('bundel-weer', withSettings({ overviews: { weatherSwap: false, bestMoment: false } })).value).toBe('2 van 4 aan');
    expect(rowSummary('bundel-inzicht', facts())).toEqual({ value: 'Aan', sub: '4 van 4 onderwerpen' });
    expect(rowSummary('bundel-inzicht', withSettings({ runInsight: { enabled: false } }))).toEqual({ value: 'Uit', dim: true });
    expect(rowSummary('bundel-horloge-gebruik', facts())).toEqual({ value: '5 van 5 aan', hidden: false });
    expect(rowSummary('bundel-horloge-gebruik', facts({ watch: { ...facts().watch!, use: { ...DEFAULT_WATCH_USE, sleep: false, hrv: false } } })).value).toBe('3 van 5 aan');
    expect(rowSummary('bundel-horloge-gebruik', facts({ watch: { ...facts().watch!, linked: false } })).hidden).toBe(true);
  });

  it('Trainingen naar je horloge is een rij met de stand, en Wat speelde er telt je aantekeningen', () => {
    expect(rowSummary('bundel-horloge-sturen', facts())).toEqual({ value: 'Aan', hidden: false });
    expect(rowSummary('bundel-horloge-sturen', facts({ watch: { ...facts().watch!, sendEnabled: false } })).value).toBe('Uit');
    expect(rowSummary('bundel-wat', facts())).toEqual({ value: 'Nog niets', dim: true });
  });

  it('de lucht noemt wanneer ze donker wordt, alleen op automatisch', () => {
    expect(rowSummary('lucht', facts()).sub).toBe('Donker vanaf met de zon');
    expect(rowSummary('lucht', withSettings({ sky: 'day' })).sub).toBeUndefined();
  });

  it('geen enkele regel onder een rij met een blad is langer dan een regel', () => {
    for (const id of ['bundel-dagen', 'bundel-tochten', 'bundel-sportschool', 'bundel-weergave', 'bundel-rusttimer', 'bundel-toets', 'bundel-inzicht', 'lucht']) {
      expect((rowSummary(id, facts()).sub ?? '').length, id).toBeLessThanOrEqual(SUB_MAX_LENGTH);
    }
  });
});
