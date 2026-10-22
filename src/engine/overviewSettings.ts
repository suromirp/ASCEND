// ASCEND: wat je zelf aan of uit zet bij "Overzichten en vragen" (Meer).
//
// Besluit: docs/beslissingen/2026-10-22-alles-instelbaar.md. Elke waarde is
// optioneel; ontbreekt hij, dan geldt het gedrag dat de app altijd had. Zo
// merkt niemand iets tot hij het zelf verandert, en importeren oude back-ups
// zonder migratiestap. Of een onderdeel getoond wordt, beslist alleen deze
// module; de componenten vragen het aan.
//
// Het horlogegedeelte van de ochtendcheck staat NIET hier: dat is al
// instelbaar met de schakelaars van storage/externalActivities.ts (watch use).

import type { SessionLog } from '../models/training';
import { recentPainSpot } from './wellbeing';
import { reviewWeekFor } from './weekReview';

export type ReviewDay = 'both' | 'sunday' | 'monday';

export interface OverviewSettings {
  // Weekterugblik op Vandaag, en op welke dag(en) hij verschijnt.
  weekReview?: boolean;
  weekReviewDay?: ReviewDay;
  // De vraag van de week in "Je dag".
  weeklyQuestion?: boolean;
  // De ochtendcheck in "Je dag".
  morningCheckIn?: boolean;
  // De weerregel bij een training.
  weatherLine?: boolean;
  // Ruilvoorstellen bij slecht weer (regel WEATHER-SWAP).
  weatherSwap?: boolean;
  // Het kledingadvies bij het weer (engine/clothing.ts).
  clothingAdvice?: boolean;
  // Het citaat op het scherm na een training (het scherm zelf blijft).
  completionMoment?: boolean;
}

export type ResolvedOverviews = Required<OverviewSettings>;

export const DEFAULT_OVERVIEWS: ResolvedOverviews = {
  weekReview: true,
  weekReviewDay: 'both',
  weeklyQuestion: true,
  morningCheckIn: true,
  weatherLine: true,
  weatherSwap: true,
  clothingAdvice: true,
  completionMoment: true,
};

const REVIEW_DAYS: ReviewDay[] = ['both', 'sunday', 'monday'];

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveOverviews(raw: OverviewSettings | undefined | null): ResolvedOverviews {
  const r = (raw ?? {}) as Record<string, unknown>;
  const flag = (key: keyof ResolvedOverviews): boolean => (typeof r[key] === 'boolean' ? (r[key] as boolean) : (DEFAULT_OVERVIEWS[key] as boolean));
  const day = REVIEW_DAYS.find((d) => d === r.weekReviewDay) ?? DEFAULT_OVERVIEWS.weekReviewDay;
  return {
    weekReview: flag('weekReview'),
    weekReviewDay: day,
    weeklyQuestion: flag('weeklyQuestion'),
    morningCheckIn: flag('morningCheckIn'),
    weatherLine: flag('weatherLine'),
    weatherSwap: flag('weatherSwap'),
    clothingAdvice: flag('clothingAdvice'),
    completionMoment: flag('completionMoment'),
  };
}

// Welke week de terugblik op Vandaag beschrijft, of geen. Zondag gaat over de
// lopende week, maandag over de week die net voorbij is (weekReview.ts).
export function reviewWeekToShow(today: string, isoWeekday: number, raw: OverviewSettings | undefined): string | undefined {
  const s = resolveOverviews(raw);
  if (!s.weekReview) return undefined;
  if (s.weekReviewDay === 'sunday' && isoWeekday !== 7) return undefined;
  if (s.weekReviewDay === 'monday' && isoWeekday !== 1) return undefined;
  return reviewWeekFor(today, isoWeekday);
}

export const showWeeklyQuestion = (raw: OverviewSettings | undefined) => resolveOverviews(raw).weeklyQuestion;
export const showMorningCheckIn = (raw: OverviewSettings | undefined) => resolveOverviews(raw).morningCheckIn;
// De ochtendcheck is ook de plek waar een pijnplek van de laatste 14 dagen
// wordt opgevolgd (recentPainSpot, spotWorse). Dat blijft dus gebeuren, ook als
// je de check zelf uitzet: veiligheid gaat voor een opgeruimd scherm. Maar dan
// alleen die ene vraag over de pijnplek, niet de hele check (benen, energie,
// slaap) die je net hebt uitgezet.
export type MorningCheckInMode = 'full' | 'pain_only' | 'none';

export function morningCheckInMode(raw: OverviewSettings | undefined, today: string, logs: SessionLog[]): MorningCheckInMode {
  if (resolveOverviews(raw).morningCheckIn) return 'full';
  return recentPainSpot(today, logs) !== undefined ? 'pain_only' : 'none';
}

export function showMorningCheckInCard(raw: OverviewSettings | undefined, today: string, logs: SessionLog[]): boolean {
  return morningCheckInMode(raw, today, logs) !== 'none';
}

// Het weer hoeft alleen opgehaald te worden als iets het gebruikt: de weerregel,
// de ruilvoorstellen of het kledingadvies. Staan alle drie uit, dan gaat er niets naar de weerdienst.
export const needsWeather = (raw: OverviewSettings | undefined): boolean => {
  const r = resolveOverviews(raw);
  return r.weatherLine || r.weatherSwap || r.clothingAdvice;
};

export const showWeatherLine = (raw: OverviewSettings | undefined) => resolveOverviews(raw).weatherLine;
export const showClothingAdvice = (raw: OverviewSettings | undefined) => resolveOverviews(raw).clothingAdvice;
export const showWeatherSwap = (raw: OverviewSettings | undefined) => resolveOverviews(raw).weatherSwap;
// Het scherm na een training blijft altijd (feiten, coachregel, doel, week en
// benen). De schakelaar bepaalt alleen of het citaat erbij staat. Een behaalde
// mijlpaal krijgt het citaat altijd.
export const showCompletionQuote = (raw: OverviewSettings | undefined, isMilestone = false) => isMilestone || resolveOverviews(raw).completionMoment;
