// ASCEND: de tweede regel van een rustdagrij in Week, met wat er die dag echt gebeurt (I-150, I-163). Dezelfde regel
// als vroeger in `dayPlan.ts`, maar:
// - staat er een open training op de rustdag, dan zegt de regel dat en niet "bewust herstel";
// - een losse training die je die dag deed (een log zonder geplande training) telt mee.
// Puur en alleen lezen: geen log en geen geplande training wordt herschreven.

import type { SessionLog, SessionTemplate } from '../models/training';
import { REST_ROW_QUIET, type PlanDay } from './dayPlan';

export function restRowText(
  day: Pick<PlanDay, 'date' | 'strip'>,
  logs: readonly Pick<SessionLog, 'plannedSessionId' | 'templateId' | 'completedDate'>[] = [],
  templateById?: ReadonlyMap<string, Pick<SessionTemplate, 'name'>>,
): string {
  const done = day.strip.filter((e) => e.done).map((e) => e.template.name);
  const loose = logs.filter((l) => !l.plannedSessionId && l.completedDate === day.date).map((l) => templateById?.get(l.templateId)?.name ?? 'Training');
  const open = day.strip.filter((e) => !e.done);
  const gedaan = [...done, ...loose];
  const doneText = gedaan.length === 0 ? '' : gedaan.length === 1 ? `${gedaan[0]} gedaan` : `${gedaan.length} trainingen gedaan`;
  if (open.length === 0) return doneText || REST_ROW_QUIET;
  const openText = gedaan.length === 0
    ? (open.length === 1 ? `${open[0].template.name} staat nog open` : `${open.length} trainingen staan nog open`)
    : `${open.length} nog open`;
  return doneText ? `${doneText}, ${openText}` : openText;
}
