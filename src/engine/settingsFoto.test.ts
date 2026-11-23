// ASCEND: de foto van de instellingen (docs/visie/Ontwerp instellingen op een plek.md, hoofdstuk 4).
//
// Eén bestand met alle uitvoer van de exports van nu: de index, de plekken, de voorwaarden, de samenvatting
// en de zoekwaarde van elke rij, het zoekveld, de uitleg, de keuzes, het advies en waar een verschil heen
// springt, elk op zes nagemaakte opstellingen. Tijdens het verhuizen naar settingsDefs/ blijft de foto byte
// voor byte gelijk; verandert hij toch, dan stopt de stap.
//
// Wie bewust een instelling toevoegt of een tekst verandert, maakt de foto opnieuw:
//   npx vitest run -u src/engine/settingsFoto.test.ts
// Nooit tijdens het verhuizen zelf (stap 1 tot en met 6): daar is een verschil juist de fout.
//
// Alles is nagemaakt, nooit de back-up van de eigenaar. De opstelling "alles anders" is een kopie van die in
// settingsDiff.test.ts (14 november); een nieuwe instelling hoeft hier niet bij, de foto toont hem dan op het advies.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../storage/database';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import { PAGE_ROWS, SETTINGS_PAGES, SHOW_WHEN, allRowIds, isAdvancedRow, isRowShown, pageOfRow, placementOf } from '../data/settingsLayout';
import { SETTINGS_HELP, settingsHelp } from '../data/settingsHelp';
import { CHOICES, choiceShort, type ChoiceId } from '../data/settingsChoices';
import { groupSummary, rowContext, rowSummary, searchResultValue, type SettingsFacts } from './settingsSummary';
import { ADVICE_SPECS, adviceDifferences, countDifferences, differenceIdsOnPage, resetPatch } from './settingsDiff';
import { adjustedRows, adviceTarget, rowAvailability, settingAvailabilityOnPage } from './settingsAvailability';
import { normalizeSearch, searchSettings } from './settingsSearch';
import { DEFAULT_WATCH_USE } from './watchUse';
import type { SettingsSource } from './settingsPending';

// ---- de opstellingen ------------------------------------------------------------------------

const TODAY = '2026-10-22';
const BASIS: AppSettings = { strengthTrackedExternally: false, introSoundEnabled: true };
const ALLE_BRONNEN: SettingsSource[] = ['watch', 'macroFactor', 'storage', 'snapshots', 'autoBackup', 'streams', 'storageUse', 'device', 'healthConnect'];

// Bijna alles anders dan het advies (kopie uit settingsDiff.test.ts).
const ALLES_ANDERS: AppSettings = {
  ...BASIS,
  cardOrder: { stand: ['doel', 'lopen', 'invloed', 'kracht', 'benen', 'belasting', 'vier-regels'] },
  changeApplyMode: 'always_ask',
  ambition: 'stevig',
  restDayMode: 'active',
  hardSameDay: true,
  longRunThenLegs: true,
  testRest: 48,
  longSundaySession: 'run',
  afterMainGoal: 'maintain',
  showNextTrek: false,
  showSeasonStrip: false,
  showSkillGoals: false,
  showStageWater: false,
  askSweat: false,
  trekLegRest: 'strict',
  descentClock: 'uit',
  leaveCrowding: 'shift',
  leaveAround: 'little',
  leaveBackfill: 'off',
  noGymStrength: 'drop',
  longRunGrowth: 'wave',
  bootBreakInKm: 150,
  bootBreakInReminder: false,
  strengthModel: {
    enabled: false, progression: 'reps_first', workSets: 'equal', warmup: 'off', warmupScope: 'exercise', widenRange: false,
    estimateUpTo: 12, restAuto: false, restAlert: 'off', restSound: 'templebell', restVolume: 'clear', restPreTick: true, restNextExercise: false, keepScreenOn: false, carryMode: 'off', showPlates: true, warmupMuted: false, quickRir: false, quickRirMode: 'uit', ladderRow: false, askClean: false, askBand: false, stepProposal: false, calibration: false, knowsYou: false,
    showOneRm: false, oneRmView: 'work_weight', showMacroFactorOneRm: false, compareWeeks: '2_4', listSort: 'name', showExtras: false,
    showTrendLines: false, stackWeights: 'used_only', lighterAfterBreak: false, dumbbellLog: 'total', fatigue: 'fixed', showComparison: true,
    adjustLive: false, reckon: false, learnStands: false, assumedCounts: false, crossFatigue: false, noSpotter: false, mountainMuscles: false, mountainBalance: false, rirPrefill: 'target',
  },
  showBodyFat: false,
  exerciseArt: 'uit',
  guideOpen: true,
  figure: 'vrouw',
  bodyCheck: 'uit',
  legEase: 'uit',
  legEaseHow: 'extra',
  influenceSign: false,
  influenceCause: 'uit',
  influenceOverview: false,
  influenceTestMove: false,
  influenceNames: false,
  intensityCounting: 'plan',
  overviews: {
    morningCheckIn: false, morningCard: false, legsAfterEffort: false, morningCardFrom: '7', weekReview: false, weekReviewDay: 'sunday', weeklyQuestion: true,
    weatherLine: false, weatherSwap: false, bestMoment: false, placeWeather: false, rainSoon: false, hillsNearby: false, moonLine: false, uvAltitude: false, clothingAdvice: false, completionMoment: false,
  },
  askShortNight: false,
  journeyOnToday: 'never',
  afterRunQuestions: 'all',
  askDoubtTest: false,
  newTestOnStops: false,
  restDayBack: false,
  fullWeekAsk: false,
  missedTraining: 'off',
  missedTrainingDays: 3,
  cardsAboveMission: 'all',
  missedLink: false,
  weekFixProposal: false,
  dragWeek: false,
  dropOnTraining: 'together',
  weekAfterChoice: 'plain',
  forgeSwipeDelete: false,
  forgeLayout: 'lijst',
  forgeLogView: 'alle',
  forgeLongBreak: 90,
  forgeCapStrength: 45,
  forgeCapLegs: 90,
  haptics: false,
  restNotice: false,
  weekNotice: false,
  weekNoticeTime: '21:00',
  eveningBefore: false,
  eveningBeforeTime: '22:00',
  eveningNotice: true,
  autoUpdate: false,
  testStops: 'count',
  lthrFactor: 'friel',
  noStrapTest: 'margin',
  testReadyLine: false,
  shortTest: false,
  shortTestWatch: false,
  shorterToday: 'volume',
  zonesAfterTest: false,
  readinessWeighting: 'equal',
  goalGrowth: 'careful',
  limitMargin: 'none',
  proposeTargetTime: false,
  weekBudget: { minutes: 105, strength: 3, doubleHard: false },
  beginnerStart: 'nee',
  beginnerBuild: 'gewoon',
  strengthTraining: false,
  waves: { length: 6, lightWeek: false },
  introSoundEnabled: false,
  motion: 'off',
  quoteLanguage: 'nl',
  sky: 'night',
  skyNightFrom: '22:00',
  runInsight: { enabled: false, weather: false, chestStrap: false, topics: { efficiency: false, longDays: false, climbing: false, form: false }, detail: { show: false, patterns: false, advice: false, form: { cadence: false, stanceTimeMs: false, stepLengthM: false, oscillationMm: false, stanceBalanceLeftPct: true } } },
  tabBack: 'previous',
  resumeMinutes: 0,
  watchRemoveDone: false,
  watchPlaceWorkout: false,
  showWatchStatus: false,
  showWatchStatusOnWeek: false,
  watchNamePrefix: 'none',
  watchHeartRate: 'intervals',
  watchCalmRun: false,
  weightFromMacroFactor: false,
  weightFromHealthConnect: false,
  weightTrend: false,
  weightForLoad: 'latest',
  weightRange: '1y',
  weightCard: false,
  stravaText: false,
  watchFieldsShown: false,
  stravaTextParts: 'title',
  routeProposal: false,
  routeStyle: 'simple',
  routeStart: 'exact',
  routeMapBase: 'none',
  routeMapPhoto: 'photo',
  routeSearch: 'tap',
  keepStreams: false,
  tempoStablePieces: false,
  fuelOnTheGo: false,
  raceDay: false,
  morningInBackup: false,
  watchSilence: false,
  illnessSigns: false,
  heatPace: false,
  weekdayPattern: false,
  airQuality: false,
  morningRule: false,
  morningProposal: false,
  mountainWeather: false,
  weatherWarnings: false,
  avalancheBulletin: false,
  heatAcclimation: false,
  paceCurve: false,
  stageOwnPace: false,
  climbPace: false,
  streamsInBackup: false,
  locationOn: true,
  proposalTidyMonths: 12,
  autoBackup: 'daily',
  autoBackupKeep: 16,
};

// Een verse telefoon: niets ingesteld, niets gekoppeld, geen doel.
const vers: SettingsFacts = {
  today: TODAY,
  settings: { ...BASIS },
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
  watch: null,
  macroFactor: null,
  strengthDurations: [],
  folderSupported: false,
  folderChosen: false,
  storage: undefined,
  snapshots: 0,
  buildLabel: '22 okt, 18:59',
  longSundayVisible: true,
};

// Alles gekoppeld: Garmin, Health Connect, een MacroFactor-export, een hoofddoel, een tocht, een programma,
// sets in ASCEND en de Android-app.
const gekoppeld: SettingsFacts = {
  today: TODAY,
  settings: { ...BASIS, lastExportedAt: '2026-10-10T09:00:00.000Z' },
  dailyTimeBudget: {
    tue: { preferredMinutes: 60 }, wed: { preferredMinutes: 60 }, thu: { preferredMinutes: 60 },
    fri: { preferredMinutes: 60 }, sat: { preferredMinutes: 120 }, sun: { preferredMinutes: 150 },
  },
  pairing: 'automatic',
  position: { weekInProgram: 9, totalWeeks: 45, phaseName: 'OPBOUW' },
  goal: { name: 'GR5 / ALPENKLAAR', date: '2027-07-04' },
  mainIsTrek: true,
  trekGoal: true,
  treks: 2,
  vacations: 1,
  activeInjuries: 1,
  strengthExternal: false,
  ambition: { chosen: 'stevig', effective: 'standaard', reason: 'pijn' },
  weight: { kg: 85.62, source: 'macrofactor', date: '2026-10-22', trendKg: 85.4 },
  hasBodyFat: true,
  watch: { linked: true, syncedAt: '2026-10-22T12:02:00.000Z', use: DEFAULT_WATCH_USE, autoTick: true, leads: true, sendEnabled: true, corrections: true },
  macroFactor: { readAt: '2026-10-22T08:00:00.000Z', leads: true },
  strengthDurations: [
    { name: 'Bovenlichaam A', minutes: 55, source: 'learned', basedOn: 3 },
    { name: 'Benen A', minutes: 70, source: 'estimate', basedOn: 0 },
    { name: 'Benen B', minutes: 65, source: 'default', basedOn: 1 },
  ],
  journeyOpen: 5,
  bootKm: 42,
  packKg: 8.4,
  folderSupported: true,
  folderChosen: true,
  autoBackup: { platform: 'app', where: { kind: 'folder', label: 'ASCEND' }, folder: 'ASCEND', access: 'ready', lastAutoAt: '2026-10-21T20:00:00.000Z' },
  storage: 'protected',
  streamsBytes: 12_400_000,
  storageUse: { kind: 'measured', usage: 48_000_000, quota: 2_000_000_000 },
  snapshots: 2,
  buildLabel: '22 okt, 18:59',
  longSundayVisible: false,
  notice: { support: 'ready', granted: true },
  device: { timed: true, notifications: 'granted', exactAlarm: 'denied', healthConnect: 'granted' },
  liveUpdate: true,
  healthConnect: { inApp: true, enabled: true, fetchedAt: '2026-10-22T07:30:00.000Z', weightGranted: true, roundLines: ['Slaap: 7 nachten'] },
};

const OPSTELLINGEN: Record<string, SettingsFacts> = {
  vers,
  gekoppeld,
  'zonder-doel': { ...vers, settings: { strengthTrackedExternally: true, introSoundEnabled: false, beginnerStart: 'nee', startChoices: { beginnerStart: 'nee' } }, noGoal: true, strengthExternal: true, weight: { kg: 70, source: 'manual', date: '2026-10-20' }, device: 'unknown', notice: { support: 'not_installed', granted: false } },
  laden: { ...gekoppeld, pending: ALLE_BRONNEN },
  onbekend: { ...gekoppeld, unknown: ALLE_BRONNEN, watchUnreadable: true, macroFactor: null },
  'alles-anders': { ...gekoppeld, settings: ALLES_ANDERS },
};

// ---- welke id's ------------------------------------------------------------------------------

// Takken in baseSummary (settingsSummary.ts) die bij geen rij, instelling, voorwaarde of advies horen. Ze staan
// hier vast zodat de foto ze meeneemt; gaat zo'n tak weg (forge-open in stap 4), dan verandert de foto daar bewust.
const LOSSE_TAKKEN: string[] = ['forge-open'];

const INDEX_IDS = SETTINGS_INDEX.map((i) => i.id);
const ROW_IDS = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id));
const ALL_IDS = [...new Set([...INDEX_IDS, ...ROW_IDS, ...Object.keys(SHOW_WHEN), ...ADVICE_SPECS.map((s) => s.id), ...LOSSE_TAKKEN])].sort();

// ---- het bestand -----------------------------------------------------------------------------

// Een waarde die undefined is blijft zichtbaar (een terugzetstuk zet een sleutel op undefined).
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (x === undefined ? '<undefined>' : x));

// Eén regel per sleutel, zodat een verschil precies de plek aanwijst.
function write(sections: Record<string, Record<string, unknown>>): string {
  const out: string[] = ['{'];
  const names = Object.keys(sections);
  names.forEach((name, i) => {
    const entries = Object.entries(sections[name]);
    out.push(`${json(name)}: {`);
    entries.forEach(([k, v], j) => out.push(`  ${json(k)}: ${json(v)}${j < entries.length - 1 ? ',' : ''}`));
    out.push(`}${i < names.length - 1 ? ',' : ''}`);
  });
  out.push('}');
  return out.join('\n') + '\n';
}

// Elke titel, elk trefwoord en elk begin van drie letters daarvan.
function searchQueries(): string[] {
  const q = new Set<string>();
  for (const item of SETTINGS_INDEX) {
    for (const w of [item.title, ...item.keywords]) {
      q.add(w);
      const start = normalizeSearch(w).replace(/[^a-z0-9]/g, '').slice(0, 3);
      if (start.length === 3) q.add(start);
    }
  }
  return [...q].sort();
}

// Welke instellingen in het blad van een rij staan (voor countDifferences).
function bundles(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of INDEX_IDS) {
    const p = placementOf(id);
    if (p?.sheet) (out[p.row] ??= []).push(id);
  }
  return out;
}

const byKey = ([a]: [string, unknown], [b]: [string, unknown]) => (a < b ? -1 : a > b ? 1 : 0);

const numbered = (i: number, id: string) => `${String(i).padStart(3, '0')} ${id}`;

function photo(): string {
  const sections: Record<string, Record<string, unknown>> = {};
  sections.telling = {
    instellingen: SETTINGS_INDEX.length,
    rijen: ROW_IDS.length,
    voorwaarden: Object.keys(SHOW_WHEN).length,
    advies: ADVICE_SPECS.length,
    uitleg: Object.keys(SETTINGS_HELP).length,
    keuzes: Object.keys(CHOICES).length,
    ids: ALL_IDS.length,
    opstellingen: Object.keys(OPSTELLINGEN).length,
  };
  sections.index = Object.fromEntries(SETTINGS_INDEX.map((item, i) => [numbered(i, item.id), item]));
  sections.pagina = Object.fromEntries(SETTINGS_PAGES.map((p) => [p.id, { ...p, rows: PAGE_ROWS[p.id] }]));
  sections.plek = Object.fromEntries(ALL_IDS.map((id) => [id, { placement: placementOf(id) ?? null, page: pageOfRow(id) ?? null, advanced: SETTINGS_PAGES.some((p) => isAdvancedRow(p.id, id)) }]));
  // Op id gesorteerd: de volgorde van de sleutels in SHOW_WHEN doet niets (sinds stap 2 volgt ze de verklaringen).
  sections.voorwaarden = Object.fromEntries(Object.entries(SHOW_WHEN).sort(byKey).map(([id, list]) => [id, list.map((b) => ({ reason: b.reason, parent: b.parent }))]));
  // Uitleg en keuzes op sleutel gesorteerd: de volgorde van de sleutels doet niets (sinds stap 3 volgt ze de verklaringen).
  sections.uitleg = Object.fromEntries(Object.entries(SETTINGS_HELP).sort(byKey));
  sections['uitleg zonder namen'] = Object.fromEntries(Object.keys(SETTINGS_HELP).sort().flatMap((k) => (settingsHelp(k, false) === SETTINGS_HELP[k] ? [] : [[k, settingsHelp(k, false)]])));
  sections.keuzes = Object.fromEntries(Object.entries(CHOICES).sort(byKey).map(([k, c]) => [k, { ...c, shorts: c.options.map((o) => choiceShort(k as ChoiceId, o.value)) }]));
  sections.adviesregels = Object.fromEntries(ADVICE_SPECS.map((s, i) => [numbered(i, s.id), { title: s.title, page: s.page, plan: s.plan === true }]));
  sections.zoeken = Object.fromEntries(searchQueries().map((q) => [q, searchSettings(q, SETTINGS_INDEX).map((r) => `${r.item.id}:${r.score}`).join(' ')]));
  const sheetRows = bundles();
  for (const [name, f] of Object.entries(OPSTELLINGEN)) {
    const ctx = rowContext(f);
    sections[`rijen ${name}`] = Object.fromEntries(ALL_IDS.map((id) => [id, {
      summary: rowSummary(id, f),
      // Wat het zoekveld toont (pages/settings/SettingsOverview.tsx): de eigen waarde, nooit die van de rij eromheen.
      search: searchResultValue(id, f),
      shown: SHOW_WHEN[id] ? isRowShown(id, f.settings, ctx) : null,
      row: rowAvailability(id, f),
      onPage: settingAvailabilityOnPage(id, f),
      target: adviceTarget(id, f) ?? null,
    }]));
    sections[`groepen ${name}`] = Object.fromEntries(SETTINGS_PAGES.map((p) => [p.id, { group: groupSummary(p.id, f), differences: differenceIdsOnPage(f.settings, p.id), adjusted: [...adjustedRows(f.settings, p.id)] }]));
    const differences = Object.fromEntries(adviceDifferences(f.settings).map((d) => [d.id, d]));
    sections[`advies ${name}`] = Object.fromEntries(ADVICE_SPECS.map((s) => [s.id, {
      differs: s.differs(f.settings),
      value: s.value(f.settings),
      reset: s.reset(f.settings),
      difference: differences[s.id] ?? null,
    }]));
    sections[`bladen ${name}`] = Object.fromEntries(Object.entries(sheetRows).map(([row, ids]) => [row, countDifferences(ids, f.settings)]));
    sections[`terugzetten ${name}`] = { alles: resetPatch(f.settings, ADVICE_SPECS.map((s) => s.id)) };
  }
  return write(sections);
}

describe('de foto van de instellingen', () => {
  it('is gelijk aan instellingen-foto.json', async () => {
    await expect(photo()).toMatchFileSnapshot('./__snapshots__/instellingen-foto.json');
  });
});
