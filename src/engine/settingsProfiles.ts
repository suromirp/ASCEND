// ASCEND: profielen die meerdere bestaande schakelaars in een keer zetten
// (docs/beslissingen/2026-10-26-instellingen-opruimen.md, soort B). Een profiel is geen
// opslagveld: de losse waarden blijven staan waar ze stonden, en het profiel wordt er steeds
// uit afgelezen. Past de combinatie bij geen enkel profiel, dan heet ze "Aangepast".

import type { AppSettings } from '../storage/database';
import { resolveOverviews, type OverviewSettings } from './overviewSettings';

export type TodayProfile = 'alles' | 'belangrijkst' | 'training' | 'aangepast';
export type TodayProfileChoice = Exclude<TodayProfile, 'aangepast'>;

// De zeven schakelaars die een profiel vastlegt. De missiekaart zelf is geen schakelaar: die
// staat altijd op Vandaag. Wat onder de ochtendcheck of het weer hangt (korte nacht, beste
// moment, kleding) blijft zoals je het zette.
export interface TodayCardValues {
  morningCheckIn: boolean;
  morningCard: boolean;
  weatherLine: boolean;
  weekReview: boolean;
  weeklyQuestion: boolean;
  completionMoment: boolean;
  introSoundEnabled: boolean;
}

const KEYS: (keyof TodayCardValues)[] = ['morningCheckIn', 'morningCard', 'weatherLine', 'weekReview', 'weeklyQuestion', 'completionMoment', 'introSoundEnabled'];

const PROFILES: Record<TodayProfileChoice, TodayCardValues> = {
  alles: { morningCheckIn: true, morningCard: true, weatherLine: true, weekReview: true, weeklyQuestion: true, completionMoment: true, introSoundEnabled: true },
  belangrijkst: { morningCheckIn: true, morningCard: false, weatherLine: true, weekReview: false, weeklyQuestion: false, completionMoment: false, introSoundEnabled: false },
  training: { morningCheckIn: false, morningCard: false, weatherLine: false, weekReview: false, weeklyQuestion: false, completionMoment: false, introSoundEnabled: false },
};

export const TODAY_PROFILE_ORDER: TodayProfileChoice[] = ['alles', 'belangrijkst', 'training'];

export const TODAY_PROFILE_LABEL: Record<TodayProfile, string> = {
  alles: 'Alles laten zien',
  belangrijkst: 'Alleen het belangrijkste',
  training: 'Alleen mijn training',
  aangepast: 'Aangepast',
};

export const TODAY_PROFILE_NOTE: Record<TodayProfileChoice, string> = {
  alles: 'Alle kaarten, zoals het advies.',
  belangrijkst: 'Je training, de ochtendcheck en het weer.',
  training: 'Alleen je training van vandaag.',
};

type ProfileInput = Pick<AppSettings, 'overviews' | 'introSoundEnabled'>;

// De losse waarden van dit moment, met de standaard waar een waarde ontbreekt.
export function todayCardValues(settings: Partial<ProfileInput>): TodayCardValues {
  const o = resolveOverviews(settings.overviews);
  return {
    morningCheckIn: o.morningCheckIn,
    morningCard: o.morningCard,
    weatherLine: o.weatherLine,
    weekReview: o.weekReview,
    weeklyQuestion: o.weeklyQuestion,
    completionMoment: o.completionMoment,
    introSoundEnabled: settings.introSoundEnabled !== false,
  };
}

export function matchTodayProfile(settings: Partial<ProfileInput>): TodayProfile {
  const now = todayCardValues(settings);
  const hit = TODAY_PROFILE_ORDER.find((p) => KEYS.every((k) => PROFILES[p][k] === now[k]));
  return hit ?? 'aangepast';
}

// De waarden die een profiel zet. "Aangepast" is geen keuze maar een uitkomst, dus niet hier.
export function todayProfileValues(profile: TodayProfileChoice): TodayCardValues {
  return { ...PROFILES[profile] };
}

// De wijziging voor updateSettings: alleen de zeven sleutels, de rest van de overzichten
// (dag van de terugblik, ochtend begint om, beste moment, kleding) blijft staan.
export function todayProfilePatch(profile: TodayProfileChoice, settings: Partial<Pick<AppSettings, 'overviews'>>): ProfileInput {
  const v = todayProfileValues(profile);
  const overviews: OverviewSettings = {
    ...settings.overviews,
    morningCheckIn: v.morningCheckIn,
    morningCard: v.morningCard,
    weatherLine: v.weatherLine,
    weekReview: v.weekReview,
    weeklyQuestion: v.weeklyQuestion,
    completionMoment: v.completionMoment,
  };
  return { overviews, introSoundEnabled: v.introSoundEnabled };
}
