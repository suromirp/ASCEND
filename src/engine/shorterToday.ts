// ASCEND: "Minder tijd vandaag" op de missiekaart (docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md).
//
// Je kiest 30, 45 of 60 minuten; de app stelt dezelfde training korter voor, met minder volume of
// alleen de kernsets (instelling "Minder tijd vandaag", `AppSettings.shorterToday`). Het is een
// voorstel met Akkoord: Akkoord geeft de rij van vandaag een vaste lengte (`plannedMinutes`), op
// dezelfde dag en met dezelfde training, en Ongedaan maken zet hem terug. De log van die dag blijft
// een gewone log. Een test of wedstrijd kan niet korter; die kun je alleen verplaatsen, via het
// bestaande voorstel.
//
// Puur: geen React, geen opslag.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { Advice } from './adviceEngine';
import { hasRole, isTestOrRace } from './templateRoles';

export type ShorterHow = 'kern' | 'volume';
export type ShorterSetting = ShorterHow | 'off';

export const SHORTER_RULE = 'SHORTER-TODAY';
export const SHORTER_MINUTES = [30, 45, 60] as const;
export const SHORTER_ADVICE: ShorterSetting = 'kern';

export const TEST_NOT_SHORTER = 'Een test kan niet korter: dan meet hij iets anders. Verplaatsen kan wel, dan zie je eerst wat er verschuift.';

export const VOLUME_STRENGTH = 'Alle oefeningen blijven, met een set minder per oefening.';
export const FORGE_NOTE = 'In Forge staan alle oefeningen; je slaat zelf over wat vandaag niet past.';

export function resolveShorterToday(value: unknown): ShorterSetting {
  return value === 'kern' || value === 'volume' || value === 'off' ? value : SHORTER_ADVICE;
}

// De tijden die korter zijn dan de training zelf.
export function shorterChoices(fullMinutes: number): number[] {
  return SHORTER_MINUTES.filter((m) => m < fullMinutes);
}

export type ShorterPlan =
  | { kind: 'test' }
  | { kind: 'none' }
  | { kind: 'ok'; minutes: number; from: number; how: ShorterHow; lines: string[] };

function joinNL(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`;
}

export function planShorter(args: { template: SessionTemplate; fullMinutes: number; available: number; how: ShorterHow }): ShorterPlan {
  const { template, fullMinutes, available } = args;
  if (isTestOrRace(template)) return { kind: 'test' };
  if (!(available > 0) || available >= fullMinutes) return { kind: 'none' };
  const lines = [`Duur: ${fullMinutes} min wordt ${available} min.`];
  let how = args.how;
  if (template.type === 'strength') {
    const exercises = template.exercises ?? [];
    const core = exercises.filter((e) => e.priority === 'core');
    // Past de kern niet in de gekozen minuten (naar het aandeel van de sets), dan minder van alles.
    const sets = (list: typeof exercises) => list.reduce((n, e) => n + Math.max(0, e.sets), 0);
    const coreFits = sets(exercises) > 0 && (sets(core) / sets(exercises)) * fullMinutes <= available;
    if (how === 'kern' && core.length > 0 && coreFits) {
      const rest = exercises.filter((e) => e.priority !== 'core').map((e) => e.exerciseName);
      lines.push(`Je doet de kernoefeningen: ${joinNL(core.map((e) => e.exerciseName))}.${rest.length > 0 ? ` ${joinNL(rest)} laat je vandaag liggen.` : ''}`);
    } else {
      how = 'volume';
      lines.push(VOLUME_STRENGTH);
    }
    lines.push(FORGE_NOTE);
  } else if (hasRole(template, 'blocks')) {
    lines.push(how === 'kern' ? 'De kern blijft zoals hij is; het inlopen en uitlopen worden korter.' : 'Minder herhalingen of een korter blok, in hetzelfde tempo.');
  } else {
    lines.push('Hetzelfde tempo en dezelfde zone, alleen korter.');
  }
  return { kind: 'ok', minutes: available, from: fullMinutes, how, lines };
}

// Het voorstel: één rij, dezelfde dag en dezelfde training, alleen een vaste lengte. Het id van het
// advies hangt aan de rij, de dag en de tijd.
export function shorterAdvice(args: { session: PlannedSession; template: SessionTemplate; plan: Extract<ShorterPlan, { kind: 'ok' }>; now: string }): Advice {
  const { session, template, plan, now } = args;
  const id = `shorter:${session.id}:${session.scheduledDate}:${plan.minutes}`;
  const summary = `${template.name} vandaag in ${plan.minutes} minuten in plaats van ${plan.from}.`;
  const why = 'Liever een kortere training dan geen training. Je doet dezelfde training, alleen korter; morgen gaat je planning gewoon verder.';
  // Het voorstel zelf krijgt het moment erbij: na Ongedaan maken en een tweede Akkoord blijft het
  // eerste, teruggedraaide voorstel in het logboek staan zoals het was.
  const proposal: PlanChangeProposal = {
    id: `${id}:${now}`,
    trigger: 'no_time_today',
    issue: 'Minder tijd vandaag',
    changes: [{
      plannedSessionId: session.id,
      action: 'move',
      fromDate: session.scheduledDate,
      toDate: session.scheduledDate,
      plannedMinutes: plan.minutes,
      reason: `Minder tijd vandaag: ${plan.minutes} minuten.`,
      generatedBy: ['engine/shorterToday.ts', SHORTER_RULE],
    }],
    alternatives: [],
    consequences: summary,
    explanation: why,
    createdAt: now,
  };
  return {
    id,
    trigger: 'plan_update',
    ruleId: SHORTER_RULE,
    title: `${template.name} korter`,
    effect: summary,
    lead: summary,
    why,
    priority: 0,
    proposal,
  };
}
