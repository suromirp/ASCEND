// ASCEND: je eigen zweetverlies bij één training (engine/sweat.ts).
//
// Een eigen lijst naast de logs (AppSettings.sweatEntries), niet op de log zelf:
// een SessionLog wordt nooit herschreven. Eén meting per log. Een gewogen meting
// ('weighed') gaat altijd voor een schatting van het horloge ('watch').

export type SweatActivity = 'run' | 'walk';

export interface SweatEntry {
  id: string;
  // De training waar de meting bij hoort, en haar datum.
  logId: string;
  date: string;
  activity: SweatActivity;
  // Zo lang als de training duurde, toen je hem invulde (minuten).
  durationMinutes: number;
  // Je gewicht voor en na, in kilo, zonder kleren en na het plassen.
  weightBeforeKg?: number;
  weightAfterKg?: number;
  // Wat je onderweg dronk en plaste, in milliliter. Plassen tijdens de training
  // haal je van het verlies af: dat gewicht ging niet door zweet weg.
  drankMl?: number;
  peeMl?: number;
  // De schatting van het horloge in milliliter, zelf overgenomen. Er is geen veld
  // bij intervals.icu waaruit ASCEND dit kan lezen.
  watchMl?: number;
  // De temperatuur tijdens de training in graden, uit het weer bij de log of
  // door jou ingevuld.
  tempC?: number;
  updatedAt: string;
}

// Je gewicht van vóór een training, bewaard tot de log van die dag er is
// (AppSettings.sweatPre, engine/sweatMoments.ts). Eén per dag. Zodra er een meting
// (SweatEntry) voor die training is, is dit voorgewicht overgenomen en telt het niet meer.
export interface SweatPre {
  date: string;
  weightKg: number;
  updatedAt: string;
}
