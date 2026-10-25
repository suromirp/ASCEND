// ASCEND — how you feel, apart from what you trained (docs/onderzoek/Pijn
// spierpijn en vermoeidheid melden.md). Three different signals: muscle
// soreness (diffuse, both sides, worst after 48 to 72 hours, warms out),
// pain on a spot (a tendon, joint or bone you can point at) and general
// fatigue. A short morning check-in asks them apart; pain on a spot is
// asked after a session, with a score.

export type LegFeeling = 'fris' | 'stijf' | 'spierpijn' | 'flink';
export type EnergyFeeling = 'fit' | 'gewoon' | 'moe' | 'op';
export type SleepFeeling = 'goed' | 'gewoon' | 'matig' | 'slecht';

export interface MorningCheckIn {
  date: string; // ISO date of the morning
  allNormal?: boolean; // one tap: everything as usual
  legs?: LegFeeling;
  energy?: EnergyFeeling;
  sleep?: SleepFeeling;
  // The sleep answer came from the proposal (watch or your own estimate of a night),
  // not from a tap of yours. Then a later verdict on the night may update it
  // (engine/morningCard.ts#reviseCheckInSleep). Absent once you chose it yourself.
  sleepSuggested?: boolean;
  // The spot that hurt in the last 14 days, scored this morning 0 to 10
  // (pain-monitoring model: does it settle by the next morning?).
  spot?: { area: string; score: number };
}

// Your own verdict on a night the watch only partly measured (watch off the
// wrist). Kept per date next to the check-ins (AppSettings.nightJudgments),
// never in the watch numbers: intervals.icu and the watch stay as they are.
// 'klopt': the short night counts as it is. 'niet_goed': the night is left out
// of your own averages and of the proposal; `hours` is your own estimate (5 to
// 9), `hoursSkipped` that you chose "Weet ik niet".
export type NightVerdict = 'klopt' | 'niet_goed';

export interface NightJudgment {
  date: string; // ISO date of the morning, the same date as the sleep record
  verdict: NightVerdict;
  hours?: number;
  hoursSkipped?: boolean;
  // The sleep the watch showed when you judged (minutes). The verdict holds only while
  // the measured sleep is the same; when the rest of the night comes in later it lapses.
  // Absent on a verdict from before this field: that holds as it always did.
  minutes?: number;
}

// Pain on a spot after a session: where, how much at its worst (1 to 10),
// and whether it got worse as you went on (then the pain-monitoring model
// does not apply: stop, it may be a bone or a tear).
export interface PainReport {
  area: string;
  side?: 'links' | 'rechts' | 'beide';
  score: number;
  worseDuring?: boolean;
  onBone?: boolean; // shin, foot, hip/groin at 3 or more: on one spot on the bone?
}

// The one weekly question (OSTRC-O2 in short, Clarsen e.a.): did leg, foot or
// back trouble from training get in the way this week? Asked in the week
// review; the full overuse questionnaire found about ten times more problems
// than plain injury registration.
export type WeeklyTrouble = 'geen' | 'wel_gewoon' | 'minder' | 'niet_kunnen';
export type TroubleSeverity = 'mild' | 'matig' | 'ernstig';

export interface WeeklyHealthCheck {
  weekStart: string; // Monday
  trouble: WeeklyTrouble;
  area?: string;
  severity?: TroubleSeverity;
}

// The question of the week on Today (engine/weeklyQuestion.ts): one "Als ...,
// wat doe je dan?" a week, and the one line you answer with, your plan. Kept
// with the settings (AppSettings.weeklyIntentions), so it travels in an
// export. Append-only: an answer is never rewritten, and the question is
// stored as it was shown, so a later wording change cannot alter what you
// answered. `laterOn` is the day you pressed "Later" (the card is back the
// next day, until the week is over).
export interface WeeklyIntention {
  weekStart: string; // Monday
  questionId: string;
  question: string;
  answer?: string;
  answeredAt?: string; // ISO date-time
  laterOn?: string; // ISO date
}
