// ASCEND: profielen die meerdere bestaande schakelaars in een keer zetten
// (docs/beslissingen/2026-10-26-instellingen-opruimen.md, soort B). Een profiel is geen
// opslagveld: de losse waarden blijven staan waar ze stonden, en het profiel wordt er steeds
// uit afgelezen. Past de combinatie bij geen enkel profiel, dan heet ze "Aangepast".

import type { AppSettings } from '../storage/database';
import { resolveBodyCheck, type BodyCheckMode } from './bodyCheckSettings';
import { resolveOverviews, type OverviewSettings } from './overviewSettings';

export type TodayProfile = 'alles' | 'belangrijkst' | 'training' | 'aangepast';
export type TodayProfileChoice = Exclude<TodayProfile, 'aangepast'>;

// De zeven keuzes die een profiel vastlegt. De missiekaart zelf is geen schakelaar: die
// staat altijd op Vandaag. Wat onder de ochtendcheck of het weer hangt (korte nacht, beste
// moment, kleding) blijft zoals je het zette. De vraag van de week hoort er niet bij: die staat
// standaard uit en een profiel zet hem niet aan of uit (docs/beslissingen/2026-11-12-je-dag.md).
export interface TodayCardValues {
  morningCheckIn: boolean;
  morningCard: boolean;
  weatherLine: boolean;
  weekReview: boolean;
  completionMoment: boolean;
  introSoundEnabled: boolean;
  // "Hoe voelt je lijf?": reden (het advies) of uit.
  bodyCheck: BodyCheckMode;
}

const KEYS: (keyof TodayCardValues)[] = ['morningCheckIn', 'morningCard', 'weatherLine', 'weekReview', 'completionMoment', 'introSoundEnabled', 'bodyCheck'];

const PROFILES: Record<TodayProfileChoice, TodayCardValues> = {
  alles: { morningCheckIn: true, morningCard: true, weatherLine: true, weekReview: true, completionMoment: true, introSoundEnabled: true, bodyCheck: 'reden' },
  belangrijkst: { morningCheckIn: true, morningCard: false, weatherLine: true, weekReview: false, completionMoment: false, introSoundEnabled: false, bodyCheck: 'reden' },
  training: { morningCheckIn: false, morningCard: false, weatherLine: false, weekReview: false, completionMoment: false, introSoundEnabled: false, bodyCheck: 'uit' },
};

export const TODAY_PROFILE_ORDER: TodayProfileChoice[] = ['alles', 'belangrijkst', 'training'];

// De naam zoals een rij of een groep hem toont, kort genoeg voor naast de titel.
export const TODAY_PROFILE_SHORT: Record<TodayProfile, string> = {
  alles: 'Alles',
  belangrijkst: 'Het belangrijkste',
  training: 'Alleen je training',
  aangepast: 'Eigen keuze',
};

type ProfileInput = Pick<AppSettings, 'overviews' | 'introSoundEnabled' | 'bodyCheck'>;

// De losse waarden van dit moment, met de standaard waar een waarde ontbreekt.
function todayCardValues(settings: Partial<ProfileInput>): TodayCardValues {
  const o = resolveOverviews(settings.overviews);
  return {
    morningCheckIn: o.morningCheckIn,
    morningCard: o.morningCard,
    weatherLine: o.weatherLine,
    weekReview: o.weekReview,
    completionMoment: o.completionMoment,
    introSoundEnabled: settings.introSoundEnabled !== false,
    bodyCheck: resolveBodyCheck(settings),
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
    completionMoment: v.completionMoment,
  };
  return { overviews, introSoundEnabled: v.introSoundEnabled, bodyCheck: v.bodyCheck };
}
