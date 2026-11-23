// ASCEND: de beginnersstart zonder doel (docs/visie/Zonder doel.md, 2.7 en 3.4). Wie de acht weken
// voor zijn richting gemiddeld minder dan twee keer per week sportte, of het zelf zegt, begint
// rustig: de eerste vier weken geen harde training. Het loopt vanzelf af, want het is afgeleid uit
// de startmaandag van je richting en je logs, nooit als vlag opgeslagen.
//
// Het ontwerp noemt twee weken alleen rustig en de eerste pittige training na vier weken. Omdat de
// enige harde training in een week zonder doel de heuvelloop is, valt dat samen: vier weken zonder
// heuvelloop, die is dan een herstelloop (engine/programLayout.ts, fase "Rustig beginnen").
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { BEGINNER_LADDER, REFERENCE_SETS, type WalkJog } from '../data/beginnerLadder';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';

export type BeginnerStartChoice = 'auto' | 'ja' | 'nee';
const BEGINNER_START_CHOICES: BeginnerStartChoice[] = ['auto', 'ja', 'nee'];

// Vier weken zonder harde training (expert).
export const BEGINNER_WEEKS = 4;
// Gemeten over acht weken voor de start: minder dan twee keer per week is een beginnersstart (afgeleid).
const LOOKBACK_WEEKS = 8;
const MIN_PER_WEEK = 2;

export function parseBeginnerStart(raw: unknown): BeginnerStartChoice {
  return BEGINNER_START_CHOICES.find((c) => c === raw) ?? 'auto';
}

// Geldt de beginnersstart voor een richting die op `start` begon?
export function isBeginnerStart(choice: unknown, logs: readonly SessionLog[], start: string | undefined): boolean {
  if (!start) return false;
  const c = parseBeginnerStart(choice);
  if (c !== 'auto') return c === 'ja';
  const first = mondayOfWeek(start);
  const from = addDays(first, -7 * LOOKBACK_WEEKS);
  const trained = new Set(
    logs
      .filter((l) => l.type !== 'recovery' && l.completedDate >= from && l.completedDate < first)
      .map((l) => `${l.completedDate}|${l.templateId}`),
  ).size;
  return trained / LOOKBACK_WEEKS < MIN_PER_WEEK;
}

// Opbouw van de start (AppSettings.beginnerBuild): heel licht (wandelen en dribbelen, het advies) of gewoon.
// Zonder keuze gewoon: een start die al liep verandert alleen na Akkoord (docs/visie/Ontwerp beginner heel licht.md,
// deel 5). Het eerste voorstel en het kiezen van een richting zetten heel licht in hun eigen Akkoord.
export type BeginnerBuild = 'licht' | 'gewoon';
export const BEGINNER_BUILD_ADVICE: BeginnerBuild = 'licht';
export function resolveBeginnerBuild(raw: unknown): BeginnerBuild {
  return raw === 'licht' ? 'licht' : 'gewoon';
}

// Hoe de planning de start bouwt (engine/beginnerPlan.ts, register engine/substitutions.ts#setStartBuild):
// 'ladder' is heel licht met de ladder (duur en sets per week, data/beginnerLadder.ts), 'licht' is heel licht van voor
// de ladder (wandelen en dribbelen 20 en 30 minuten, kracht zoals gepland), 'gewoon' de lopen van je richting. Heel
// licht krijgt de ladder alleen met jouw Akkoord daarop (AppSettings.beginnerLadder): een start die al op heel licht
// liep, kreeg Akkoord op een tekst zonder kortere kracht en blijft zoals hij is tot het voorstel op Vandaag
// (engine/beginnerLadderOffer.ts).
export type StartBuild = 'ladder' | 'licht' | 'gewoon';
export function resolveStartBuild(settings: { beginnerBuild?: unknown; beginnerLadder?: unknown }): StartBuild {
  if (resolveBeginnerBuild(settings.beginnerBuild) !== 'licht') return 'gewoon';
  return settings.beginnerLadder === 'agreed' ? 'ladder' : 'licht';
}

// Het Akkoord op heel licht met de ladder, zoals het in de instellingen komt.
export const LADDER_CONSENT = { beginnerBuild: 'licht', beginnerLadder: 'agreed' } as const;

// De instelling Opbouw van de start: Heel licht is met de ladder, Gewoon zonder. Een keuze is een voorstel als hij iets
// verandert, ook heel licht kiezen als je daar al stond zonder Akkoord op de ladder.
export function startBuildPatch(choice: BeginnerBuild): { beginnerBuild: BeginnerBuild; beginnerLadder?: 'agreed' } {
  return choice === 'licht' ? { ...LADDER_CONSENT } : { beginnerBuild: 'gewoon' };
}
export function startBuildChanges(settings: { beginnerBuild?: unknown; beginnerLadder?: unknown }, choice: BeginnerBuild): boolean {
  if (choice !== settings.beginnerBuild) return true;
  return choice === 'licht' && settings.beginnerLadder !== 'agreed';
}

// Een richting kiezen is een voorstel met Akkoord dat de start al laat zien: zonder eerdere keuze hoort heel licht
// (het advies) met de ladder erbij. Een keuze die je al maakte blijft.
export function buildConsentPatch(settings: { beginnerBuild?: unknown }): { beginnerBuild?: BeginnerBuild; beginnerLadder?: 'agreed' } {
  return settings.beginnerBuild === undefined ? { ...LADDER_CONSENT } : {};
}

// De zin voor het voorstel bij heel licht: wat er in de start op de plek van je lopen staat.
export const WALK_JOG_LINE = 'In die weken wandel en dribbel je om de beurt, op de plek van de rustige en de lange duurloop.';

// De start beslaat hele golven: bij golven van drie of zes weken zijn het er zes.
export function beginnerWeeksFor(waveLength: number): number {
  return Math.ceil(BEGINNER_WEEKS / waveLength) * waveLength;
}

const WEEKS_WORD: Record<number, string> = { 4: 'vier', 6: 'zes' };

// De zin voor het voorstel, zolang de beginnersstart loopt.

export function beginnerStartLine(start: string, today: string, waveLength = BEGINNER_WEEKS): string | undefined {
  const weeks = beginnerWeeksFor(waveLength);
  const since = Math.floor(daysBetween(mondayOfWeek(start), mondayOfWeek(today)) / 7);
  if (since < 0 || since >= weeks) return undefined;
  return `Je begint rustig: de eerste ${WEEKS_WORD[weeks] ?? weeks} weken alleen makkelijk, de eerste pittige training pas daarna. Zo went je lichaam eerst aan het ritme.`;
}

// --- heel licht: de ladder per week (docs/visie/Ontwerp beginner heel licht.md, deel 1) -------------

export interface BeginnerWeekPlan {
  // Week van de start, vanaf 1.
  week: number;
  strengthMinutes: number;
  // Werksets voor een krachttraining met `fullSets` sets in het gewone plan.
  strengthSets: number;
  // De kortere en de langere sessie wandelen en dribbelen.
  shortMinutes: number;
  longMinutes: number;
  // Minuten dribbelen en wandelen om de beurt; null is gewoon lopen.
  walkJog: WalkJog | null;
}

// De week van de start waarin `date` valt, vanaf 1; voor de start 0 of minder.
export function beginnerWeekNumber(start: string, date: string): number {
  return Math.floor(daysBetween(mondayOfWeek(start), mondayOfWeek(date)) / 7) + 1;
}

// Wat week `week` van de beginnersstart vraagt (data/beginnerLadder.ts), of niets: voor de start en
// na de ladder geldt het gewone plan (zonder harde training zolang de start loopt, beginnerWeeksFor).
// `fullSets`: de werksets van de krachttraining in het gewone plan; die krijgt hetzelfde deel als
// Bovenlichaam A, in week 1 nooit meer dan de helft en nooit meer dan het gewone plan.
// De planning leest dit via engine/beginnerPlan.ts, alleen bij heel licht met de ladder.
export function beginnerWeek(week: number, fullSets = REFERENCE_SETS): BeginnerWeekPlan | undefined {
  const rung = Number.isInteger(week) ? BEGINNER_LADDER[week - 1] : undefined;
  if (!rung) return undefined;
  const full = Math.max(0, Math.floor(fullSets));
  const share = Math.round((full * rung.strengthSets.value) / REFERENCE_SETS);
  const strengthSets = Math.min(full, week === 1 ? Math.floor(full / 2) : full, Math.max(full > 0 ? 1 : 0, share));
  return {
    week,
    strengthMinutes: rung.strengthMinutes.value,
    strengthSets,
    shortMinutes: rung.shortMinutes.value,
    longMinutes: rung.longMinutes.value,
    walkJog: rung.walkJog.value ? { ...rung.walkJog.value } : null,
  };
}
