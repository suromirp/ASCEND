import type { SessionLog } from '../models/training';

// Friday Bergconditie should not quietly wreck Saturday Lower B. If the
// last two logged Lower B sessions both came back 'worse' than normal,
// that's a pattern worth surfacing — not a single off day, which isn't a
// reason to change anything (per the training guide's own "kijk naar
// trends" rule).
export function fridaySessionDegradingLowerB(logs: SessionLog[]): boolean {
  const lowerBFeel = logs
    .filter((l) => l.templateId === 'tpl_lower_b' && l.subjectiveFeel)
    .sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1))
    .slice(0, 2)
    .map((l) => l.subjectiveFeel);

  return lowerBFeel.length === 2 && lowerBFeel.every((f) => f === 'worse');
}
