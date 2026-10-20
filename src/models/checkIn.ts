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
  // The spot that hurt in the last 14 days, scored this morning 0 to 10
  // (pain-monitoring model: does it settle by the next morning?).
  spot?: { area: string; score: number };
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
