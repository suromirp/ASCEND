// ASCEND: de melding in Week na jouw keuze op Vandaag (instelling "Melding na jouw keuze",
// docs/beslissingen/2026-11-10-week-melding-na-keuze.md). Koos je vandaag "Benen fris" en blijft een
// training van vandaag dus staan, dan zegt Week bij de melding over die training dat jij koos.
// Afgeleid uit het bestaande ochtendantwoord (`morningCheckIns`), nooit opgeslagen. Het antwoord
// geldt alleen voor vandaag en alleen voor de training van vandaag. De planning verandert niet;
// het voorstel blijft bereikbaar, alleen niet meer als hoofdknop.
//
// Puur: geen React, geen IndexedDB.

import type { MorningCheckIn } from '../models/checkIn';
import type { AppSettings } from '../storage/database';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { WeekConcern } from './weekConcerns';

export type WeekAfterChoice = NonNullable<AppSettings['weekAfterChoice']>;
const WEEK_AFTER_CHOICE_ADVICE: WeekAfterChoice = 'mine';

// Afwezig of onbekend is het advies (oude back-ups hebben het veld niet).
export function resolveWeekAfterChoice(s: Pick<AppSettings, 'weekAfterChoice'> | undefined): WeekAfterChoice {
  return s?.weekAfterChoice === 'plain' ? 'plain' : WEEK_AFTER_CHOICE_ADVICE;
}

// Is "Benen fris" vandaag je antwoord? Spierpijn alleen in je bovenlichaam is geen beenantwoord.
export function freshLegsToday(checkIns: readonly MorningCheckIn[] | undefined, today: string): boolean {
  const entry = (checkIns ?? []).find((c) => c.date === today);
  return !!entry && entry.legs === 'fris' && !entry.allNormal && entry.soreWhere !== 'upper';
}

export interface KeptContext {
  today: string;
  checkIns: readonly MorningCheckIn[] | undefined;
  sessions: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
  setting: WeekAfterChoice;
}

// Zet `kept` op de beenmeldingen waar een training van vandaag in zit, als je vandaag koos dat de
// benen fris zijn. Droog feit eerst; de oorspronkelijke melding blijft als tweede regel staan.
export function markKept(concerns: WeekConcern[], ctx: KeptContext): WeekConcern[] {
  if (ctx.setting === 'plain' || !freshLegsToday(ctx.checkIns, ctx.today)) return concerns;
  const byId = new Map(ctx.sessions.map((s) => [s.id, s]));
  return concerns.map((c) => {
    if (c.rule !== 'LEG-SPACING' || c.kept) return c;
    const mine = c.finding.sessionIds.map((id) => byId.get(id)).find((s) => s?.scheduledDate === ctx.today);
    if (!mine) return c;
    const name = ctx.templates.find((t) => t.id === mine.templateId)?.name ?? 'je training';
    return { ...c, kept: true, headline: `Benen fris, je liet ${name} staan.`, fact: `${c.headline} ${c.fact}` };
  });
}

// Staat er alleen nog gekozen werk open? Dan is "Bekijk voorstel" geen hoofdknop maar een gewone tekstknop.
export function onlyKept(concerns: readonly WeekConcern[], askableKeys: ReadonlySet<string>): boolean {
  const open = concerns.filter((c) => askableKeys.has(c.key));
  return open.length > 0 && open.every((c) => c.kept);
}
