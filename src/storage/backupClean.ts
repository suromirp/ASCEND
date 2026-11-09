// Back-up inlezen: elk record nakijken en de instellingen opschonen voordat iets
// de opslag bereikt.

import { cleanCardOrder } from '../engine/cardOrder';
import type { PlannedSession } from '../models/training';
import type { WeeklyHealthCheck } from '../models/checkIn';
import type { WeightEntry } from '../models/metrics';
import type { AppSettings } from './database';
import { isWeeklyIntention } from '../engine/weeklyQuestion';
import { normalizeStrengthSettings } from '../engine/strengthSettings';
import { cleanClothingAdjust } from '../engine/clothingFeedback';
import { cleanRunInsight } from '../engine/runInsightSettings';
import { cleanMorningNotice } from '../engine/morningNotice';
import { cleanWeekNoticeTime } from '../engine/deviceNotices';
import { BREAKIN_KM_OPTIONS } from '../engine/bootBreakIn';
import { cleanNavigationSettings, migrateCardsAboveMission, migrateDirection, migrateWaveSettings, migrateSportHandling, migrateSportCounting, migrateKindAmount, migrateCustomSports, migrateExternalOneRm, migrateInfluences, migrateLeavePeriods, migrateLegEaseDays, migrateTestJudgments, migrateZoneAnswers, migrateWeeklyHealthCheck, migrateNightJudgments, migrateSweatEntries, migrateSweatPre, migrateWeightEntries, readWeekShape, migrateDataSettings, migrateAutoBackupSettings } from './migrations';
import { normalizeJourneyState } from '../engine/journey';
import { normalizePackList } from '../engine/packList';
import { validCatchUp } from '../engine/catchUp';
import { BREAK_ASK_OPTIONS } from '../engine/forgeSession';
import { TIME_CAP_OPTIONS } from '../engine/forgeTimeCap';
import { isRecord } from '../utils/guards';
import { cleanWatchFieldStore } from '../engine/watchFields';
import { WATCH_MODELS } from '../data/watchModels';

// --- import direction: normalize ---------------------------------------------

// A file can be hand-edited, cut off or simply from somewhere else. Every
// record is checked for the fields the app relies on before it can reach
// storage; anything incomplete is dropped and counted, never written —
// one broken log used to crash the Today screen for good.
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
export const hasId = (v: unknown): v is Record<string, unknown> & { id: string } => isRecord(v) && typeof v.id === 'string' && v.id.length > 0;
const isDate = (v: unknown): boolean => typeof v === 'string' && DATE_RE.test(v);

export const isTemplate = (v: unknown) => hasId(v) && typeof v.name === 'string' && typeof v.type === 'string';
export const isPlanned = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.scheduledDate) && isDate(v.weekStartDate) && typeof v.status === 'string';
export const isLog = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.completedDate) && typeof v.completedAt === 'string';

// Een inhaal (PlannedSession.catchUp) die niet klopt, valt weg; de rij blijft.
export function cleanPlannedCatchUp(s: PlannedSession): PlannedSession {
  if (s.catchUp === undefined || validCatchUp(s.catchUp)) return s;
  const { catchUp: _drop, ...rest } = s;
  return rest;
}

export interface Counter { n: number }

export function cleanList<T>(raw: unknown, valid: (v: unknown) => boolean, skipped: Counter): T[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v) => {
    if (valid(v)) return true;
    skipped.n++;
    return false;
  }) as T[];
}

export function cleanSettings(raw: unknown, skipped: Counter): Partial<AppSettings> | undefined {
  if (!isRecord(raw)) return undefined;
  const s: Record<string, unknown> = { ...raw };
  const lists: [string, (v: unknown) => boolean][] = [
    ['weightEntries', (e) => isRecord(e) && isDate(e.date) && typeof e.kg === 'number' && Number.isFinite(e.kg) && (e.basis === undefined || e.basis === 'trend' || e.basis === 'scale') && (e.scaleKg === undefined || (typeof e.scaleKg === 'number' && Number.isFinite(e.scaleKg)))],
    ['illnessEpisodes', (e) => hasId(e) && isDate(e.startDate) && typeof e.kind === 'string'],
    ['morningCheckIns', (e) => isRecord(e) && isDate(e.date)],
    ['weeklyHealthChecks', (e) => isRecord(e) && isDate(e.weekStart) && typeof e.trouble === 'string'],
    ['weeklyIntentions', isWeeklyIntention],
  ];
  // Free days, holidays and treks (backup schema 5). A file from before that
  // simply has none: the key stays absent, which means "not in this backup".
  if ('leavePeriods' in s) {
    const leave = migrateLeavePeriods(s.leavePeriods);
    if (leave.periods === undefined) delete s.leavePeriods;
    else s.leavePeriods = leave.periods;
    skipped.n += leave.skipped;
  }
  for (const [key, valid] of lists) {
    if (!(key in s)) continue;
    const cleaned = cleanList(s[key], valid, skipped);
    if (cleaned === undefined) {
      delete s[key];
      skipped.n++;
    } else {
      s[key] = cleaned;
    }
  }
  // The day of "Niet nu" on the card "Hoe voelt je lijf?" is kept only as a date.
  if (Array.isArray(s.weeklyHealthChecks)) s.weeklyHealthChecks = (s.weeklyHealthChecks as WeeklyHealthCheck[]).map(migrateWeeklyHealthCheck);
  // Your verdicts on short nights: read record by record, a damaged one is
  // dropped and counted, an older file has none and leaves the verdicts on the
  // device alone (storage/migrations.ts#migrateNightJudgments).
  if ('nightJudgments' in s) {
    const nights = migrateNightJudgments(s.nightJudgments);
    if (nights.list === undefined) delete s.nightJudgments;
    else s.nightJudgments = nights.list;
    skipped.n += nights.skipped;
  }
  // What you chose on days with tired legs: record by record, a damaged one is dropped and counted
  // (storage/migrations.ts#migrateLegEaseDays).
  if ('legEaseDays' in s) {
    const eased = migrateLegEaseDays(s.legEaseDays);
    if (eased.list === undefined) delete s.legEaseDays;
    else s.legEaseDays = eased.list;
    skipped.n += eased.skipped;
  }
  // Your verdicts on test runs: record by record, a damaged one is dropped and counted, an
  // older file has none and leaves the verdicts on the device alone
  // (storage/migrations.ts#migrateTestJudgments).
  if ('testJudgments' in s) {
    const tests = migrateTestJudgments(s.testJudgments);
    if (tests.list === undefined) delete s.testJudgments;
    else s.testJudgments = tests.list;
    skipped.n += tests.skipped;
  }
  // Je antwoorden op Zones bijwerken na een test (storage/migrations.ts#migrateZoneAnswers).
  if ('zoneAnswers' in s) {
    const zones = migrateZoneAnswers(s.zoneAnswers);
    if (zones.list === undefined) delete s.zoneAnswers;
    else s.zoneAnswers = zones.list;
    skipped.n += zones.skipped;
  }
  // Your own weighings for sweat loss: record by record, a damaged one is dropped and
  // counted, an older file has none and leaves the weighings on the device alone
  // (storage/migrations.ts#migrateSweatEntries).
  if ('sweatEntries' in s) {
    const sweat = migrateSweatEntries(s.sweatEntries);
    if (sweat.list === undefined) delete s.sweatEntries;
    else s.sweatEntries = sweat.list;
    skipped.n += sweat.skipped;
  }
  // Your weight before a training, kept until its log is there: record by record, a damaged
  // one is dropped and counted; an older file has none (storage/migrations.ts#migrateSweatPre).
  if ('sweatPre' in s) {
    const pre = migrateSweatPre(s.sweatPre);
    if (pre.list === undefined) delete s.sweatPre;
    else s.sweatPre = pre.list;
    skipped.n += pre.skipped;
  }
  // The switch for water per stage: a yes or a no, or not there.
  if ('showStageWater' in s && typeof s.showStageWater !== 'boolean') {
    delete s.showStageWater;
    skipped.n++;
  }
  // Your notes of "Wat speelde er": record by record, a damaged one is dropped and
  // counted, an older file has none and leaves the notes on the device alone
  // (storage/migrations.ts#migrateInfluences).
  if ('influences' in s) {
    const notes = migrateInfluences(s.influences);
    if (notes.list === undefined) delete s.influences;
    else s.influences = notes.list;
    skipped.n += notes.skipped;
  }
  // The shape of your week: known templates on a day from 1 to 7, or not there
  // (storage/migrations.ts#readWeekShape).
  if ('weekShape' in s) {
    const shape = readWeekShape(s.weekShape);
    if (shape === undefined) {
      delete s.weekShape;
      skipped.n++;
    } else {
      s.weekShape = shape;
    }
  }
  // The fat percentage on a weigh-in: a number between 3 and 60 or not there; the
  // weigh-in itself stays (storage/migrations.ts#migrateWeightEntries).
  if (Array.isArray(s.weightEntries)) {
    const weights = migrateWeightEntries(s.weightEntries as WeightEntry[]);
    s.weightEntries = weights.entries;
    skipped.n += weights.skipped;
  }
  // The switch for showing the fat percentage: a yes or a no, or not there.
  if ('showBodyFat' in s && typeof s.showBodyFat !== 'boolean') {
    delete s.showBodyFat;
    skipped.n++;
  }
  // The switches of "Wat speelde er": a yes or a no, and the cause one of three words, or not there.
  for (const key of ['influenceSign', 'influenceOverview', 'influenceTestMove', 'influenceNames']) {
    if (key in s && typeof s[key] !== 'boolean') {
      delete s[key];
      skipped.n++;
    }
  }
  if ('influenceCause' in s && s.influenceCause !== 'uit' && s.influenceCause !== 'weet' && s.influenceCause !== 'patroon') {
    delete s.influenceCause;
    skipped.n++;
  }
  // The 1RM per exercise from MacroFactor: read series by series, a damaged
  // reading is dropped and counted, an older file has none and leaves the
  // readings on the device alone (storage/migrations.ts#migrateExternalOneRm).
  if ('externalOneRm' in s) {
    const oneRm = migrateExternalOneRm(s.externalOneRm);
    if (oneRm.series === undefined) delete s.externalOneRm;
    else s.externalOneRm = oneRm.series;
    skipped.n += oneRm.skipped;
  }
  // The switches for weight from MacroFactor and from Health Connect, "Gewichtstrend
  // gebruiken" and "Uitleg standaard uitgeklapt": a yes or a no, or not there.
  if ('weightForLoad' in s && s.weightForLoad !== 'trend' && s.weightForLoad !== 'latest') {
    delete s.weightForLoad;
    skipped.n++;
  }
  if ('weightRange' in s && s.weightRange !== '4w' && s.weightRange !== '3m' && s.weightRange !== '1y') {
    delete s.weightRange;
    skipped.n++;
  }
  for (const key of ['weightFromMacroFactor', 'weightFromHealthConnect', 'weightTrend', 'guideOpen']) {
    if (key in s && typeof s[key] !== 'boolean') {
      delete s[key];
      skipped.n++;
    }
  }
  // The switches for the next tocht on Vandaag and the rest after a bergtocht:
  // a yes or a no, or one of two words, or not there.
  if ('showNextTrek' in s && typeof s.showNextTrek !== 'boolean') {
    delete s.showNextTrek;
    skipped.n++;
  }
  if ('showSeasonStrip' in s && typeof s.showSeasonStrip !== 'boolean') {
    delete s.showSeasonStrip;
    skipped.n++;
  }
  if ('showSkillGoals' in s && typeof s.showSkillGoals !== 'boolean') {
    delete s.showSkillGoals;
    skipped.n++;
  }
  if ('bootBreakInKm' in s && !(BREAKIN_KM_OPTIONS as readonly unknown[]).includes(s.bootBreakInKm)) {
    delete s.bootBreakInKm;
    skipped.n++;
  }
  if ('bootBreakInReminder' in s && typeof s.bootBreakInReminder !== 'boolean') {
    delete s.bootBreakInReminder;
    skipped.n++;
  }
  // Snelknoppen tonen bestaat niet meer (docs/beslissingen/2026-11-02-forge-herinrichting.md): een oude
  // waarde wordt stil genegeerd, het is geen fout in het bestand.
  delete s.forgeQuickButtons;
  for (const key of ['showWatchStatus', 'showWatchStatusOnWeek', 'watchRemoveDone', 'stravaText', 'watchFieldsShown', 'routeProposal', 'askShortNight', 'askSweat', 'askDoubtTest', 'newTestOnStops', 'restDayBack', 'missedLink', 'weekFixProposal', 'dragWeek', 'longRunThenLegs', 'forgeSwipeDelete', 'haptics', 'locationOn', 'proposeTargetTime', 'keepStreams', 'streamsInBackup', 'morningInBackup', 'watchSilence', 'illnessSigns', 'heatPace', 'weekdayPattern', 'airQuality', 'morningRule', 'restNotice', 'weekNotice', 'autoUpdate', 'morningProposal', 'mountainWeather', 'weatherWarnings', 'avalancheBulletin', 'heatAcclimation', 'paceCurve', 'weightCard', 'stageOwnPace', 'climbPace', 'zonesAfterTest', 'tempoStablePieces'] as const) {
    if (key in s && typeof s[key] !== 'boolean') {
      delete s[key];
      skipped.n++;
    }
  }
  // Reeksen in back-up als keuze en het opruimen van oude voorstellen
  // (storage/migrations.ts#migrateDataSettings).
  {
    const data = migrateDataSettings(s);
    delete s.streamsBackup;
    delete s.proposalTidyMonths;
    Object.assign(s, data.value);
    skipped.n += data.skipped;
  }
  // Automatische back-up: hoe vaak en hoeveel bestanden blijven (storage/migrations.ts#migrateAutoBackupSettings).
  {
    const auto = migrateAutoBackupSettings(s);
    delete s.autoBackup;
    delete s.autoBackupKeep;
    Object.assign(s, auto.value);
    skipped.n += auto.skipped;
  }
  // Training die niet doorging: een van de drie keuzes en 1, 2 of 3 dagen, of niet daar.
  if ('missedTraining' in s && s.missedTraining !== 'ask' && s.missedTraining !== 'auto' && s.missedTraining !== 'off') {
    delete s.missedTraining;
    skipped.n++;
  }
  // Kaarten boven de missie: 1, 2 of alles, of niet daar (storage/migrations.ts#migrateCardsAboveMission).
  if ('cardsAboveMission' in s) {
    const above = migrateCardsAboveMission(s.cardsAboveMission);
    if (above === undefined) {
      delete s.cardsAboveMission;
      skipped.n++;
    }
  }
  if ('missedTrainingDays' in s && s.missedTrainingDays !== 1 && s.missedTrainingDays !== 2 && s.missedTrainingDays !== 3) {
    delete s.missedTrainingDays;
    skipped.n++;
  }
  if ('readinessWeighting' in s && s.readinessWeighting !== 'speed' && s.readinessWeighting !== 'equal') {
    delete s.readinessWeighting;
    skipped.n++;
  }
  if ('goalGrowth' in s && s.goalGrowth !== 'average' && s.goalGrowth !== 'careful') {
    delete s.goalGrowth;
    skipped.n++;
  }
  if ('limitMargin' in s && s.limitMargin !== 'ten' && s.limitMargin !== 'five' && s.limitMargin !== 'none') {
    delete s.limitMargin;
    skipped.n++;
  }
  if ('forgeLayout' in s && s.forgeLayout !== 'scherm' && s.forgeLayout !== 'lijst') {
    delete s.forgeLayout;
    skipped.n++;
  }
  if ('forgeLongBreak' in s && !(BREAK_ASK_OPTIONS as readonly number[]).includes(s.forgeLongBreak as number)) {
    delete s.forgeLongBreak;
    skipped.n++;
  }
  // Hoogstens per krachttraining (engine/forgeTimeCap.ts): een van de vaste keuzes, of niet daar.
  for (const key of ['forgeCapStrength', 'forgeCapLegs'] as const) {
    if (key in s && !(TIME_CAP_OPTIONS as readonly number[]).includes(s[key] as number)) {
      delete s[key];
      skipped.n++;
    }
  }
  if ('exerciseArt' in s && s.exerciseArt !== 'beide' && s.exerciseArt !== 'spierkaart' && s.exerciseArt !== 'uit') {
    delete s.exerciseArt;
    skipped.n++;
  }
  if ('testStops' in s && s.testStops !== 'skip' && s.testStops !== 'count') {
    delete s.testStops;
    skipped.n++;
  }
  // Minder tijd vandaag (engine/shorterToday.ts): een van de drie keuzes, of niet daar.
  if ('shorterToday' in s && s.shorterToday !== 'kern' && s.shorterToday !== 'volume' && s.shorterToday !== 'off') {
    delete s.shorterToday;
    skipped.n++;
  }
  if ('intensityCounting' in s && s.intensityCounting !== 'heartrate' && s.intensityCounting !== 'plan') {
    delete s.intensityCounting;
    skipped.n++;
  }
  // Tekst voor Strava: alleen de titel, of titel en regel; iets anders is niet van ASCEND.
  if ('stravaTextParts' in s && s.stravaTextParts !== 'title' && s.stravaTextParts !== 'title-line') {
    delete s.stravaTextParts;
    skipped.n++;
  }
  // Datavelden voor je horloge: een model dat ASCEND kent, en alleen versies in de vorm van ASCEND.
  // Een kapotte versie valt weg en telt één keer; een veld dat het model niet kent blijft staan en
  // wordt bij het lezen vervangen (engine/watchFields.ts#resolveVersion).
  if ('watchModel' in s && !(typeof s.watchModel === 'string' && Object.hasOwn(WATCH_MODELS, s.watchModel))) {
    delete s.watchModel;
    skipped.n++;
  }
  if ('watchFieldVersions' in s) {
    const { store, dropped } = cleanWatchFieldStore(s.watchFieldVersions);
    if (store) s.watchFieldVersions = store;
    else delete s.watchFieldVersions;
    if (dropped) skipped.n++;
  }
  // Route voorstellen: Simpel of Avontuurlijk; iets anders is niet van ASCEND.
  if ('routeStyle' in s && s.routeStyle !== 'simple' && s.routeStyle !== 'adventure') {
    delete s.routeStyle;
    skipped.n++;
  }
  if ('watchNamePrefix' in s && s.watchNamePrefix !== 'short' && s.watchNamePrefix !== 'long' && s.watchNamePrefix !== 'none') {
    delete s.watchNamePrefix;
    skipped.n++;
  }
  if ('watchHeartRate' in s && s.watchHeartRate !== 'ascend' && s.watchHeartRate !== 'intervals') {
    delete s.watchHeartRate;
    skipped.n++;
  }
  if ('watchCalmRun' in s && typeof s.watchCalmRun !== 'boolean') {
    delete s.watchCalmRun;
    skipped.n++;
  }
  if ('longRunGrowth' in s && s.longRunGrowth !== 'weekly' && s.longRunGrowth !== 'biweekly' && s.longRunGrowth !== 'wave' && s.longRunGrowth !== 'firm' && s.longRunGrowth !== 'fast') {
    delete s.longRunGrowth;
    skipped.n++;
  }
  if ('trekLegRest' in s && s.trekLegRest !== 'soft' && s.trekLegRest !== 'strict') {
    delete s.trekLegRest;
    skipped.n++;
  }
  // Rust voor een test: 48 of 72 uur, of niet aanwezig (72, het advies).
  if ('testRest' in s && s.testRest !== 48 && s.testRest !== 72) {
    delete s.testRest;
    skipped.n++;
  }
  if ('leaveCrowding' in s && s.leaveCrowding !== 'drop' && s.leaveCrowding !== 'shift') {
    delete s.leaveCrowding;
    skipped.n++;
  }
  if ('leaveAround' in s && s.leaveAround !== 'wide' && s.leaveAround !== 'little') {
    delete s.leaveAround;
    skipped.n++;
  }
  // Kracht zonder sportschool: eigen gewicht of laten vervallen, of niet aanwezig (het advies).
  if ('noGymStrength' in s && s.noGymStrength !== 'bodyweight' && s.noGymStrength !== 'drop') {
    delete s.noGymStrength;
    skipped.n++;
  }
  // Loslaten op een training in Week: ruilen of samen, of niet aanwezig (het advies).
  if ('dropOnTraining' in s && s.dropOnTraining !== 'swap' && s.dropOnTraining !== 'together') {
    delete s.dropOnTraining;
    skipped.n++;
  }
  // Back button and resuming after a restart: known values stay, the rest goes.
  if ('tabBack' in s || 'resumeMinutes' in s) {
    const nav = cleanNavigationSettings({ tabBack: s.tabBack, resumeMinutes: s.resumeMinutes });
    delete s.tabBack;
    delete s.resumeMinutes;
    Object.assign(s, nav.value);
    skipped.n += nav.skipped;
  }
  // Zonder doel: the direction, its start and your weekly budget; known values stay.
  if ('direction' in s || 'directionStart' in s || 'weekBudget' in s) {
    const clean = migrateDirection({ direction: s.direction, directionStart: s.directionStart, weekBudget: s.weekBudget });
    delete s.direction;
    delete s.directionStart;
    delete s.weekBudget;
    Object.assign(s, clean.value);
    skipped.n += clean.skipped;
  }
  // Sporten die meetellen: known sports with a role they know, and real fixed appointments.
  if ('sportHandling' in s) {
    const clean = migrateSportHandling(s.sportHandling);
    delete s.sportHandling;
    if (clean.value) s.sportHandling = clean.value;
    skipped.n += clean.skipped;
  }
  // Je eigen sporten: a type, a feel and a role.
  if ('customSports' in s) {
    const clean = migrateCustomSports(s.customSports);
    delete s.customSports;
    if (clean.value) s.customSports = clean.value;
    skipped.n += clean.skipped;
  }
  // Hoeveel per soort: known kinds with Minder or Meer.
  if ('kindAmount' in s) {
    const clean = migrateKindAmount(s.kindAmount);
    delete s.kindAmount;
    if (clean.value) s.kindAmount = clean.value;
    skipped.n += clean.skipped;
  }
  // Hoe sporten meetellen: known choices only.
  if ('sportCounting' in s) {
    const clean = migrateSportCounting(s.sportCounting);
    delete s.sportCounting;
    if (clean.value) s.sportCounting = clean.value;
    skipped.n += clean.skipped;
  }
  // Zonder doel: the choices around waves; known values stay.
  if ('beginnerStart' in s || 'waves' in s || 'waveReviewDone' in s || 'noGoalWaves' in s) {
    const clean = migrateWaveSettings({ beginnerStart: s.beginnerStart, waves: s.waves, waveReviewDone: s.waveReviewDone, noGoalWaves: s.noGoalWaves });
    delete s.beginnerStart;
    delete s.waves;
    delete s.waveReviewDone;
    delete s.noGoalWaves;
    Object.assign(s, clean.value);
    skipped.n += clean.skipped;
  }
  // The switches of "Overzichten en vragen": a record or not there; the engine
  // reads every key defensively (engine/overviewSettings.ts#resolveOverviews).
  if ('overviews' in s && !isRecord(s.overviews)) {
    delete s.overviews;
    skipped.n++;
  }
  // De volgorde van de blokken op Je stand: een record van lijsten tekst, anders weg.
  if ('cardOrder' in s) {
    const clean = cleanCardOrder(s.cardOrder);
    if (clean) s.cardOrder = clean;
    else {
      delete s.cardOrder;
      skipped.n++;
    }
  }
  // Forge (Kracht meerekenen): only valid values stay; rubbish is dropped.
  if ('strengthModel' in s) {
    const clean = normalizeStrengthSettings(s.strengthModel);
    if (!clean) {
      delete s.strengthModel;
      skipped.n++;
    } else {
      // Alleen een echt weggevallen of verbeterde waarde telt, niet een andere volgorde van de sleutels.
      if (sortedJson(clean) !== sortedJson(s.strengthModel)) skipped.n++;
      s.strengthModel = clean;
    }
  }
  // Your nudge of the clothing advice: only known sports with a finite number
  // within plus or minus 4 degrees; the rest is dropped and counted.
  if ('clothingAdjust' in s) {
    const cleaned = cleanClothingAdjust(s.clothingAdjust);
    skipped.n += cleaned.skipped;
    if (Object.keys(cleaned.value).length > 0) s.clothingAdjust = cleaned.value;
    else delete s.clothingAdjust;
  }
  // Loopinzicht: only valid switches stay; the rest is dropped and counted.
  if ('runInsight' in s) {
    const cleaned = cleanRunInsight(s.runInsight);
    skipped.n += cleaned.dropped;
    if (cleaned.value) s.runInsight = cleaned.value;
    else delete s.runInsight;
  }
  // Ochtendmelding: a valid switch and time stay, the rest is dropped and counted.
  if ('morningNotice' in s) {
    const cleaned = cleanMorningNotice(s.morningNotice);
    skipped.n += cleaned.dropped;
    if (cleaned.value) s.morningNotice = cleaned.value;
    else delete s.morningNotice;
  }
  // De tijd van de weekmelding: alleen een van de vaste tijden blijft staan.
  if ('weekNoticeTime' in s) {
    const time = cleanWeekNoticeTime(s.weekNoticeTime);
    if (time) s.weekNoticeTime = time;
    else {
      delete s.weekNoticeTime;
      skipped.n++;
    }
  }
  // Reisplanner and paklijst: kept readable or dropped, never stored half.
  if ('journey' in s) {
    const { state, skipped: n } = normalizeJourneyState(s.journey);
    skipped.n += n;
    if (state) s.journey = state;
    else delete s.journey;
  }
  if ('packList' in s) {
    const { state, skipped: n } = normalizePackList(s.packList);
    skipped.n += n;
    if (state) s.packList = state;
    else delete s.packList;
  }
  return s as Partial<AppSettings>;
}

// JSON met de sleutels op alfabet, zodat twee gelijke objecten met een andere volgorde gelijk zijn.
function sortedJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}
