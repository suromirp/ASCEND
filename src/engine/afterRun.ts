// ASCEND: Hoe ging het? na een training die je horloge afvinkte (spoor 6 van
// docs/visie/Ontwerp trainingsscherm minimaal.md, besluit docs/beslissingen/2026-11-14-hoe-ging-het-horloge.md).
//
// Geen eigen kaart meer op Vandaag: een rij bovenaan Je dag ("Lange duurloop is afgevinkt", eronder
// "Hoe ging het?") opent het blad Hoe ging het?, met dezelfde vragen in dezelfde volgorde als zelf invullen
// (regel 7): Beter, Normaal of Slechter; pijn Nee of Ja; zwaarte. Wat het horloge al weet staat als één regel
// feiten bovenaan en wordt niet gevraagd.
//
// Pure: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import { pendingQuestions, type AutoLogged, type AutoQuestion } from './autoTick';
import { formatNumberNL } from '../utils/number';

// De instelling "Vragen na je loop". Kort: gevoel, pijn en zwaarte, de rest achter Meer. Alles: alles in één stap.
export type AfterRunQuestions = 'short' | 'all';
export const AFTER_RUN_QUESTIONS_DEFAULT: AfterRunQuestions = 'short';

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveAfterRunQuestions(raw: unknown): AfterRunQuestions {
  return raw === 'all' || raw === 'short' ? raw : AFTER_RUN_QUESTIONS_DEFAULT;
}

// Wat het blad vraagt of aanbiedt. `sweat`: je gewicht na (zweetverlies), `trim`: inkorten, `strava`: de tekst voor Strava.
export type AfterRunField = 'feel' | 'pain' | 'rpe' | 'sweat' | 'trim' | 'strava';

// De zwaarte blijft in Kort staan (besluit 2026-11-12-trainingsscherm-en-ontwerpregels.md, vraag 2): zonder
// zwaarte rekent Je stand de belasting met de zwaarte van het plan (engine/standing.ts#weeklyLoad, "schatting"),
// dus een rustige loop die zwaar voelde telt dan als rustig. De waarde van het horloge staat vooraf ingevuld.
const FIRST: readonly AfterRunField[] = ['feel', 'pain', 'rpe'];
const MORE: readonly AfterRunField[] = ['sweat', 'trim', 'strava'];

// Welke velden in stap 1 staan en welke achter de rij Meer. Bij Alles is er geen Meer.
export function afterRunSteps(mode: AfterRunQuestions): { first: AfterRunField[]; more: AfterRunField[] } {
  return mode === 'all' ? { first: [...FIRST, ...MORE], more: [] } : { first: [...FIRST], more: [...MORE] };
}

// Alleen wat er voor dit log echt is: de weging als je die vraagt, inkorten bij een activiteit die je kunt
// inkorten, de tekst voor Strava als die aan staat. Zo belooft de rij Meer niets wat er niet staat.
export type AfterRunHas = Record<AfterRunField, boolean>;
export function availableFields(fields: readonly AfterRunField[], has: AfterRunHas): AfterRunField[] {
  return fields.filter((f) => has[f]);
}

// Wat er voor deze training te vragen valt, zoals bij zelf invullen: een rustdag heeft geen gevoel, pijn of zwaarte
// (HowDidItGoSheet: "Er valt niets in te vullen"); de pijnvraag alleen bij lopen, wandelen, fietsen en zware beenkracht
// (`pain`, uit logForm/formRules.ts#asksPain).
export function afterRunHas(input: { templateType: string | undefined; pain: boolean; sweat: boolean; trim: boolean; strava: boolean }): AfterRunHas {
  const rest = input.templateType === 'recovery';
  return { feel: !rest, pain: !rest && input.pain, rpe: !rest, sweat: input.sweat, trim: input.trim, strava: input.strava };
}

const MORE_WORD: Partial<Record<AfterRunField, string>> = { sweat: 'gewicht na', trim: 'inkorten', strava: 'tekst voor Strava' };

// De regel onder de rij Meer: "Gewicht na, inkorten, tekst voor Strava", met alleen wat er is.
export function afterRunMoreLine(fields: readonly AfterRunField[]): string {
  const line = fields.map((f) => MORE_WORD[f]).filter(Boolean).join(', ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

// De titel van de rij in Je dag en van het blad.
export function afterRunTitle(templateName: string | undefined): string {
  return templateName ? `${templateName} is afgevinkt` : 'Training afgevinkt';
}

// "76 min, 11,4 km, +310 m, vandaag": wat het log van je horloge al weet, op één regel. Een log bewaart hele
// minuten; de afstand op een decimaal, de stijging op hele meters (onder 1 m niet).
export function afterRunFacts(log: Pick<SessionLog, 'durationMinutes' | 'cardioData' | 'outdoorData' | 'completedDate'>, dayLabel: (iso: string) => string): string {
  const metric = log.cardioData ?? log.outdoorData;
  const parts = [`${Math.round(log.durationMinutes)} min`];
  if (metric?.distanceKm) parts.push(`${formatNumberNL(metric.distanceKm, 1)} km`);
  if (metric?.elevationGainM && metric.elevationGainM >= 1) parts.push(`+${formatNumberNL(metric.elevationGainM, 0)} m`);
  parts.push(dayLabel(log.completedDate));
  return parts.join(', ');
}

// Opslaan of Klaar: zonder antwoord en zonder weging heet de knop Klaar (de vraag is dan af, er komt niets bij).
export function afterRunSaveLabel(answered: boolean): 'Opslaan' | 'Klaar' {
  return answered ? 'Opslaan' : 'Klaar';
}

// De training die de rij Hoe ging het? al noemt staat niet nog eens als gedane training in Je dag (regel 1:
// elk feit één keer). Alleen de geplande training van het log valt weg; een tweede training blijft.
export function withoutAskedTraining<T extends { id: string }>(sessions: T[], askedPlannedId: string | undefined): T[] {
  return askedPlannedId ? sessions.filter((s) => s.id !== askedPlannedId) : sessions;
}

// De vraag die de rij nu stelt: de nieuwste open vraag (autoTick.ts#pendingQuestions). Zonder koppeling of met
// trainingen van je horloge uitgezet is er geen vraag en dus geen rij. Alles is lokaal: offline staat hij er ook.
export function openAfterRunQuestion(state: { use: { activities: boolean }; autoLogged: AutoLogged[] } | null | undefined, logs: SessionLog[], now: Date = new Date()): AutoQuestion | undefined {
  if (!state?.use.activities) return undefined;
  return pendingQuestions(state.autoLogged, logs, now)[0];
}

// De grens in tijd voor Opslaan en Klopt niet (dezelfde als bij zelf invullen, logForm/howDidItGo.ts).
export const AFTER_RUN_LIMIT_MS = 10_000;

// Eén poging met een grens in tijd: na `limitMs` meldt `onSlow` dat het lang duurt, de uitkomst is die van de
// actie zelf. Een fout (opslag weigert) is nee: het blad blijft open met je antwoord.
export async function attemptWithin(action: () => Promise<void>, onSlow: () => void, limitMs = AFTER_RUN_LIMIT_MS): Promise<boolean> {
  const timer = setTimeout(onSlow, limitMs);
  try {
    await action();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// De vaste zinnen van het blad. De uitleg staat achter de i.
export const AFTER_RUN_TEXT = {
  row: 'Hoe ging het?',
  more: 'Meer',
  reject: 'Klopt niet',
  later: 'Niet nu',
  trim: 'Inkorten',
  watchRpe: 'Zo stond het op je horloge.',
  info: [
    'Dit deed ASCEND zelf: je horloge had precies één activiteit die bij de geplande training van die dag paste.',
    'Klopt niet haalt de afvinking weer weg. Dan kies je zelf bij welke training dit hoort.',
  ],
  slow: 'Opslaan duurt lang. Je antwoord blijft staan.',
  failed: 'Opslaan lukte niet. Je antwoord blijft staan; probeer het opnieuw.',
  rejectFailed: 'Weghalen lukte niet. Probeer het opnieuw.',
} as const;
