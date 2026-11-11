// Regels voor gemiste trainingen en rustdagen: inhalen, ruilen, terugtrekken
// en een extra training.

import { keyPhrase, weekKeySession } from './keySession';

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeItem } from '../models/planChange';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { respectsHeavySpacing } from './scheduler';
import { isTemplatePlannable } from './sports';
import { addDays, daysBetween, formatWeekdayDateNL } from '../utils/dates';
import { proposeExtraSession } from './extraRun';
import { lastDeclinedOn, linkCandidates } from './missedTraining';
import { type AdviceInputs, type Advice, isDone, inProgram, isKeySession, findCatchUpDate, findRestDayToUse, keyCatchUpShort, type AdviceOption, catchUpDates, moveOptions, proposal } from './adviceShared';
import { TEST_RUN_ID } from './adviceTestRun';

// Een naam midden in een zin: "Tempoloop" wordt "tempoloop".
const lower = (name: string) => `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

// --- Rule MISSED-CATCH-UP --------------------------------------------------
// Trigger: a planned session in the last 3 days has no log and wasn't
// skipped. Rule: catch up on a free day later this same week, if one
// exists without breaking the 48h leg rule; otherwise let it go — never
// double up. Effect: a move (or skip) proposal.
export function missedAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  // Ill or building back up: nothing gets caught up (engine/illness.ts).
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  // First link, then catch up: a training a loose log may belong to gets the link proposal on Vandaag
  // (engine/missedTraining.ts), not a catch-up of something that was perhaps done.
  const linkable = inputs.missedLink?.on === false ? new Set<string>() : new Set(linkCandidates({ plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates, today: inputs.asOf, declined: inputs.missedLink?.declined }).keys());
  // The window of three days counts from the training, or from the day you said Liever niet to linking it:
  // a catch-up never falls away for good because the link proposal came first.
  const windowFrom = (s: PlannedSession) => [s.scheduledDate, lastDeclinedOn(s.id, inputs.missedLink?.declinedOn) ?? ''].sort().at(-1)!;
  const recentMissed = inputs.plannedSessions.filter(
    (s) => s.templateId !== TEST_RUN_ID && s.status !== 'skipped' && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program) && s.scheduledDate < inputs.asOf && daysBetween(windowFrom(s), inputs.asOf) <= 3
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, inputs.asOf) && !linkable.has(s.id),
  );
  // One advice for everything missed, not one each (production feedback:
  // a stack of "gemist" cards). Only a key session (engine/keySession.ts:
  // by default the long run or the mountain hike) is caught up, on a free day this week that keeps 48
  // hours from other heavy leg days; everything else is let go
  // (docs/onderzoek, rapport 2, rule C8: catching up is never stacking).
  // The key session is the one of engine/keySession.ts, the same as the line on Ascend.
  const phrase = keyPhrase(inputs.keyFocus);
  const rule = phrase
    ? `ASCEND haalt hoogstens één training in: de belangrijkste sleuteltraining die bleef liggen (${phrase}). Dat is een vrije dag in dezelfde week, nooit binnen 48 uur van een andere zware beendag en nooit naast een andere harde loop. Staat er vandaag of morgen een rustdag en deed je de dag ervoor niets, dan wordt die rustdag de inhaaldag: er is niets om van te herstellen. De rest vervalt: twee trainingen op één dag om bij te benen helpt niet.`
    : 'Met Rustig aan heeft je week geen sleuteltraining, dus ASCEND haalt niets in. Twee trainingen op één dag om bij te benen helpt niet.';
  const missed = recentMissed
    .map((s) => ({ s, template: templateById.get(s.templateId) }))
    .filter((m): m is { s: PlannedSession; template: SessionTemplate } => !!m.template && m.template.type !== 'recovery')
    .sort((x, y) => x.s.scheduledDate.localeCompare(y.s.scheduledDate));
  if (missed.length === 0) return [];

  const items: PlanChangeItem[] = [];
  const caughtUp: string[] = [];
  const dropped: string[] = [];
  let usedRest = false;
  // At most one catch-up per proposal: the missed key session of the best tier (engine/keySession.ts).
  // Two catch-ups could land on one day, or two hard runs on days next to each other.
  const chosen = weekKeySession(
    missed.filter((m) => isKeySession(m.template, inputs.keyFocus) && isTemplatePlannable(m.template, inputs.enabledSports)).map((m) => m.s),
    templateById, inputs.keyFocus, inputs.program,
  );
  const otherKeys: string[] = [];
  for (const { s, template } of missed) {
    const key = isKeySession(template, inputs.keyFocus);
    const plannable = key && s.id === chosen?.id;
    const catchUp = plannable ? findCatchUpDate(s, template, inputs, templateById, inputs.asOf, { hardApart: true }) : undefined;
    const restDay = plannable && !catchUp && !usedRest ? findRestDayToUse(s, template, inputs, templateById, { hardApart: true }) : undefined;
    if (restDay) {
      usedRest = true;
      const short = keyCatchUpShort(s, template, restDay.scheduledDate, inputs, templateById);
      const minutes = short?.minutes;
      items.push({ plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: restDay.scheduledDate, plannedMinutes: minutes, reason: `Gemist op ${formatWeekdayDateNL(s.scheduledDate)}, ingehaald op je rustdag: de dag ervoor deed je geen training.`, generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      items.push({ plannedSessionId: restDay.id, action: 'remove', reason: 'Rustdag niet nodig: de dag ervoor deed je geen training.', generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      caughtUp.push(`${template.name} doe je ${restDay.scheduledDate === inputs.asOf ? 'vandaag' : 'morgen'} in plaats van je rustdag, want ${restDay.scheduledDate === inputs.asOf ? 'gisteren' : 'vandaag'} deed je geen training${short ? `. Korter, ${short.minutes} minuten: die week heeft al een ${lower(short.own)}, en twee volle in één week is te veel ineens` : ''}`);
    } else if (catchUp) {
      items.push({ plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: catchUp, reason: `Gemist op ${formatWeekdayDateNL(s.scheduledDate)}, ingehaald op een vrije dag in dezelfde week.`, generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      caughtUp.push(`${template.name} haal je in op ${formatWeekdayDateNL(catchUp)}`);
    } else {
      const notChosen = key && !!chosen && s.id !== chosen.id;
      items.push({ plannedSessionId: s.id, action: 'remove', reason: notChosen ? 'Gemist; ASCEND haalt er hoogstens één in, de belangrijkste.' : key ? 'Gemist en deze week niet in te halen zonder te stapelen.' : 'Gemist; alleen de sleuteltraining van de week wordt ingehaald.', generatedBy: ['engine/adviceEngine.ts', 'MISSED-CATCH-UP'] });
      dropped.push(template.name);
      if (notChosen) otherKeys.push(template.name);
    }
  }
  const names = missed.map((m) => m.template.name);
  // Een naam met "en" erin ("Heuvelsprints en afdalen") maakt een opsomming met "en" onleesbaar; dan alleen komma's.
  const list = (xs: string[]) => (xs.length === 1 ? xs[0] : xs.some((x) => / en /.test(x)) ? xs.join(', ') : `${xs.slice(0, -1).join(', ')} en ${xs.at(-1)}`);
  const title = missed.length === 1 ? `${names[0]} van ${formatWeekdayDateNL(missed[0].s.scheduledDate)} is blijven liggen` : `${missed.length} trainingen zijn blijven liggen: ${list(names)}`;
  const effect = [
    caughtUp.length > 0 ? `${caughtUp.join('; ')}.` : '',
    dropped.length > 0 ? `${list(dropped)} ${dropped.length === 1 ? 'vervalt' : 'vervallen'}. De rest van je week blijft zoals gepland.` : '',
    otherKeys.length > 0 && chosen ? `ASCEND haalt er hoogstens één in, de belangrijkste: ${lower(templateById.get(chosen.templateId)!.name)}. Twee inhalen in één week is stapelen.` : '',
  ].filter(Boolean).join(' ');
  // One training caught up on a free day: the other free days as options.
  let options: AdviceOption[] | undefined;
  const single = items.length === 1 && items[0].action === 'move' && !usedRest ? missed[0] : undefined;
  if (single) {
    const dates = catchUpDates(single.s, single.template, inputs, templateById, inputs.asOf, undefined, { hardApart: true });
    if (dates.length > 1) options = moveOptions(title, items[0], dates, single.template.name, rule, (d) => `${single.template.name} haal je in op ${formatWeekdayDateNL(d)}.`).options;
  }
  return [{
    options,
    id: `missed:${missed.map((m) => m.s.id).join('+')}`,
    trigger: 'session_missed',
    ruleId: 'MISSED-CATCH-UP',
    title,
    effect,
    why: `${missed.length === 1 ? 'Deze training is blijven liggen.' : 'Deze trainingen zijn blijven liggen.'} ${rule}`,
    priority: caughtUp.length > 0 ? 3 : 2,
    proposal: proposal(title, items, effect, rule),
  }];
}

// --- Rule REST-SWAP -----------------------------------------------------------
// Trigger: a rest day today, and yesterday no training at all. There is
// nothing to recover from (production feedback: "die rustdag is niet meer
// nodig als je gisteren niks gedaan hebt"). Rule: tomorrow's training moves
// to today and the rest day to tomorrow, if that keeps the spacing between
// heavy sessions. Not when ill, and not when the missed-session advice
// already uses this rest day for a catch-up.
export function restSwapAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const today = inputs.asOf;
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (inputs.program && yesterday < inputs.program.startDate) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  const rest = inputs.plannedSessions.find((s) => s.scheduledDate === today && isRest(s) && open(s));
  if (!rest || usedIds.has(rest.id)) return [];
  if (inputs.plannedSessions.some((s) => s.scheduledDate === today && !isRest(s) && open(s))) return [];
  if (inputs.logs.some((l) => l.completedDate === yesterday && templateById.get(l.templateId)?.type !== 'recovery')) return [];
  if (isIllnessDay(yesterday, inputs.illnessEpisodes, today)) return [];
  const next = inputs.plannedSessions.filter((s) => s.scheduledDate === tomorrow && !isRest(s) && open(s));
  if (next.length !== 1) return [];
  const session = next[0];
  const template = templateById.get(session.templateId);
  if (!template || !isTemplatePlannable(template, inputs.enabledSports)) return [];
  const withLoad = inputs.plannedSessions.filter((s) => s.id !== session.id && s.id !== rest.id && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
  if (!respectsHeavySpacing(today, template, withLoad, templateById, inputs.logs, session.id)) return [];
  const rule = 'Een rustdag is er om te herstellen van wat je deed. Deed je de dag ervoor geen training, dan schuift ASCEND de training van morgen naar vandaag en de rust naar morgen, zolang de afstand tussen zware trainingen klopt.';
  const effect = `Doe ${template.name} vandaag en rust morgen. Gisteren deed je geen training, dus er is vandaag niets om van te herstellen.`;
  const items: PlanChangeItem[] = [
    { plannedSessionId: session.id, action: 'move', fromDate: tomorrow, toDate: today, reason: 'Naar voren: gisteren geen training, dus de rustdag van vandaag is niet nodig.', generatedBy: ['engine/adviceEngine.ts', 'REST-SWAP'] },
    { plannedSessionId: rest.id, action: 'move', fromDate: today, toDate: tomorrow, reason: 'Rustdag een dag later, na de training.', generatedBy: ['engine/adviceEngine.ts', 'REST-SWAP'] },
  ];
  const title = 'Gisteren geen training: je rustdag kan een dag schuiven';
  return [{ id: `restswap:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-SWAP', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
}

// --- Rule SKIPPED-KEY-TO-REST --------------------------------------------------
// Trigger: you skipped today's (or yesterday's) long run or mountain hike,
// and a rest day follows right after a day without training. Skipping is
// usually "not today", not "never" (production feedback: long run and hill
// intervals skipped on Sunday, Monday a rest day). Rule: the key session
// takes the rest day, under the same conditions as MISSED-CATCH-UP. Shown
// straight away, the evening of the skip, not only the next morning.
export function skippedKeyAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const skipped = inputs.plannedSessions
    .filter((s) => s.status === 'skipped' && !inputs.removedByPlanIds?.has(s.id) && !usedIds.has(s.id) && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program)
      && s.scheduledDate <= inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 1)
    .map((s) => ({ s, template: templateById.get(s.templateId) }))
    .filter((m): m is { s: PlannedSession; template: SessionTemplate } => !!m.template && isKeySession(m.template, inputs.keyFocus) && isTemplatePlannable(m.template, inputs.enabledSports))
    .sort((a, b) => b.s.scheduledDate.localeCompare(a.s.scheduledDate));
  for (const { s, template } of skipped) {
    const rest = findRestDayToUse(s, template, inputs, templateById, { hardApart: true });
    if (!rest || usedIds.has(rest.id)) continue;
    const when = rest.scheduledDate === inputs.asOf ? 'vandaag' : 'morgen';
    const before = rest.scheduledDate === inputs.asOf ? 'gisteren' : 'vandaag';
    const rule = 'Een rustdag is er om te herstellen van wat je deed. Sla je de sleuteltraining over en deed je die dag verder niets, dan kan hij op de rustdag erna, zolang de afstand tussen zware trainingen klopt en er geen andere harde loop naast ligt.';
    const title = `${template.name} overgeslagen`;
    const short = keyCatchUpShort(s, template, rest.scheduledDate, inputs, templateById);
    const minutes = short?.minutes;
    const effect = `Doe hem ${when} in plaats van je rustdag: ${before} deed je geen training, dus die rust heb je niet nodig.${short ? ` Wel korter, ${short.minutes} minuten: die week heeft al een ${lower(short.own)}, en twee volle in één week is te veel ineens.` : ''}`;
    const items: PlanChangeItem[] = [
      { plannedSessionId: s.id, action: 'move', fromDate: s.scheduledDate, toDate: rest.scheduledDate, plannedMinutes: minutes, reason: `Overgeslagen op ${formatWeekdayDateNL(s.scheduledDate)}, gedaan op de rustdag erna.`, generatedBy: ['engine/adviceEngine.ts', 'SKIPPED-KEY-TO-REST'] },
      { plannedSessionId: rest.id, action: 'remove', reason: `Rustdag niet nodig: ${before} geen training.`, generatedBy: ['engine/adviceEngine.ts', 'SKIPPED-KEY-TO-REST'] },
    ];
    return [{ id: `skippedkey:${s.id}`, trigger: 'session_missed', ruleId: 'SKIPPED-KEY-TO-REST', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
  }
  return [];
}

// --- Rule REST-PULL ---------------------------------------------------------
// Trigger: nothing left to train today (moved, skipped or never there),
// nothing done today, and tomorrow is your rest day. Then today already is
// a rest day (production feedback: "verplaats je je laatste training van
// de dag voor de rustdag, dan had je vandaag eigenlijk rust"). Rule: the
// rest day comes to today and tomorrow gets a training: the one you just
// moved if it fits, otherwise the nearest one after it that keeps the
// spacing between heavy sessions. If none fits, say that two rest days in
// a row are fine too.
export function restPullAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const today = inputs.asOf;
  const tomorrow = addDays(today, 1);
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  const rest = inputs.plannedSessions.find((s) => s.scheduledDate === tomorrow && isRest(s) && open(s));
  if (!rest || usedIds.has(rest.id)) return [];
  if (inputs.plannedSessions.some((s) => s.scheduledDate === today && open(s))) return [];
  if (inputs.logs.some((l) => l.completedDate === today && templateById.get(l.templateId)?.type !== 'recovery')) return [];
  if (isIllnessDay(today, inputs.illnessEpisodes, today)) return [];
  if (inputs.program && today < inputs.program.startDate) return [];

  const restToToday: PlanChangeItem = { plannedSessionId: rest.id, action: 'move', fromDate: tomorrow, toDate: today, reason: 'Vandaag staat er geen training meer: dit is je rustdag.', generatedBy: ['engine/adviceEngine.ts', 'REST-PULL'] };
  const rule = 'Staat er vandaag geen training meer en is morgen je rustdag, dan is vandaag al een rustdag. ASCEND haalt de rust naar vandaag en zet morgen een training, als die past zonder te dicht op een zware training te zitten.';
  const title = 'Geen training meer vandaag. Wordt dit je rustdag?';
  // Already a training tomorrow next to the rest day (you moved it there).
  const tomorrowTraining = inputs.plannedSessions.find((s) => s.scheduledDate === tomorrow && !isRest(s) && open(s));
  if (tomorrowTraining) {
    const name = templateById.get(tomorrowTraining.templateId)?.name ?? 'je training';
    const effect = `Dan is vandaag je rustdag en doe je morgen ${name}.`;
    return [{ id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title, effect, why: rule, priority: 3, proposal: proposal(title, [restToToday], effect, rule) }];
  }
  // The training you just moved away from today first, then the nearest ones.
  const candidates = inputs.plannedSessions
    .filter((s) => !isRest(s) && open(s) && !usedIds.has(s.id) && s.scheduledDate > tomorrow && daysBetween(tomorrow, s.scheduledDate) <= 5)
    .sort((a, b) => Number(b.movedFromDate === today) - Number(a.movedFromDate === today) || a.scheduledDate.localeCompare(b.scheduledDate));
  for (const c of candidates) {
    const template = templateById.get(c.templateId);
    if (!template || !isTemplatePlannable(template, inputs.enabledSports)) continue;
    const others = inputs.plannedSessions.filter((s) => s.id !== c.id && s.id !== rest.id && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
    if (!respectsHeavySpacing(tomorrow, template, others, templateById, inputs.logs, c.id)) continue;
    const effect = `Dan is vandaag je rustdag en doe je morgen ${template.name}${c.movedFromDate === today ? '' : ` (gepland op ${formatWeekdayDateNL(c.scheduledDate)})`}.`;
    const items: PlanChangeItem[] = [restToToday, { plannedSessionId: c.id, action: 'move', fromDate: c.scheduledDate, toDate: tomorrow, reason: 'Naar de oude rustdag: de rust is naar vandaag gegaan.', generatedBy: ['engine/adviceEngine.ts', 'REST-PULL'] }];
    return [{ id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title, effect, why: rule, priority: 3, proposal: proposal(title, items, effect, rule) }];
  }
  return [{
    id: `restpull:${rest.id}`, trigger: 'plan_update', ruleId: 'REST-PULL', title: 'Vandaag en morgen rust',
    effect: 'Morgen past geen training zonder te dicht op een zware training te zitten. Twee rustdagen achter elkaar is ook prima: je komt fris aan bij de volgende.',
    why: rule, priority: 1,
  }];
}

// Rule EXTRA-SESSION: when the weeks before earned it, one extra training
// from the catalogue, the one that serves your biggest gap. A proposal:
// nothing is planned without Akkoord.
export function extraSessionAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  if (!inputs.extraSession || !inputs.program) return [];
  const found = proposeExtraSession({
    ...inputs.extraSession,
    today: inputs.asOf, program: inputs.program, plannedSessions: inputs.plannedSessions, logs: inputs.logs,
    templates: inputs.templates, illnessEpisodes: inputs.illnessEpisodes, respondedIds: inputs.respondedIds, keyFocus: inputs.keyFocus,
  });
  if (!found) return [];
  const template = templateById.get(found.choice.templateId)!;
  const title = `Extra training: ${template.name}`;
  const effect = `${found.choice.reason} Voorstel: ${formatWeekdayDateNL(found.date)}.`;
  const why = `${found.earnedReason} Dan mag je week groeien. Dat gaat via een extra korte training, niet via langere: één loop meer dan 10% langer dan je langste van de afgelopen maand gaf meer blessures, een groter weektotaal niet (Frandsen e.a. 2025).`;
  const items: PlanChangeItem[] = [{
    action: 'add', newSessionDraft: { templateId: template.id, scheduledDate: found.date, weekStartDate: found.weekStart },
    reason: found.choice.reason, generatedBy: ['engine/extraRun.ts', 'EXTRA-SESSION'],
  }];
  const p = proposal(title, items, effect, why);
  return [{ id: found.id, trigger: 'plan_update', ruleId: 'EXTRA-SESSION', title, effect, why, priority: 2, proposal: { ...p, trigger: 'new_training_data' } }];
}
