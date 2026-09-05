// A blessure/injury log entry. Independent of SessionLog's strict
// append-only rule: marking an injury resolved is a legitimate status
// change, not a rewrite of history (nothing about what training actually
// happened is altered).

export type InjurySeverity = 'licht' | 'matig' | 'ernstig';

export interface InjuryNote {
  id: string;
  date: string; // ISO date — when it started/was noticed
  bodyPart: string;
  severity: InjurySeverity;
  note?: string;
  resolvedDate?: string; // ISO date — undefined while still open
}
