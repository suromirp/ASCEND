import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../storage/database';
import { ADVICE_SPECS, adviceDifferences, countDifferences, differenceIdsOnPage, resetPatch } from './settingsDiff';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import { placementOf } from '../data/settingsLayout';
import { resolveStrengthSettings } from './strengthSettings';

const base: AppSettings = { strengthTrackedExternally: false, introSoundEnabled: true };
const apply = (s: AppSettings, patch: Partial<AppSettings>): AppSettings => ({ ...s, ...patch });

// Een telefoon waar bijna alles anders staat dan het advies.
const everything: AppSettings = {
  ...base,
  cardOrder: { stand: ['doel', 'lopen', 'invloed', 'kracht', 'benen', 'belasting', 'vier-regels'] },
  changeApplyMode: 'always_ask',
  ambition: 'stevig',
  restDayMode: 'active',
  hardSameDay: true,
  longSundaySession: 'run',
  afterMainGoal: 'maintain',
  showNextTrek: false,
  showSeasonStrip: false,
  showStageWater: false,
  askSweat: false,
  trekLegRest: 'strict',
  longRunGrowth: 'wave',
  bootBreakInKm: 150,
  bootBreakInReminder: false,
  strengthModel: {
    enabled: false, progression: 'reps_first', workSets: 'equal', warmup: 'off', warmupScope: 'exercise', widenRange: false,
    estimateUpTo: 12, restAuto: false, restAlert: 'off', restSound: 'gong', keepScreenOn: false, carryMode: 'off', showPlates: false,
    showOneRm: false, oneRmView: 'work_weight', showMacroFactorOneRm: false, compareWeeks: '2_4', listSort: 'name', showExtras: false,
    showTrendLines: false, stackWeights: 'used_only', lighterAfterBreak: false, dumbbellLog: 'total', fatigue: 'fixed', showComparison: true,
    adjustLive: false, noSpotter: false, rirPrefill: 'target',
  },
  showBodyFat: false,
  exerciseArt: 'uit',
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
    morningCheckIn: false, morningCard: false, morningCardFrom: '7', weekReview: false, weekReviewDay: 'sunday', weeklyQuestion: false,
    weatherLine: false, weatherSwap: false, bestMoment: false, clothingAdvice: false, completionMoment: false,
  },
  askShortNight: false,
  askDoubtTest: false,
  newTestOnStops: false,
  weekFixProposal: false,
  dragWeek: false,
  haptics: false,
  testStops: 'count',
  readinessWeighting: 'equal',
  goalGrowth: 'careful',
  limitMargin: 'none',
  proposeTargetTime: false,
  weekBudget: { minutes: 105, strength: 3, doubleHard: false },
  introSoundEnabled: false,
  motion: 'off',
  sky: 'night',
  skyNightFrom: '22:00',
  runInsight: { enabled: false, weather: false, chestStrap: false, topics: { efficiency: false, longDays: false, climbing: false, form: false } },
  tabBack: 'previous',
  resumeMinutes: 0,
  watchRemoveDone: false,
  showWatchStatus: false,
  showWatchStatusOnWeek: false,
  watchNamePrefix: 'none',
  watchHeartRate: 'intervals',
  watchCalmRun: false,
  weightFromMacroFactor: false,
  stravaText: false,
  keepStreams: false,
  streamsInBackup: false,
};

describe('adviceDifferences', () => {
  it('een verse telefoon staat overal op het advies', () => {
    expect(adviceDifferences(base)).toEqual([]);
    expect(adviceDifferences({ ...base, strengthModel: {}, overviews: {}, runInsight: {} })).toEqual([]);
  });

  it('noemt wat je zelf anders koos, met de waarde van nu en die van het advies', () => {
    const s = apply(base, { ambition: 'stevig', overviews: { weekReview: false }, strengthModel: { restSound: 'gong' } });
    const found = adviceDifferences(s);
    expect(found.map((d) => d.id)).toEqual(['ambitie', 'forge-geluid', 'weekterugblik']);
    expect(found.find((d) => d.id === 'ambitie')).toEqual({ id: 'ambitie', title: 'Ambitie', page: 'planning', value: 'Stevig', advice: 'Standaard', plan: true });
    expect(found.find((d) => d.id === 'weekterugblik')).toMatchObject({ value: 'Uit', advice: 'Aan', plan: false, page: 'vandaag' });
    expect(found.find((d) => d.id === 'forge-geluid')).toMatchObject({ page: 'forge', plan: false });
  });

  it('een waarde die gelijk is aan het advies telt niet, ook als hij erbij staat', () => {
    const s = apply(base, { ambition: 'standaard', overviews: { weekReview: true }, strengthModel: { restSound: 'chime', progression: 'weight_first' } });
    expect(adviceDifferences(s)).toEqual([]);
  });

  it('een eigen volgorde van Je stand telt, de standaard en een beschadigde niet', () => {
    const own = apply(base, { cardOrder: { stand: ['kracht', 'benen', 'belasting', 'vier-regels', 'lopen', 'invloed', 'doel'] } });
    expect(adviceDifferences(own).map((d) => d.id)).toEqual(['volgorde-stand']);
    expect(adviceDifferences(apply(base, { cardOrder: { stand: ['benen', 'belasting', 'kracht', 'vier-regels', 'lopen', 'invloed', 'doel'] } }))).toEqual([]);
    expect(adviceDifferences({ ...base, cardOrder: 'rommel' } as unknown as AppSettings)).toEqual([]);
  });

  it('een beschadigde waarde telt als het advies', () => {
    const s = { ...base, motion: 'rommel', sky: 5, overviews: { morningCardFrom: 'x' } } as unknown as AppSettings;
    expect(adviceDifferences(s)).toEqual([]);
  });

  it('alleen wat de planning raakt is gemarkeerd', () => {
    const planIds = adviceDifferences(everything).filter((d) => d.plan).map((d) => d.id).sort();
    expect(planIds).toEqual(['ambitie', 'lange-loop', 'lange-zondag', 'na-hoofddoel', 'rust-na-tocht', 'rustdag-doen', 'zware-dingen']);
  });

  it('elke instelling in de lijst staat in de index en heeft een plek', () => {
    const ids = new Set(SETTINGS_INDEX.map((i) => i.id));
    for (const spec of ADVICE_SPECS) {
      expect(ids.has(spec.id), `${spec.id} staat niet in de index`).toBe(true);
      expect(placementOf(spec.id), spec.id).toBeDefined();
    }
    expect(new Set(ADVICE_SPECS.map((s) => s.id)).size).toBe(ADVICE_SPECS.length);
  });

  it('als alles anders staat, wijst elke instelling in de lijst een verschil aan', () => {
    const found = new Set(adviceDifferences(everything).map((d) => d.id));
    const missing = ADVICE_SPECS.filter((spec) => !found.has(spec.id)).map((spec) => spec.id);
    // De MacroFactor-1RM en de lijst-opties zijn anders gezet; alleen Forge zelf blijft over als we het uitzetten.
    expect(missing).toEqual([]);
  });
});

describe('resetPatch', () => {
  it('zet alles terug op het advies, in twee delen: wat meteen kan en wat de planning raakt', () => {
    const all = adviceDifferences(everything).map((d) => d.id);
    const { now, plan, planTitles } = resetPatch(everything, all);
    expect(Object.keys(plan).sort()).toEqual(['afterMainGoal', 'ambition', 'hardSameDay', 'longRunGrowth', 'longSundaySession', 'restDayMode', 'trekLegRest']);
    expect(planTitles).toHaveLength(7);
    expect(Object.keys(now)).not.toContain('ambition');
    const after = apply(apply(everything, now), plan);
    expect(adviceDifferences(after)).toEqual([]);
  });

  it('zonder het planningsdeel blijft de planning staan', () => {
    const { now } = resetPatch(everything, adviceDifferences(everything).map((d) => d.id));
    const half = apply(everything, now);
    expect(adviceDifferences(half).map((d) => d.id).sort()).toEqual(['ambitie', 'lange-loop', 'lange-zondag', 'na-hoofddoel', 'rust-na-tocht', 'rustdag-doen', 'zware-dingen']);
    expect(half.ambition).toBe('stevig');
  });

  it('een instelling die al op het advies staat doet niet mee', () => {
    const s = apply(base, { motion: 'calm' });
    const { now, plan } = resetPatch(s, ['beweging', 'lucht']);
    expect(now).toEqual({ motion: undefined });
    expect(plan).toEqual({});
  });

  it('laat de rest van het krachtmodel en de sportschool staan', () => {
    const s = apply(base, { strengthModel: { restSound: 'gong', restAuto: false, activeProfileId: 'a', restSeconds: { squat: 120 } } });
    const { now } = resetPatch(s, ['forge-geluid']);
    expect(now.strengthModel).toEqual({ restAuto: false, activeProfileId: 'a', restSeconds: { squat: 120 } });
    const after = apply(s, now);
    expect(resolveStrengthSettings(after.strengthModel).restSound).toBe('chime');
    expect(resolveStrengthSettings(after.strengthModel).restAuto).toBe(false);
  });

  it('ook de oude sleutels van een oudere back-up gaan mee, anders kwam het oude gedrag terug', () => {
    const s = apply(base, { strengthModel: { carryWeights: false, learnStacks: false } });
    expect(adviceDifferences(s).map((d) => d.id)).toEqual(['forge-leren', 'forge-doorvoeren']);
    const { now } = resetPatch(s, ['forge-doorvoeren', 'forge-leren']);
    expect(adviceDifferences(apply(s, now))).toEqual([]);
  });

  it('de geluidsschakelaar gaat terug naar aan, niet naar leeg', () => {
    expect(resetPatch(apply(base, { introSoundEnabled: false }), ['geluid']).now).toEqual({ introSoundEnabled: true });
  });

  it('Status van het versturen zet de markering op Week mee terug', () => {
    const s = apply(base, { showWatchStatus: false, showWatchStatusOnWeek: false });
    const { now } = resetPatch(s, ['horloge-status']);
    expect(now).toEqual({ showWatchStatus: undefined, showWatchStatusOnWeek: undefined });
  });

  it('alleen de markering op Week uit telt als afwijking van Status van het versturen', () => {
    const s = apply(base, { showWatchStatusOnWeek: false });
    expect(adviceDifferences(s).map((d) => d.id)).toEqual(['horloge-status']);
    expect(adviceDifferences(s)[0].value).toBe('Uit');
    expect(resetPatch(s, ['horloge-status']).now).toEqual({ showWatchStatus: undefined, showWatchStatusOnWeek: undefined });
  });

  it('de onderwerpen van het loopinzicht gaan elk apart terug', () => {
    const s = apply(base, { runInsight: { topics: { efficiency: false, form: false }, weather: false } });
    expect(adviceDifferences(s).map((d) => d.id)).toEqual(['loop-efficientie', 'loop-vorm', 'loopweer']);
    const { now } = resetPatch(s, ['loop-vorm']);
    expect(apply(s, now).runInsight).toEqual({ topics: { efficiency: false }, weather: false });
  });
});

describe('countDifferences en de groepen', () => {
  it('telt wat in een blad anders staat en kent de verschillen per groep', () => {
    const s = apply(base, { strengthModel: { fatigue: 'fixed', widenRange: false, restSound: 'gong' } });
    expect(countDifferences(['forge-sets', 'forge-vermoeidheid', 'forge-pauze', 'forge-bereik', 'forge-schatting', 'forge-leren'], s)).toBe(2);
    expect(countDifferences(['forge-sets'], base)).toBe(0);
    expect(differenceIdsOnPage(s, 'forge')).toEqual(['forge-vermoeidheid', 'forge-bereik', 'forge-geluid']);
    expect(differenceIdsOnPage(s, 'vandaag')).toEqual([]);
  });
});
