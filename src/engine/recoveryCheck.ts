import type { SessionLog } from '../models/training';

// Saturday's hill/incline intervals should not quietly wreck Sunday's long
// run. If the last two logged long runs both came back 'worse' than
// normal, that's a pattern worth surfacing — not a single off day, which
// isn't a reason to change anything (per the training guide's own "kijk
// naar trends" rule).
export function hillIntervalsDegradingLongRun(logs: SessionLog[]): boolean {
  const longRunFeel = logs
    .filter((l) => l.templateId === 'tpl_long_run' && l.subjectiveFeel)
    .sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1))
    .slice(0, 2)
    .map((l) => l.subjectiveFeel);

  return longRunFeel.length === 2 && longRunFeel.every((f) => f === 'worse');
}
