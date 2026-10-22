import { parseISODate } from '../../utils/dates';

const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// "3 jan": a date in the planner, short enough for one line on a phone.
export function shortDateNL(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}
