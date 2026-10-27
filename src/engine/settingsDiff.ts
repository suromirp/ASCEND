// ASCEND: wat staat er anders dan het advies? Puur: de instellingen gaan erin, een lijst
// met wat je zelf anders koos komt eruit, met de waarde van nu en die van het advies, en
// de wijziging die het weer terugzet. Elke instelling wordt met zijn eigen resolve-functie
// gelezen en met de standaard vergeleken, zodat "advies" nooit een tweede waarheid is
// naast de code (docs/beslissingen/2026-10-26-instellingen-opruimen.md).
//
// Er wordt niets opgeslagen: terugzetten haalt de sleutel weg (of zet de standaard terug),
// en dan geldt het advies weer. Wat de planning raakt is gemarkeerd (`plan`): dat gaat in de
// app via een voorstel met Akkoord, nooit stil.
//
// Niet in de lijst: wat geen vaste standaard heeft (rustdag, trainingstijd, sporten en hun
// frequentie, hartslagwaarden, de sportschool, de plaats van het weer) en wat buiten
// AppSettings staat (de schakelaars van het horloge, tweemaal Garmin en MacroFactor).

import type { AppSettings } from '../storage/database';
import { choiceShort, type ChoiceId } from '../data/settingsChoices';
import type { SettingsPageId } from '../data/settingsLayout';
import { bootGoalKm } from './bootBreakIn';
import { resolveFigureSetting } from './figureSettings';
import { resolveIntensityCounting } from './intensitySettings';
import { resolveMotion } from './motionSettings';
import { resolveNavigation, resumeLabel } from './navigationSettings';
import { resolveOverviews, type OverviewSettings } from './overviewSettings';
import { resolveRunInsight, type InsightTopicSwitch } from './runInsightSettings';
import { resolveSky } from './skySettings';
import { resolveStrengthSettings, type StrengthSettings } from './strengthSettings';
import { resolveCalmRun, resolveWatchHrMode } from './watchHeartRate';

export interface AdviceSpec {
  // Een id uit de index (settingsIndex.ts): zo vindt de kaart de plek van de instelling.
  id: string;
  title: string;
  page: SettingsPageId;
  // Raakt de planning: terugzetten gaat via een voorstel met Akkoord.
  plan?: boolean;
  differs: (s: AppSettings) => boolean;
  value: (s: AppSettings) => string;
  reset: (s: AppSettings) => Partial<AppSettings>;
}

export interface AdviceDifference {
  id: string;
  title: string;
  page: SettingsPageId;
  value: string;
  advice: string;
  plan: boolean;
}

// ---- hulpjes ---------------------------------------------------------------------------

const onOff = (on: boolean) => (on ? 'Aan' : 'Uit');

function omit<T extends object>(obj: T | undefined, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  const next = { ...obj } as Record<string, unknown>;
  for (const k of keys) delete next[k];
  return Object.keys(next).length > 0 ? (next as T) : undefined;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Een gewone sleutel van AppSettings met een standaard.
function plain<K extends keyof AppSettings>(
  id: string,
  title: string,
  page: SettingsPageId,
  key: K,
  fallback: NonNullable<AppSettings[K]>,
  text: (v: NonNullable<AppSettings[K]>) => string,
  opts: { plan?: boolean; resetTo?: AppSettings[K] } = {},
): AdviceSpec {
  const read = (s: AppSettings) => (s[key] ?? fallback) as NonNullable<AppSettings[K]>;
  return {
    id, title, page, plan: opts.plan,
    differs: (s) => !same(read(s), fallback),
    value: (s) => text(read(s)),
    reset: () => ({ [key]: 'resetTo' in opts ? opts.resetTo : undefined }) as Partial<AppSettings>,
  };
}

const flag = <K extends keyof AppSettings>(id: string, title: string, page: SettingsPageId, key: K, opts: { fallback?: boolean; resetTo?: boolean } = {}) =>
  plain(id, title, page, key, (opts.fallback ?? true) as NonNullable<AppSettings[K]>, (v) => onOff(v === true), { resetTo: opts.resetTo as AppSettings[K] });

const choice = <K extends keyof AppSettings>(id: string, title: string, page: SettingsPageId, key: K, fallback: NonNullable<AppSettings[K]>, choiceId: ChoiceId, plan?: boolean) =>
  plain(id, title, page, key, fallback, (v) => choiceShort(choiceId, v as string | number), { plan });

// Een sleutel van "Kracht meerekenen" (strengthModel), gelezen via de resolve-functie.
const DEFAULT_STRENGTH = resolveStrengthSettings(undefined) as unknown as Record<string, unknown>;
function strengthSpec(id: string, title: string, key: string, text: (v: never) => string, extraKeys: string[] = []): AdviceSpec {
  const read = (s: AppSettings) => (resolveStrengthSettings(s.strengthModel) as unknown as Record<string, unknown>)[key];
  return {
    id, title, page: 'forge',
    differs: (s) => !same(read(s), DEFAULT_STRENGTH[key]),
    value: (s) => (text as (v: unknown) => string)(read(s)),
    reset: (s) => ({ strengthModel: omit<StrengthSettings>(s.strengthModel, key, ...extraKeys) ?? {} }),
  };
}
const strengthFlag = (id: string, title: string, key: string) => strengthSpec(id, title, key, (v: boolean) => onOff(v));
const strengthChoice = (id: string, title: string, key: string, choiceId: ChoiceId, extraKeys?: string[]) =>
  strengthSpec(id, title, key, (v: string | number) => choiceShort(choiceId, v), extraKeys);

// Een sleutel van "Overzichten en vragen" (overviews).
const DEFAULT_OVERVIEWS = resolveOverviews(undefined) as Record<string, unknown>;
function overviewSpec(id: string, title: string, key: keyof OverviewSettings, text: (v: never) => string): AdviceSpec {
  const read = (s: AppSettings) => (resolveOverviews(s.overviews) as Record<string, unknown>)[key];
  return {
    id, title, page: 'vandaag',
    differs: (s) => !same(read(s), DEFAULT_OVERVIEWS[key]),
    value: (s) => (text as (v: unknown) => string)(read(s)),
    reset: (s) => ({ overviews: omit<OverviewSettings>(s.overviews, key) }),
  };
}
const overviewFlag = (id: string, title: string, key: keyof OverviewSettings) => overviewSpec(id, title, key, (v: boolean) => onOff(v));

// Loopinzicht (runInsight).
const insightFlag = (id: string, title: string, key: 'enabled' | 'weather' | 'chestStrap'): AdviceSpec => ({
  id, title, page: 'vandaag',
  differs: (s) => resolveRunInsight(s.runInsight)[key] !== true,
  value: (s) => onOff(resolveRunInsight(s.runInsight)[key]),
  reset: (s) => ({ runInsight: omit(s.runInsight, key) }),
});
const insightTopic = (id: string, title: string, topic: InsightTopicSwitch): AdviceSpec => ({
  id, title, page: 'vandaag',
  differs: (s) => resolveRunInsight(s.runInsight).topics[topic] !== true,
  value: (s) => onOff(resolveRunInsight(s.runInsight).topics[topic]),
  reset: (s) => ({ runInsight: { ...s.runInsight, topics: omit(s.runInsight?.topics, topic) } }),
});

// ---- de lijst ----------------------------------------------------------------------------

export const ADVICE_SPECS: AdviceSpec[] = [
  // Planning
  choice('wijzigingen', 'Wijzigingen', 'planning', 'changeApplyMode', 'auto_small', 'wijzigingen'),
  choice('ambitie', 'Ambitie', 'planning', 'ambition', 'standaard', 'ambitie', true),
  choice('lange-loop', 'Groei van de lange loop', 'planning', 'longRunGrowth', 'weekly', 'langeLoopGroei', true),
  choice('rustdag-doen', 'Op je rustdag', 'planning', 'restDayMode', 'rest', 'rustdagDoen', true),
  plain('zware-dingen', 'Benen en een zware loop', 'planning', 'hardSameDay', false as boolean, (v) => onOff(v === true), { plan: true }),

  // Doel en tochten
  choice('lange-zondag', 'De lange zondag', 'doel', 'longSundaySession', 'hike', 'langeZondag', true),
  choice('na-hoofddoel', 'Na je hoofddoel', 'doel', 'afterMainGoal', 'stop', 'naHoofddoel', true),
  flag('seizoensstrook', 'Seizoensstrook tonen', 'doel', 'showSeasonStrip'),
  flag('volgende-tocht', 'Volgende tocht op Vandaag', 'doel', 'showNextTrek'),
  flag('water-per-etappe', 'Water per etappe tonen', 'doel', 'showStageWater'),
  choice('rust-na-tocht', 'Rust na een bergtocht', 'doel', 'trekLegRest', 'soft', 'rustNaTocht', true),
  {
    id: 'bergschoenen', title: 'Bergschoenen inlopen', page: 'doel',
    differs: (s) => bootGoalKm(s.bootBreakInKm) !== bootGoalKm(undefined),
    value: (s) => `${bootGoalKm(s.bootBreakInKm)} km`,
    reset: () => ({ bootBreakInKm: undefined }),
  },
  flag('bergschoenen-herinnering', 'Herinnering bij lange tochten', 'doel', 'bootBreakInReminder'),

  // Forge
  strengthFlag('forge', 'Kracht meerekenen', 'enabled'),
  strengthChoice('forge-volgorde', 'Eerst ophogen', 'progression', 'volgorde'),
  strengthChoice('forge-sets', 'Werksets', 'workSets', 'werksets'),
  strengthChoice('forge-opwarmen', 'Opwarmen', 'warmup', 'opwarmen'),
  strengthChoice('forge-opwarmbereik', 'Opwarmen per', 'warmupScope', 'opwarmbereik'),
  strengthChoice('forge-vermoeidheid', 'Vermoeidheid per set', 'fatigue', 'vermoeidheid'),
  strengthFlag('forge-pauze', 'Na een pauze lichter beginnen', 'lighterAfterBreak'),
  strengthFlag('forge-bereik', 'Bereik verbreden', 'widenRange'),
  strengthChoice('forge-schatting', 'Sets die meetellen', 'estimateUpTo', 'schatting'),
  strengthChoice('forge-leren', 'Gewichten van toestellen', 'stackWeights', 'forgeLeren', ['learnStacks']),
  strengthChoice('forge-dumbbells', 'Dumbbells in je log', 'dumbbellLog', 'dumbbellLog'),
  strengthFlag('forge-rust', 'Rusttimer vanzelf', 'restAuto'),
  strengthChoice('forge-signaal', 'Signaal als de rust om is', 'restAlert', 'restsignaal'),
  strengthChoice('forge-geluid', 'Geluid na de rust', 'restSound', 'rustgeluid'),
  strengthFlag('forge-scherm', 'Scherm aan tijdens je training', 'keepScreenOn'),
  strengthFlag('forge-bijsturen', 'Bijsturen in de training', 'adjustLive'),
  strengthChoice('forge-rir-vooraf', 'RIR vooraf invullen', 'rirPrefill', 'rirVooraf'),
  strengthChoice('forge-doorvoeren', 'Wijzigingen doorvoeren', 'carryMode', 'doorvoeren', ['carryWeights']),
  strengthFlag('forge-schijven', 'Schijven bij de set tonen', 'showPlates'),
  strengthFlag('forge-1rm', 'Geschatte 1RM tonen', 'showOneRm'),
  strengthChoice('forge-weergave', 'Forge toont', 'oneRmView', 'forgeWeergave'),
  strengthFlag('forge-1rm-macrofactor', 'MacroFactor-1RM erbij tonen', 'showMacroFactorOneRm'),
  strengthChoice('forge-vergelijken', 'Vergelijken met', 'compareWeeks', 'forgeVergelijken'),
  strengthFlag('forge-extras', 'Wat er verder veranderde', 'showExtras'),
  strengthFlag('forge-lijntjes', 'Lijntjes in de lijst', 'showTrendLines'),
  strengthChoice('forge-volgorde-lijst', 'Volgorde van de oefeningen', 'listSort', 'forgeVolgorde'),
  strengthFlag('forge-naast', 'ASCEND naast MacroFactor', 'showComparison'),

  // Lichaam
  flag('vetpercentage', 'Vetpercentage tonen', 'lichaam', 'showBodyFat'),
  {
    id: 'figuur', title: 'Figuur', page: 'lichaam',
    differs: (s) => resolveFigureSetting(s) !== 'auto',
    value: (s) => choiceShort('figuur', resolveFigureSetting(s)),
    reset: () => ({ figure: undefined }),
  },
  flag('wat-teken', 'Training wijkt af', 'lichaam', 'influenceSign'),
  choice('wat-oorzaak', 'Mogelijke oorzaak', 'lichaam', 'influenceCause', 'patroon', 'oorzaak'),
  flag('wat-overzicht', 'Op Je stand', 'lichaam', 'influenceOverview'),
  flag('wat-test', 'Test verschuiven', 'lichaam', 'influenceTestMove'),
  flag('wat-namen', 'Voorbeelden bij naam noemen', 'lichaam', 'influenceNames'),
  {
    id: 'intensiteit', title: 'Intensiteit tellen', page: 'lichaam',
    differs: (s) => resolveIntensityCounting(s) !== 'heartrate',
    value: (s) => choiceShort('intensiteit', resolveIntensityCounting(s)),
    reset: () => ({ intensityCounting: undefined }),
  },

  // Vandaag en meldingen
  overviewFlag('ochtendcheck', 'Ochtendcheck', 'morningCheckIn'),
  overviewFlag('ochtendkaart', 'Ochtendkaart', 'morningCard'),
  overviewSpec('ochtend-vanaf', 'Ochtend begint om', 'morningCardFrom', (v: string) => choiceShort('ochtendVanaf', v)),
  flag('zweet-vragen', 'Zweetverlies vragen', 'vandaag', 'askSweat'),
  flag('twijfeltest', 'Twijfeltest eerst vragen', 'planning', 'askDoubtTest'),
  flag('korte-nacht', 'Vragen bij een korte nacht', 'vandaag', 'askShortNight'),
  overviewFlag('weekterugblik', 'Weekterugblik', 'weekReview'),
  overviewSpec('weekterugblik-dag', 'Dag van de terugblik', 'weekReviewDay', (v: string) => choiceShort('terugblikDag', v)),
  choice('lijfvraag', 'Hoe voelt je lijf?', 'vandaag', 'bodyCheck', 'reden', 'lijfvraag'),
  overviewFlag('weekvraag', 'Vraag van de week', 'weeklyQuestion'),
  overviewFlag('weerregel', 'Weer bij je training', 'weatherLine'),
  overviewFlag('beste-moment', 'Beste moment tonen', 'bestMoment'),
  overviewFlag('weerruil', 'Ruilen bij slecht weer', 'weatherSwap'),
  overviewFlag('kledingadvies', 'Kledingadvies', 'clothingAdvice'),
  overviewFlag('citaten', 'Citaat', 'completionMoment'),
  flag('geluid', 'Geluid', 'vandaag', 'introSoundEnabled', { resetTo: true }),
  {
    id: 'beweging', title: 'Beweging', page: 'vandaag',
    differs: (s) => resolveMotion(s) !== 'full',
    value: (s) => choiceShort('beweging', resolveMotion(s)),
    reset: () => ({ motion: undefined }),
  },
  {
    id: 'lucht', title: 'Lucht bovenaan', page: 'vandaag',
    differs: (s) => resolveSky(s).sky !== 'auto',
    value: (s) => choiceShort('lucht', resolveSky(s).sky),
    reset: () => ({ sky: undefined }),
  },
  {
    id: 'lucht-vanaf', title: 'Donker vanaf', page: 'vandaag',
    differs: (s) => resolveSky(s).nightFrom !== 'zon',
    value: (s) => choiceShort('luchtVanaf', resolveSky(s).nightFrom),
    reset: () => ({ skyNightFrom: undefined }),
  },
  insightFlag('loopinzicht', 'Inzicht na een training', 'enabled'),
  insightTopic('loop-efficientie', 'Efficiëntie', 'efficiency'),
  insightTopic('loop-langedagen', 'Lange dagen', 'longDays'),
  insightTopic('loop-berg', 'Bergop en bergaf', 'climbing'),
  insightTopic('loop-vorm', 'Pas en vorm', 'form'),
  insightFlag('loopweer', 'Weer erbij zoeken', 'weather'),
  insightFlag('borstband', 'Hartslag van de borstband', 'chestStrap'),
  {
    id: 'terugknop', title: 'Terugknop op een tab', page: 'vandaag',
    differs: (s) => resolveNavigation(s).tabBack !== 'today',
    value: (s) => choiceShort('terugknop', resolveNavigation(s).tabBack),
    reset: () => ({ tabBack: undefined }),
  },
  {
    id: 'hervatten', title: 'Na een herstart', page: 'vandaag',
    differs: (s) => resolveNavigation(s).resumeMinutes !== resolveNavigation(undefined).resumeMinutes,
    value: (s) => resumeLabel(resolveNavigation(s).resumeMinutes),
    reset: () => ({ resumeMinutes: undefined }),
  },

  // Koppelingen
  flag('horloge-gedaan-weghalen', 'Gedane trainingen weghalen', 'koppelingen', 'watchRemoveDone'),
  {
    id: 'horloge-status', title: 'Status van het versturen', page: 'koppelingen',
    differs: (s) => s.showWatchStatus === false || s.showWatchStatusOnWeek === false,
    value: (s) => onOff(s.showWatchStatus !== false && s.showWatchStatusOnWeek !== false),
    reset: () => ({ showWatchStatus: undefined, showWatchStatusOnWeek: undefined }),
  },
  choice('horloge-voorvoegsel', 'Voorvoegsel voor de naam', 'koppelingen', 'watchNamePrefix', 'short', 'voorvoegsel'),
  {
    id: 'horloge-hartslag', title: 'Hartslag op je horloge', page: 'koppelingen',
    differs: (s) => resolveWatchHrMode({ mode: s.watchHeartRate }) !== 'ascend',
    value: (s) => choiceShort('hartslagHorloge', resolveWatchHrMode({ mode: s.watchHeartRate })),
    reset: () => ({ watchHeartRate: undefined }),
  },
  {
    id: 'horloge-rustige-loop', title: 'Rustige loop: ruime grens', page: 'koppelingen',
    differs: (s) => !resolveCalmRun({ calmRun: s.watchCalmRun }),
    value: (s) => onOff(resolveCalmRun({ calmRun: s.watchCalmRun })),
    reset: () => ({ watchCalmRun: undefined }),
  },
  flag('macrofactor-gewicht', 'Gewicht gebruiken', 'koppelingen', 'weightFromMacroFactor'),
  flag('strava-tekst', 'Tekst voor Strava', 'koppelingen', 'stravaText'),
];

// ---- de functies -------------------------------------------------------------------------

export function resetPatchOf(spec: AdviceSpec, s: AppSettings): Partial<AppSettings> {
  return spec.reset(s);
}

// De waarde van het advies, in dezelfde woorden als de waarde van nu.
function adviceText(spec: AdviceSpec, s: AppSettings): string {
  return spec.value({ ...s, ...resetPatchOf(spec, s) });
}

// Alles wat anders staat dan het advies, in de volgorde van de lijst.
export function adviceDifferences(s: AppSettings): AdviceDifference[] {
  return ADVICE_SPECS.filter((spec) => spec.differs(s)).map((spec) => ({
    id: spec.id,
    title: spec.title,
    page: spec.page,
    value: spec.value(s),
    advice: adviceText(spec, s),
    plan: spec.plan === true,
  }));
}

// Hoeveel van deze instellingen staan anders (voor de samenvatting van een blad).
export const countDifferences = (ids: string[], s: AppSettings): number => ADVICE_SPECS.filter((spec) => ids.includes(spec.id) && spec.differs(s)).length;

// De wijziging die de gevraagde instellingen terugzet, gesplitst: wat meteen kan (`now`)
// en wat de planning raakt (`plan`, eerst een voorstel). Alleen wat nu echt afwijkt gaat mee.
export function resetPatch(s: AppSettings, ids: string[]): { now: Partial<AppSettings>; plan: Partial<AppSettings>; planTitles: string[] } {
  let nowState = s;
  let planState = s;
  const now: Partial<AppSettings> = {};
  const plan: Partial<AppSettings> = {};
  const planTitles: string[] = [];
  for (const spec of ADVICE_SPECS) {
    if (!ids.includes(spec.id) || !spec.differs(s)) continue;
    if (spec.plan) {
      const patch = resetPatchOf(spec, planState);
      Object.assign(plan, patch);
      planState = { ...planState, ...patch };
      planTitles.push(spec.title);
    } else {
      const patch = resetPatchOf(spec, nowState);
      Object.assign(now, patch);
      nowState = { ...nowState, ...patch };
    }
  }
  return { now, plan, planTitles };
}

// Alle verschillen van één groep (voor "Alles in deze groep terug naar het advies").
export const differenceIdsOnPage = (s: AppSettings, page: SettingsPageId): string[] => adviceDifferences(s).filter((d) => d.page === page).map((d) => d.id);
