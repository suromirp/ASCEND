import { BUILD_TIME } from './appUpdate';
import { formatClock } from './clock';

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// De bouwtijd in de tijd van de telefoon, kort: "22 okt, 18:59". Leeg als de tijd niet te lezen is.
export function buildLabel(iso: string = BUILD_TIME): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatClock(d)}`;
}
