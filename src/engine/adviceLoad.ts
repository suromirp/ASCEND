// Regels voor belasting en spreiding: te zwaar, te licht, blessure aan de
// benen, regelmaat van kracht en dezelfde spieren te dicht op elkaar.

import type { SessionLog, SessionTemplate } from '../models/training';
import { isSoreness } from './injuryKind';
import { isIllnessDay } from './illness';
import { dayHasRoomFor, isLegHeavyTemplate, isIntentionalBackToBack, heavyAxes, HEAVY_AXIS_LABEL, legHeavyDayBefore, legSpacingDays } from './scheduler';
import { addDays, daysBetween, mondayOfWeek, weekDates, formatWeekdayDateNL } from '../utils/dates';
import { plannedRpeTop, EASY_RPE_TOP } from './coach';
import { LEG_BODY_PARTS } from './legSpots';
import { type AdviceInputs, type Advice, LOAD_SPORT_TYPES, catchUpDates, moveOptions, inProgram, isDone, proposal } from './adviceShared';
import { legCardSessionOf } from './adviceMorning';

// --- Rule HARD-THEN-SPACE ----------------------------------------------------
// Trigger: a run/ride/hike in the last 2 days logged at RPE 8+ or as
// "zwaarder dan normaal". Rule: the next leg-heavy session within a day of
// it gets one extra day, if there's room; otherwise keep it easy.
export function tooHardAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const recent = inputs.logs
    .filter((l) => LOAD_SPORT_TYPES.has(l.type) && daysBetween(l.completedDate, inputs.asOf) <= 1 && daysBetween(l.completedDate, inputs.asOf) >= 0)
    .filter((l) => (l.rpe ?? 0) >= 8 || l.subjectiveFeel === 'worse')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (!recent) return [];
  const loggedName = templateById.get(recent.templateId)?.name ?? 'Je sessie';
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const next = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= inputs.asOf && daysBetween(recent.completedDate, s.scheduledDate) <= 1)
    .find((s) => { const t = templateById.get(s.templateId); return t ? isLegHeavyTemplate(t) : false; });
  const signal = recent.rpe !== undefined && recent.rpe >= 8 ? `zwaarte ${recent.rpe} van 10` : 'zwaarder dan normaal';
  // Eén woord voor het oordeel: "was zwaar (zwaarte 8 van 10)" of "voelde zwaarder dan normaal", niet allebei.
  const hardWas = (who: string) => (recent.rpe !== undefined && recent.rpe >= 8 ? `${who} was zwaar (${signal})` : `${who} voelde zwaarder dan normaal`);
  const rule = 'Na een zware training krijgt de eerstvolgende zware beendag een dag extra herstel, als daar plek voor is.';
  const base = { trigger: 'session_too_hard' as const, ruleId: 'HARD-THEN-SPACE', title: hardWas(loggedName), relatedLogId: recent.id, priority: 4 };
  if (!next) {
    return [{ ...base, id: `hard:${recent.id}`, effect: 'Er staat morgen geen zware beensessie, dus er hoeft niets te schuiven. Houd het de komende dag rustig.', why: `${hardWas('Je laatste training')}. ${rule}`, priority: 1 }];
  }
  // Staat de kaart Benen (LEG-EASE) vandaag al voor deze training, dan biedt die het verplaatsen aan, met de
  // beenindex erbij; een tweede voorstel voor dezelfde training zou ernaast staan. Laat de kaart het zien
  // omdat je benen fris genoeg zijn, dan hoeft er ook niets te schuiven.
  if (next.scheduledDate === inputs.asOf && legCardSessionOf(inputs)?.id === next.id) return [];
  const nextTemplate = templateById.get(next.templateId)!;
  const laterDates = catchUpDates(next, nextTemplate, inputs, templateById, addDays(next.scheduledDate, 1));
  const later = laterDates[0];
  if (!later) {
    return [{ ...base, id: `hard:${recent.id}`, effect: `${nextTemplate.name} op ${formatWeekdayDateNL(next.scheduledDate)} rustig houden (RPE 3-4); er is geen latere plek deze week.`, why: `${hardWas('Je laatste training')}. ${rule}` }];
  }
  const hardEffect = (d: string) => `${nextTemplate.name} naar ${formatWeekdayDateNL(d)}.`;
  const moved = moveOptions(base.title, { plannedSessionId: next.id, action: 'move', fromDate: next.scheduledDate, toDate: later, reason: `Extra herstel na ${loggedName} (${signal}).`, generatedBy: ['engine/adviceEngine.ts', 'HARD-THEN-SPACE'] }, laterDates, nextTemplate.name, rule, hardEffect);
  return [{
    ...base,
    id: `hard:${recent.id}`,
    effect: hardEffect(later),
    why: `${hardWas('Je laatste training')}. ${rule}`,
    ...moved,
  }];
}

// --- Rule LIGHT-TWICE --------------------------------------------------------
// Trigger: the same run/ride/hike logged twice in a row at RPE 3 or
// lower. Rule: no manual action; the weekly planning raises load only
// when a goal asks for it and recovery is good. Effect: a hint.
export function tooLightAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const byTemplate = new Map<string, SessionLog[]>();
  for (const l of inputs.logs) {
    if (!LOAD_SPORT_TYPES.has(l.type) || daysBetween(l.completedDate, inputs.asOf) > 14) continue;
    byTemplate.set(l.templateId, [...(byTemplate.get(l.templateId) ?? []), l]);
  }
  const advice: Advice[] = [];
  for (const [templateId, logs] of byTemplate) {
    const lastTwo = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 2);
    // An easy session (planned at most RPE 4: easy run, long run) is meant
    // to feel light; that's no sign it could be more (production feedback:
    // "lange duurloop voelde twee keer licht" after a zone 2 long run).
    const template = templateById.get(templateId);
    const top = template ? plannedRpeTop(template, lastTwo[0]?.completedDate ?? inputs.asOf, inputs.program) : undefined;
    if (top !== undefined && top <= EASY_RPE_TOP) continue;
    if (lastTwo.length < 2 || !lastTwo.every((l) => l.rpe !== undefined && l.rpe <= 3)) continue;
    const name = template?.name ?? 'Deze sessie';
    advice.push({
      id: `light:${lastTwo[0].id}`,
      trigger: 'session_too_light',
      ruleId: 'LIGHT-TWICE',
      title: `${name} voelde twee keer licht`,
      effect: 'Je hoeft niets te doen. Blijft je herstel goed, dan vraagt de weekplanning vanzelf iets meer zodra je doel dat nodig heeft.',
      why: 'Deze training voelde twee keer op rij heel licht (zwaarte 3 of lager). ASCEND verzwaart alleen via de weekplanning, stap voor stap, nooit na één losse training.',
      priority: 1,
      relatedLogId: lastTwo[0].id,
    });
  }
  return advice;
}

// --- Rule INJURY-LEGS ---------------------------------------------------------
// Trigger: an open pain (soreness and stiffness never block) on a leg area noted in the last 14 days. Rule:
// ASCEND adds nothing heavy for the legs; the user picks the short variant
// or skips. Effect: a hint naming this week's leg-heavy sessions.
export function injuryAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const leg = inputs.injuries.find((i) => !i.resolvedDate && !isSoreness(i) && daysBetween(i.date, inputs.asOf) <= 14 && LEG_BODY_PARTS.some((p) => i.bodyPart.toLowerCase().includes(p)));
  if (!leg) return [];
  const upcoming = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && s.scheduledDate >= inputs.asOf && daysBetween(inputs.asOf, s.scheduledDate) <= 6)
    .filter((s) => { const t = templateById.get(s.templateId); return t ? isLegHeavyTemplate(t) : false; })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((s) => `${templateById.get(s.templateId)?.name} (${formatWeekdayDateNL(s.scheduledDate)})`);
  return [{
    id: `injury:${leg.id}`,
    trigger: 'injury_active',
    ruleId: 'INJURY-LEGS',
    title: `Blessure: ${leg.bodyPart.toLowerCase()}`,
    effect: upcoming.length > 0
      ? `Zware beensessies de komende week: ${upcoming.join(', ')}. Kies de korte variant of sla over als het niet goed voelt.`
      : 'Er staan de komende week geen zware beensessies. Houd het zo tot het beter voelt.',
    why: 'Je hebt een blessure aan been of voet genoteerd. ASCEND plant er niets zwaars bij. Jij bepaalt per training of het gaat.',
    priority: leg.severity === 'ernstig' ? 6 : 5,
  }];
}

// --- Rule STRENGTH-REGULARITY -------------------------------------------------
// Trigger: over the last 14 days, two or more planned strength sessions
// without a log. Rule: ASCEND only watches whether strength happens —
// loads and progression stay in MacroFactor. Effect: a hint.
export function strengthAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const window = inputs.plannedSessions.filter((s) => {
    const t = templateById.get(s.templateId);
    return t?.type === 'strength' && s.status !== 'skipped' && inProgram(s, inputs.program) && s.scheduledDate < inputs.asOf && daysBetween(s.scheduledDate, inputs.asOf) <= 14
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, inputs.asOf);
  });
  const done = window.filter((s) => isDone(s, inputs.logs, loggedIds)).length;
  const missed = window.length - done;
  if (window.length === 0 || missed < 2) return [];
  return [{
    id: `strength:${mondayOfWeek(inputs.asOf)}`, // at most once a week
    trigger: 'strength_irregular',
    ruleId: 'STRENGTH-REGULARITY',
    title: `Kracht: ${done} van ${window.length} trainingen afgevinkt`,
    effect: 'Past het huidige krachtblok nog bij je week? Minder sessies die je echt doet is beter dan meer die je mist. Je kunt het blok aanpassen op de ASCEND-pagina.',
    why: 'Twee of meer krachttrainingen zijn in de laatste 14 dagen niet afgevinkt. ASCEND kijkt bij kracht alleen naar regelmaat. Gewichten en progressie blijven in MacroFactor.',
    priority: 2,
  }];
}

// --- Rule SAME-MUSCLE-SPACING ------------------------------------------------
// Trigger: in the coming week, two sessions that load the SAME muscles
// heavily (both heavy for the upper body, or both heavy for the legs) sit
// on consecutive days — e.g. Bovenlichaam A and Bovenlichaam B, both chest/back/
// shoulders. A pairing the program marks as intentional (hill intervals +
// long run: running the long one on tired legs is the point) is left alone.
// Rule: heavy work for the same muscles ~48 hours apart, the same spacing
// ASCEND already keeps between two heavy leg days. Effect: move the later
// one to the nearest day in its week that keeps 48 hours from every other
// heavy session for those muscles and has room — or, if there is none,
// advise to keep it lighter.
export function spacingAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>): Advice[] {
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const upcoming = inputs.plannedSessions
    .filter((s) => s.status !== 'skipped' && !loggedIds.has(s.id) && s.scheduledDate >= inputs.asOf && daysBetween(inputs.asOf, s.scheduledDate) <= 7)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const advice: Advice[] = [];
  const handled = new Set<string>();

  for (const a of upcoming) {
    for (const b of upcoming) {
      if (daysBetween(a.scheduledDate, b.scheduledDate) !== 1 || handled.has(b.id)) continue;
      const ta = templateById.get(a.templateId);
      const tb = templateById.get(b.templateId);
      if (!ta || !tb || isIntentionalBackToBack(ta, tb)) continue;
      const shared = heavyAxes(ta).filter((axis) => heavyAxes(tb).includes(axis));
      if (shared.length === 0) continue;
      // Dezelfde regel als de planning en de weekcontrole (scheduler.ts#legSpacingDays): beenkracht de dag
      // na de lange duurloop alleen met de instelling, en niet als de dag ervoor al beenzwaar is.
      if (shared.every((axis) => axis === 'lowerBodyLoad') && legSpacingDays(ta, tb) === 0 && !legHeavyDayBefore(a.scheduledDate, inputs.plannedSessions, templateById, [a.id, b.id])) continue;
      handled.add(b.id);

      const week = inputs.plannedSessions.filter((s) => s.weekStartDate === b.weekStartDate && s.id !== b.id && s.status !== 'skipped');
      const keepsSpacing = (date: string) => week.every((other) => {
        const t = templateById.get(other.templateId);
        if (!t || !heavyAxes(t).some((axis) => shared.includes(axis) || heavyAxes(tb).includes(axis))) return true;
        return Math.abs(daysBetween(other.scheduledDate, date)) >= 2;
      });
      const candidates = weekDates(b.weekStartDate)
        .filter((d) => d >= inputs.asOf && d !== b.scheduledDate && keepsSpacing(d)
          && dayHasRoomFor(d, tb, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference))
        .sort((x, y) => Math.abs(daysBetween(b.scheduledDate, x)) - Math.abs(daysBetween(b.scheduledDate, y)));
      const muscles = shared.map((axis) => HEAVY_AXIS_LABEL[axis]).join(' en ');
      const title = `${ta.name} en ${tb.name} op twee dagen achter elkaar`;
      const why = `Er staan twee zware trainingen voor ${muscles} op opeenvolgende dagen. Zware training voor dezelfde spieren hoort ongeveer 48 uur uit elkaar te liggen, zodat ze kunnen herstellen.`;
      const target = candidates[0];
      if (!target) {
        advice.push({ id: `spacing:${b.id}:${b.scheduledDate}`, trigger: 'same_muscles_back_to_back', ruleId: 'SAME-MUSCLE-SPACING', title, effect: `Er is deze week geen dag met 48 uur ertussen. Houd ${tb.name} op ${formatWeekdayDateNL(b.scheduledDate)} lichter, of kies de korte variant.`, why, priority: 3 });
        continue;
      }
      advice.push({
        id: `spacing:${b.id}:${b.scheduledDate}`,
        trigger: 'same_muscles_back_to_back',
        ruleId: 'SAME-MUSCLE-SPACING',
        title,
        effect: `${tb.name} naar ${formatWeekdayDateNL(target)}, zodat er 48 uur tussen zit.`,
        why,
        priority: 3,
        proposal: proposal(title, [{ plannedSessionId: b.id, action: 'move', fromDate: b.scheduledDate, toDate: target, reason: `48 uur tussen zware training voor hetzelfde ${muscles}.`, generatedBy: ['engine/adviceEngine.ts', 'SAME-MUSCLE-SPACING'] }], `${tb.name} schuift naar ${formatWeekdayDateNL(target)}.`, why),
      });
    }
  }
  return advice;
}
