// "Wat speelde er": what you noted yourself about a day or a training, such as
// alcohol, wiet, a short night or stress (docs/beslissingen/2026-10-25-wat-speelde-er.md,
// research in docs/onderzoek/Alcohol en herstel.md and Cannabis en training.md).
//
// It is your own note next to the history, like the night judgments: a SessionLog
// is never changed by it, and the numbers of the watch stay as they are. Kept with
// the settings (AppSettings.influences), so it travels in a backup; read
// defensively on import (storage/migrations.ts#migrateInfluences).
//
// Where it is noted is part of its meaning, so there is no extra question:
// - on a training (`logId` set, `date` the day of the training): alcohol was the
//   evening before, wiet the hours before the training, so the morning it may show
//   in is `date` itself;
// - on a day in the Logboek calendar (no `logId`): it happened on `date`, so the
//   morning it may show in is the day after.
// engine/influence.ts#affectedMorning is the one place that turns this into a date.

export type InfluenceReason =
  | 'alcohol'
  | 'wiet'
  | 'ziek'
  | 'kort_geslapen'
  | 'laat_gegeten'
  | 'cafeine'
  | 'stress'
  // Only from a suggestion of what ASCEND already knows (the weather, the logbook):
  // confirmed with a tap, never offered as a chip of their own.
  | 'warm'
  | 'zware_beendag'
  | 'anders';

// Alcohol in three steps, the bands of the research: 1 à 2, 3 tot 5, 6 of meer glasses.
export type AlcoholAmount = 'weinig' | 'matig' | 'veel';

export interface InfluenceReasonNote {
  reason: InfluenceReason;
  // Only with alcohol; absent until you chose the amount.
  amount?: AlcoholAmount;
  // Only with 'anders': your own word, at most 40 characters.
  label?: string;
}

export interface InfluenceEntry {
  id: string;
  date: string; // ISO date, see above
  logId?: string; // the SessionLog it was noted on
  reasons: InfluenceReasonNote[];
  // "Niet meetellen voor hartslag" on a training, "Deze nacht niet meetellen" on a day.
  // Separate from the reasons: a reason may stand with the switch off, and the switch
  // may be on without a reason. Off when absent.
  excludeHeartRate?: boolean;
  // The sheet of a training with the sign was opened: the sign turns dim.
  seen?: boolean;
  updatedAt: string; // ISO timestamp of the last change, the newer one wins on restore
}
