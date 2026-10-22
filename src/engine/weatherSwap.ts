// ASCEND: rule WEATHER-SWAP, advice from the weather.
//
// Trigger: an outdoor training this week (a run, a walk with the rucksack, a
// hike, a ride) lands in weather that is bad in the hours you usually train
// (engine/weather.ts: thunder, ice, storm, heavy rain, extreme heat or cold).
// Rule: if another day of the same week has better weather and the training
// fits there by the rules that always apply (time on the day, 48 hours between
// heavy work for the same muscles, never on a holiday day), propose moving it.
// If no free day works, a swap with a training that does not care about the
// weather (strength) is proposed instead.
//
// Always a proposal with Akkoord, through the same advice route and the same
// preview ("Zo ziet je week eruit") as every other plan change; nothing moves
// by itself. "Liever niet" is remembered per training (the id carries the
// planned session), so ASCEND does not ask again for it. A training that was
// moved once for the weather is not moved a second time for it. A training you
// pinned yourself (lock) is neither moved nor swapped, as with every other plan change.

import type { Advice, AdviceInputs, AdviceOption } from './adviceEngine';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { activeIllness, recoveryRamp } from './illness';
import { leaveLabelOn } from './leave';
import { RACE_TEMPLATE_ID } from './raceBlock';
import { respectsHeavySpacing, dayHasRoomFor } from './scheduler';
import { lockLevel } from './weekValidator';
import { isTemplatePlannable } from './sports';
import { resolveEffectiveFullDuration } from './substitutions';
import { VERDICT_RANK, isWeatherSensitive, sessionWeather, usualStartHour, verdictLine, type SessionWeather } from './weather';
import { addDays, daysBetween, formatDateNL, weekDates, weekdayLongNL } from '../utils/dates';
import { makeId } from '../utils/id';

const MAX_OPTIONS = 3;
// A forecast further than three days ahead changes too often to move a
// training for: the proposal comes when the day is this close, not before.
export const WEATHER_SWAP_HORIZON_DAYS = 3;
const RULE_ID = 'WEATHER-SWAP';
const GENERATED_BY = ['engine/weatherSwap.ts', RULE_ID];

function shortDate(iso: string): string {
  return `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

interface Candidate {
  date: string;
  weather: SessionWeather;
  // A training that goes the other way, when this is a swap.
  partner?: { session: PlannedSession; template: SessionTemplate };
}

export function weatherAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const wx = inputs.weather;
  if (!wx) return [];
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const leavePeriods = wx.leave;
  const logged = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const open = (s: PlannedSession) => s.status !== 'skipped' && !logged.has(s.id);
  // Only what the system planned itself may move (lock level 3), as in leaveProposal.ts:
  // a training you pinned (your own move or skip, an accepted proposal) stays where it is.
  const free = (s: PlannedSession) => lockLevel(s, logged, inputs.asOf) === 3;

  const weatherOf = (template: SessionTemplate, date: string, session?: PlannedSession): SessionWeather | undefined =>
    sessionWeather({
      forecast: wx.forecast,
      date,
      startHour: usualStartHour(template, inputs.logs, date).hour,
      durationMinutes: session?.plannedMinutes ?? resolveEffectiveFullDuration(template, date, inputs.program),
      now: wx.now,
    });

  // What counts for the 48-hour rule: everything still to come, and what was done.
  const withLoad = (excluding: Set<string>) => inputs.plannedSessions.filter((s) => !excluding.has(s.id) && s.status !== 'skipped' && (s.scheduledDate >= inputs.asOf || logged.has(s.id)));
  const weekOthers = (weekStart: string, excluding: Set<string>) => inputs.plannedSessions.filter((s) => s.weekStartDate === weekStart && !excluding.has(s.id) && s.status !== 'skipped');
  const freeOfLeave = (date: string) => {
    const kind = leaveLabelOn(date, leavePeriods)?.kind;
    return kind !== 'off' && kind !== 'trek';
  };

  const subjects = inputs.plannedSessions
    .filter((s) => open(s) && s.scheduledDate >= inputs.asOf && s.scheduledDate <= addDays(inputs.asOf, WEATHER_SWAP_HORIZON_DAYS) && !s.leave && s.templateId !== RACE_TEMPLATE_ID && free(s))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);

  const out: Advice[] = [];
  const touched = new Set<string>(); // sessions already in another proposal of this run
  const takenDates = new Set<string>(); // days another proposal of this run moves onto

  for (const session of subjects) {
    if (touched.has(session.id) || inputs.respondedIds.has(`weather:${session.id}`)) continue;
    const template = templateById.get(session.templateId);
    if (!template || !isWeatherSensitive(template) || !isTemplatePlannable(template, inputs.enabledSports)) continue;
    const now = weatherOf(template, session.scheduledDate, session);
    if (!now || now.verdict !== 'slecht') continue;

    // Free days first: better weather, and the training fits by the usual rules.
    const candidates: Candidate[] = [];
    const without = new Set([session.id]);
    for (const date of weekDates(session.weekStartDate)) {
      if (date < inputs.asOf || date === session.scheduledDate || takenDates.has(date) || !freeOfLeave(date)) continue;
      const weather = weatherOf(template, date, session);
      if (!weather || VERDICT_RANK[weather.verdict] >= VERDICT_RANK[now.verdict]) continue;
      if (!dayHasRoomFor(date, template, weekOthers(session.weekStartDate, without), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) continue;
      if (!respectsHeavySpacing(date, template, withLoad(without), templateById, inputs.logs, session.id)) continue;
      candidates.push({ date, weather });
    }

    // No free day: swap with a training that does not mind the weather.
    if (candidates.length === 0) {
      for (const date of weekDates(session.weekStartDate)) {
        if (date < inputs.asOf || date === session.scheduledDate || takenDates.has(date) || !freeOfLeave(date)) continue;
        const weather = weatherOf(template, date, session);
        if (!weather || VERDICT_RANK[weather.verdict] >= VERDICT_RANK[now.verdict]) continue;
        const there = inputs.plannedSessions.filter((s) => s.scheduledDate === date && open(s));
        if (there.length !== 1 || touched.has(there[0].id)) continue;
        const partner = there[0];
        const partnerTemplate = templateById.get(partner.templateId);
        if (!partnerTemplate || isWeatherSensitive(partnerTemplate) || partnerTemplate.type === 'recovery' || partner.templateId === RACE_TEMPLATE_ID || partner.leave || !free(partner)) continue;
        const both = new Set([session.id, partner.id]);
        if (!dayHasRoomFor(date, template, weekOthers(session.weekStartDate, both), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) continue;
        if (!dayHasRoomFor(session.scheduledDate, partnerTemplate, weekOthers(session.weekStartDate, both), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) continue;
        // Each at its new day, with the other one out of the way.
        const rest = withLoad(both);
        if (!respectsHeavySpacing(date, template, rest, templateById, inputs.logs, session.id)) continue;
        if (!respectsHeavySpacing(session.scheduledDate, partnerTemplate, rest, templateById, inputs.logs, partner.id)) continue;
        candidates.push({ date, weather, partner: { session: partner, template: partnerTemplate } });
      }
    }
    if (candidates.length === 0) continue;

    // Best weather first, then the nearest day.
    const away = (c: Candidate) => Math.abs(daysBetween(session.scheduledDate, c.date));
    candidates.sort((a, b) => VERDICT_RANK[a.weather.verdict] - VERDICT_RANK[b.weather.verdict] || away(a) - away(b) || a.date.localeCompare(b.date));
    const top = candidates.slice(0, MAX_OPTIONS);

    const title = `${capital(weekdayLongNL(session.scheduledDate))}: ${now.bad.join(' en ')} bij ${template.name}`;
    const why = 'ASCEND kijkt naar het weer in de uren waarin je gewoonlijk traint: de tijd van je eerdere trainingen van dezelfde soort, anders 18.00 uur op werkdagen en 10.00 uur in het weekend. Slecht is onweer, ijzel, storm, zware regen, extreme hitte of strenge kou; dat is geen weer om buiten hard te werken of ver van huis te zijn. Dat doet ASCEND alleen voor de komende drie dagen, want een verwachting verder vooruit wisselt te vaak. Voorgesteld wordt alleen een dag in dezelfde week met beter weer waarop de training past volgens de gewone regels: genoeg tijd op die dag en genoeg rust tussen zware trainingen voor dezelfde spieren. Er verschuift niets zonder jouw Akkoord. Met Liever niet blijft de training staan en vraagt ASCEND er niet meer naar. Weergegevens van Open-Meteo.com.';

    const options: AdviceOption[] = top.map((c) => {
      const items: PlanChangeItem[] = [
        { plannedSessionId: session.id, action: 'move', fromDate: session.scheduledDate, toDate: c.date, reason: `Slecht weer op ${shortDate(session.scheduledDate)} (${now.bad.join(', ')}); ${shortDate(c.date)} is het beter.`, generatedBy: GENERATED_BY },
      ];
      if (c.partner) {
        items.push({ plannedSessionId: c.partner.session.id, action: 'move', fromDate: c.date, toDate: session.scheduledDate, reason: `Wisselt mee, zodat ${template.name} op de dag met beter weer kan.`, generatedBy: GENERATED_BY });
      }
      const nowLine = `${capital(weekdayLongNL(session.scheduledDate))} om ongeveer ${now.startHour}.00 uur: ${now.line}.`;
      const betterLine = `${capital(weekdayLongNL(c.date))}: ${c.weather.line}.`;
      const move = c.partner
        ? `${template.name} naar ${shortDate(c.date)} en ${c.partner.template.name} naar ${shortDate(session.scheduledDate)}.`
        : `${template.name} naar ${shortDate(c.date)}.`;
      const effect = `${verdictLine(now)}. ${nowLine} ${betterLine} Voorstel: ${move}`;
      const proposal: PlanChangeProposal = {
        id: makeId('planchange'),
        trigger: 'session_moved',
        issue: title,
        changes: items,
        alternatives: [],
        consequences: move,
        explanation: why,
        createdAt: new Date().toISOString(),
      };
      return { label: `${template.name} naar ${shortDate(c.date)}`, effect, proposal };
    });

    const first = options[0];
    out.push({
      id: `weather:${session.id}`,
      trigger: 'plan_update',
      ruleId: RULE_ID,
      title,
      effect: first.effect,
      why,
      priority: 3,
      proposal: first.proposal,
      options: options.length > 1 ? options : undefined,
    });
    touched.add(session.id);
    // The first option is the proposal itself; the next advice keeps off its day.
    takenDates.add(top[0].date);
    if (top[0].partner) touched.add(top[0].partner.session.id);
    // One at a time keeps the screen calm.
    if (out.length >= 2) break;
  }
  return out;
}
