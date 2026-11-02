// Regels voor de ochtend en vermoeide benen, met de voorvertoning onder de
// ochtendvraag.

import { checkInFor, morningSignals, tiredStreak } from './wellbeing';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { legEaseCardSession } from './legDayEase';
import { addDays, daysBetween, formatWeekdayDateNL } from '../utils/dates';
import { hasRole } from './templateRoles';
import { type AdviceInputs, type Advice, catchUpDates, moveOptions } from './adviceShared';

// --- Rule MORNING-CHECK ------------------------------------------------------
// What the morning check-in says for today and tomorrow (docs/onderzoek/Pijn
// spierpijn en vermoeidheid melden.md, "Hoe de planning reageert"):
// - muscle soreness: 1 to 2 days no quality and no heavy legs; easy running,
//   cycling and upper body stay. The first hard or leg-heavy session moves on.
// - "Op", or two negatives (tired, slept badly, heavy soreness): a calm day,
//   today's hard session moves on. One negative: a word, nothing moves.
// - three tired mornings in a row: a few lighter days, as a word.
// - the pain spot worse this morning (above 5, or 2 up): 2 to 3 days no
//   running or jumping on that spot.
// Always a proposal or a word; nothing moves without you.
export function morningAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const today = inputs.asOf;
  const checkIn = checkInFor(today, inputs.checkIns);
  if (!checkIn || checkIn.allNormal) return [];
  const sig = morningSignals(checkIn, inputs.logs);
  const out: Advice[] = [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const heavy = (s: PlannedSession, days: number) => {
    const t = templateById.get(s.templateId);
    return !!t && t.type !== 'recovery' && s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= days && (isHardRun(t) || isLegHeavyTemplate(t));
  };

  if (sig.spotWorse) {
    const { area, score } = sig.spotWorse;
    out.push({
      id: `morning-pain:${today}`, trigger: 'injury_active', ruleId: 'MORNING-CHECK', priority: 5,
      title: `${area} vanochtend ${score} van 10`,
      effect: `Hoger dan na de training. Doe de komende 2 tot 3 dagen geen lopen, springen of bergaf voor je ${area.toLowerCase()}; fietsen en bovenlichaam mogen. Pas weer hardlopen als wandelen hooguit 1 tot 2 doet. Wordt het niet beter in 2 tot 3 weken, laat een fysiotherapeut kijken.`,
      why: 'Volgens het pijnmonitoringsmodel mag pijn tot 5 op 10, als hij de ochtend erna niet hoger is. Vanochtend is hij hoger: dan krijgt die plek rust (Silbernagel en Thomeé).',
    });
  }

  if (sig.sore !== 'none' || sig.rest) {
    const days = sig.sore !== 'none' ? 1 : 0;
    // The card of LEG-EASE already speaks for the one training it picks today (a heavy leg day, else a hard
    // run): the same choice as the card, so one muscle soreness gives one card. Without a card (the setting,
    // pain on a leg spot) MORNING-CHECK speaks itself.
    const cardId = !sig.rest ? legCardSessionOf(inputs)?.id : undefined;
    const next = inputs.plannedSessions.filter((s) => s.id !== cardId && heavy(s, days)).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    const reason = sig.rest ? 'Je bent op of sliep slecht en bent moe' : sig.sore === 'flink' ? 'Flinke spierpijn' : 'Spierpijn';
    const rule = sig.rest
      ? 'Bij "op", of bij twee signalen tegelijk, is vandaag een rustige dag: herstel komt eerst (Saw, Main en Gastin 2016).'
      : 'Met spierpijn zijn je benen 1 tot 2 dagen minder krachtig en minder zuinig; een harde training levert dan minder op (Marcora 2007). Rustig lopen, fietsen en bovenlichaam blijven staan.';
    if (next) {
      const t = templateById.get(next.templateId)!;
      // Not next to another hard or leg-heavy session (that day or the day after).
      const clear = (d: string) => !inputs.plannedSessions.some((o) => o.id !== next.id && (o.scheduledDate === d || o.scheduledDate === addDays(d, 1)) && heavy(o, 14));
      const laterDates = catchUpDates(next, t, inputs, templateById, addDays(today, sig.sore !== 'none' ? 2 : 1), clear);
      const later = laterDates[0];
      const title = `${reason}: ${t.name} later`;
      if (later) {
        const morningEffect = (d: string) => `${t.name} van ${formatWeekdayDateNL(next.scheduledDate)} naar ${formatWeekdayDateNL(d)}.${sig.sore === 'flink' ? ' Ook de rustige loop mag vandaag wandelen of fietsen worden.' : ''}`;
        out.push({
          id: `morning:${today}:${next.id}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 4, title,
          effect: morningEffect(later),
          why: rule,
          ...moveOptions(title, { plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `${reason} op de ochtend van ${formatWeekdayDateNL(today)}.`, generatedBy: ['engine/adviceEngine.ts', 'MORNING-CHECK'] }, laterDates, t.name, rule, morningEffect),
        });
      } else {
        const when = next.scheduledDate === today ? 'vandaag' : next.scheduledDate === addDays(today, 1) ? 'morgen' : formatWeekdayDateNL(next.scheduledDate);
        // Een test of wedstrijd "rustig" doen is geen test meer: zeg wat je dan wel doet.
        const testLike = hasRole(t, 'test') || hasRole(t, 'race');
        const effect = testLike
          ? `Op benen met spierpijn loop je trager dan je kunt, en deze week is er geen goede latere dag voor ${t.name}. Voel je ${when === 'vandaag' ? 'het bij het inlopen' : `${when} bij het opstaan`} nog spierpijn in je benen, loop dan rustig in plaats van te testen; de test komt dan terug in een volgende week. Zit het alleen in je bovenlichaam, tik dat aan in je ochtendcheck; dan vervalt dit advies.`
          : t.type === 'strength'
            ? `Deze week is er geen goede latere dag voor ${t.name}. Doe ${when} de korte versie, met lichtere gewichten en ruim reserve (zeker 3 herhalingen over).`
            : `Deze week is er geen goede latere dag voor ${t.name}. Doe ${when} de korte versie, rustig (RPE 3 tot 4).`;
        const title = testLike ? `${reason}: ${t.name} ${when}` : `${reason}: ${t.name} ${when} rustig`;
        out.push({ id: `morning:${today}:${next.id}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 3, title, effect, why: rule });
      }
    } else if (sig.rest) {
      // The mission card keeps today's easy session. Say so, instead of
      // advising a walk next to a card that still shows the run.
      const kept = inputs.plannedSessions
        .filter((s) => s.scheduledDate === today && s.status !== 'skipped' && !loggedIds.has(s.id))
        .map((s) => templateById.get(s.templateId))
        .filter((t): t is SessionTemplate => !!t && t.type !== 'recovery');
      const effect = kept.length > 0
        ? `Er staat vandaag niets zwaars. ${kept.map((t) => t.name).join(' en ')} blijft op je kaart staan, omdat hij rustig is. Doe hem kort en stop als het inlopen zwaar voelt. Liever wandelen of rustig fietsen? Sla hem dan over; dat is vandaag genoeg.`
        : 'Er staat vandaag niets zwaars. Houd het zo: een wandeling of rustig fietsen is genoeg.';
      out.push({ id: `morning:${today}:rest`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 2, title: 'Een rustige dag', effect, why: rule });
    }
  } else if (sig.negatives === 1) {
    const next = inputs.plannedSessions.find((s) => heavy(s, 0));
    if (next) {
      const t = templateById.get(next.templateId)!;
      // Een test of wedstrijd heeft geen korte versie.
      const testLike = hasRole(t, 'test') || hasRole(t, 'race');
      const effect = testLike
        ? `Eén signaal is geen reden om ${t.name} te laten vallen. Loop hem liefst vroeg op de dag en neem ruim de tijd voor het inlopen. Voelt dat zwaarder dan normaal, loop dan rustig in plaats van te testen; de test komt dan terug in een volgende week.`
        : `Doe hem liefst vroeg op de dag, of kies de korte versie. Voelt het inlopen zwaarder dan normaal, ruil hem dan voor een rustige training.`;
      out.push({ id: `morning:${today}:one`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 2, title: `Moe of slecht geslapen: ${t.name} vandaag`, effect, why: 'Eén signaal is nog geen reden om iets te schuiven; slaap en vermoeidheid wegen het zwaarst bij een harde training later op de dag (Craven e.a. 2022).' });
    }
  }

  if (tiredStreak(today, inputs.checkIns) >= 3) {
    out.push({ id: `morning-tired:${today}`, trigger: 'session_too_hard', ruleId: 'MORNING-CHECK', priority: 3, title: 'Drie ochtenden op rij moe', effect: 'Houd de komende 3 tot 4 dagen ongeveer een kwart minder minuten en geen harde trainingen. Daarna weer gewoon verder.', why: 'Recreatieve lopers die hun schema zo bijstelden op hun ochtendgevoel, gingen meer vooruit dan met een vast schema (Nuuttila e.a. 2022).' });
  }
  return out;
}

// --- Rule LEG-EASE -----------------------------------------------------------
// The "a day later" half of the card on Vandaag for a heavy leg day (or a hard run) of today on tired
// legs (engine/legDayEase.ts): the first good days after today, with the same checks as every other
// move (room, the 48-hour rule, not next to another hard or leg-heavy session), as a proposal with
// Akkoord through the usual planning round. Undefined when there is no good day this week: the card
// then offers Lichter only. `fromOffset` 2 after soreness (one to two days no heavy legs), else 1.
export function legEaseMoveAdvice(inputs: AdviceInputs, sessionId: string, reason: string, fromOffset: 1 | 2): Advice | undefined {
  return laterMoveAdvice(inputs, sessionId, {
    id: `leg-ease:${inputs.asOf}:${sessionId}`,
    ruleId: 'LEG-EASE',
    why: 'Met vermoeide benen levert een zware beendag of harde training minder op, en doortrainen mag. Een dag later kan helpen, en je kiest zelf (docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md).',
    reason,
  }, fromOffset);
}

// One training of today (or later) to the first good days after it, with the same checks as every
// other move (room, the 48-hour rule, not next to another hard or leg-heavy session), as a proposal
// with Akkoord. Shared by LEG-EASE and MORNING-WATCH (engine/morningProposal.ts), each with its own
// id, rule and reason. Undefined when there is no good day this week.
export interface LaterMoveSpec {
  id: string;
  ruleId: string;
  why: string;
  // Why the training moves, written on the change ("Spierpijn", "Twee van drie wijken af").
  reason: string;
}

export function laterMoveAdvice(inputs: AdviceInputs, sessionId: string, spec: LaterMoveSpec, fromOffset: 1 | 2): Advice | undefined {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  const next = inputs.plannedSessions.find((s) => s.id === sessionId);
  const t = next ? templateById.get(next.templateId) : undefined;
  if (!next || !t) return undefined;
  const today = inputs.asOf;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const heavy = (s: PlannedSession) => {
    const o = templateById.get(s.templateId);
    return !!o && o.type !== 'recovery' && s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= 14 && (isHardRun(o) || isLegHeavyTemplate(o));
  };
  const clear = (d: string) => !inputs.plannedSessions.some((o) => o.id !== next.id && (o.scheduledDate === d || o.scheduledDate === addDays(d, 1)) && heavy(o));
  const laterDates = catchUpDates(next, t, inputs, templateById, addDays(today, fromOffset), clear);
  const later = laterDates[0];
  if (!later) return undefined;
  // "Later" en niet "een dag later": de eerste goede dag kan ook twee dagen verder liggen; de knop noemt de dag.
  const title = `${t.name} later`;
  const effectFor = (d: string) => `${t.name} van ${formatWeekdayDateNL(next.scheduledDate)} naar ${formatWeekdayDateNL(d)}.`;
  return {
    id: spec.id, trigger: 'session_too_hard', ruleId: spec.ruleId, priority: 4, title,
    effect: effectFor(later),
    why: spec.why,
    ...moveOptions(title, { plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `${spec.reason} op ${formatWeekdayDateNL(today)}.`, generatedBy: ['engine/adviceEngine.ts', spec.ruleId] }, laterDates, t.name, spec.why, effectFor),
  };
}

// The training the card of LEG-EASE speaks for today, when soreness is reported (engine/legDayEase.ts).
export function legCardSessionOf(inputs: AdviceInputs): PlannedSession | undefined {
  return legEaseCardSession({ mode: inputs.legEase, today: inputs.asOf, plannedSessions: inputs.plannedSessions, templates: inputs.templates, logs: inputs.logs, injuries: inputs.injuries, checkIns: inputs.checkIns });
}

// The name of the training that card will speak for after this check-in, for the preview line under the
// sheet. Only with soreness and not on a day of "op" (then the rest advice speaks, as before).
export function previewLegCard(inputs: AdviceInputs): string | undefined {
  const checkIn = checkInFor(inputs.asOf, inputs.checkIns);
  if (!checkIn || checkIn.allNormal) return undefined;
  const sig = morningSignals(checkIn, inputs.logs);
  if (sig.sore === 'none' || sig.rest) return undefined;
  const session = legCardSessionOf(inputs);
  return session ? inputs.templates.find((t) => t.id === session.templateId)?.name : undefined;
}

// What Vandaag will say about a check-in you have not saved yet: the same rule,
// run on your real plan, so the sheet never promises more than the advice does.
export function previewMorningAdvice(inputs: AdviceInputs): Advice[] {
  return morningAdvice(inputs, new Map(inputs.templates.map((t) => [t.id, t])));
}

// That preview in one line under the check-in.
// `legCard`: the name of the training the card Benen will speak for (previewLegCard).
export function describeMorningPreview(advice: Advice[], legCard?: string): string {
  if (advice.length === 0 && !legCard) return 'Je planning blijft zoals hij is.';
  const shown = [...advice.map((a) => `"${a.title}"`), ...(legCard ? [`de kaart Benen voor ${legCard}`] : [])];
  return `Op Vandaag verschijnt dan: ${shown.join(' en ')}. Niets verandert zonder jouw akkoord.`;
}
