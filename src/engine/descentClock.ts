// ASCEND: de afdaalklok (docs/beslissingen/2026-11-11-afdaalklok.md, onderzoek
// docs/onderzoek/Kansen 11 november training.md punt 1 en regels A1, A2 en A9 in
// docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md).
//
// Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierschade van de volgende
// (Maeo e.a. 2017, Byrnes e.a. 1985). De klok kijkt naar wat je echt deed, niet naar wat gepland stond:
// - DESCENT-CLOCK: 21 dagen of meer geen afdaling in je logs: één regel en een voorstel met Akkoord voor een
//   korte trapsessie op een vrije dag.
// - DESCENT-TAPER: begint een bergtocht over 8 tot 14 dagen en was er sinds dag -14 geen afdaling, dan een voorstel
//   voor één bekende afdaling tussen dag -14 en dag -7.
// - DESCENT-LATE: begint de tocht binnen 7 dagen, dan alleen een zin. Een nieuwe prikkel geeft dan spierpijn
//   op de tocht zelf (regel A9).
// De planning verandert nooit stil: alleen een voorstel, en zonder dagen die passen alleen een zin.
// Puur: geen React, geen opslag.

import type { Advice } from './adviceShared';
import type { TrainingGoal } from '../models/goals';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween, formatWeekdayDateNL, isoWeekday, mondayOfWeek, weekDates } from '../utils/dates';
import { makeId } from '../utils/id';
import { goalKindOf } from './goalLabels';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { leaveDays, lightDays } from './leave';
import { mainGoal, type Ladder } from './mainGoal';
import { MOUNTAIN_KINDS, hasMountainGoal } from './mountainMuscles';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { logSport } from './sports';
import { descentOf } from './standing';
import { hasRole, isTestOrRace } from './templateRoles';

// Een afdaling telt vanaf 100 m dalen. Maeo e.a. 2017 gaven de bescherming met ongeveer 110 m; regel A1 en de
// meter Afdalen vers (data/goalKinds.ts) rekenen met dezelfde 100 m.
export const DESCENT_MIN_M = 100;
// "Na 6 weken nog wel, na 9 weken niet meer" (Byrnes e.a. 1985): drie weken is de veilige eigen vertaling.
export const DESCENT_CLOCK_DAYS = 21;
// Regel A9: één bekende afdaling 7 tot 14 dagen voor vertrek, daarna niets nieuws.
export const TAPER_FAR_DAYS = 14;
export const TAPER_NEAR_DAYS = 7;
// Zo ver vooruit zoekt de klok een vrije dag.
const LOOK_AHEAD_DAYS = 7;
// Een test vraagt frisse benen: de drie dagen ervoor geen trapsessie (regel A2: minstens 3 dagen voor kwaliteit).
const TEST_CLEAR_DAYS = 3;

export const STAIRS_TEMPLATE_ID = 'tpl_stairs_down';
export const DESCENT_CLOCK_RULE = 'DESCENT-CLOCK';
export const DESCENT_TAPER_RULE = 'DESCENT-TAPER';
export const DESCENT_LATE_RULE = 'DESCENT-LATE';

// De instelling Afdaalklok. 'advies': aan bij een bergdoel of een bergtocht. Alles wat geen geldige keuze is
// (een oude back-up zonder het veld, een beschadigde waarde) leest als het advies.
export type DescentClockMode = 'advies' | 'altijd' | 'uit';
export function resolveDescentClock(value: unknown): DescentClockMode {
  return value === 'altijd' || value === 'uit' ? value : 'advies';
}

export interface DescentTrip {
  date: string; // de eerste dag
  name: string;
}

export interface DescentClockContext {
  // De tochten die nog komen, de vroegste eerst.
  trips: DescentTrip[];
}

const TRAIL_KIND = 'trail';

// Een tocht in de bergen die je zelf opzette: terrein berg of sneeuw.
const isMountainTrek = (p: LeavePeriod) => p.kind === 'trek' && (p.trek?.terrain === 'mountain' || p.trek?.terrain === 'snow');

// Staat de klok aan, en voor welke tochten. Zonder bergdoel of bergtocht gebeurt er bij het advies niets;
// 'altijd' laat de klok ook dan lopen (de regel van 21 dagen, zonder tochten is er geen afbouw).
export function descentClockContext(mode: unknown, goals: readonly TrainingGoal[], milestones: Ladder, leave: readonly LeavePeriod[] | undefined, today: string): DescentClockContext | undefined {
  const resolved = resolveDescentClock(mode);
  if (resolved === 'uit') return undefined;
  const main = mainGoal(goals, milestones, 'active');
  const goalTrips = goals
    .filter((g): g is TrainingGoal & { status: 'active'; targetDate: string } => g.status === 'active' && !!g.targetDate && g.targetDate >= today)
    .filter((g) => { const kind = goalKindOf(g); return kind ? MOUNTAIN_KINDS.has(kind) || kind === TRAIL_KIND : g.id === main?.id; })
    .map((g) => ({ date: g.targetDate, name: g.name }));
  const trekTrips = (leave ?? []).filter((p) => isMountainTrek(p) && p.startDate >= today).map((p) => ({ date: p.startDate, name: p.trek?.name || 'je tocht' }));
  const seen = new Set<string>();
  const trips = [...goalTrips, ...trekTrips].sort((a, b) => a.date.localeCompare(b.date)).filter((t) => (seen.has(t.date) ? false : (seen.add(t.date), true)));
  const mountain = hasMountainGoal(goals, milestones) || goals.some((g) => g.status === 'active' && goalKindOf(g) === TRAIL_KIND) || (leave ?? []).some((p) => isMountainTrek(p) && p.endDate >= today);
  if (resolved === 'advies' && !mountain) return undefined;
  // Zonder doel en zonder tocht gebeurt er niets, ook met Altijd (de instelling staat dan ook niet in beeld).
  if (!mountain && !goals.some((g) => g.status === 'active') && !(leave ?? []).some((q) => q.kind === 'trek' && q.endDate >= today)) return undefined;
  return { trips };
}

// Telt dit log als afdaling? 'yes': minstens 100 m dalen te voet, of de training is zelf een afdaaltraining
// (rol `descent`: de trapsessie, Heuvelsprints en afdalen). 'unknown': een wandeling zonder hoogtemeters, dus
// ASCEND weet het niet. 'no': al het andere. Fietsen telt niet (bergaf rollen is geen excentrisch werk), een
// loopband en een trapmachine ook niet (je klimt, je daalt niet). Een loop zonder hoogtemeters telt als vlak.
export function countsAsDescent(log: SessionLog, templateById: ReadonlyMap<string, SessionTemplate>): 'yes' | 'unknown' | 'no' {
  const template = templateById.get(log.templateId);
  if (template ? hasRole(template, 'descent') : hasRole({ id: log.templateId }, 'descent')) return 'yes';
  const sport = logSport(log);
  if (sport !== 'hiking' && sport !== 'running') return 'no';
  if (descentOf(log) >= DESCENT_MIN_M) return 'yes';
  const data = log.outdoorData ?? log.cardioData;
  const measured = data?.elevationLossM !== undefined || data?.elevationGainM !== undefined;
  if (sport === 'hiking' && !measured && data?.environment !== 'treadmill') return 'unknown';
  return 'no';
}

export interface DescentClockState {
  // De dag van je laatste afdaling (vandaag telt), en hoeveel dagen dat geleden is.
  last?: string;
  days?: number;
  // Zonder afdaling: de dag van je eerste log, waar de klok dan vanaf telt.
  since?: string;
  // Wandelingen zonder hoogtemeters na je laatste afdaling: daar weet ASCEND het niet van.
  unknown: string[];
}

// De stand van de klok op `today`. Logs van na vandaag tellen niet. Een eigen bergtocht die begonnen is telt als
// afdaling op zijn laatste dag (of vandaag): een meerdaagse tocht in de bergen zonder dalen bestaat niet.
export function descentClock(logs: readonly SessionLog[], templates: readonly SessionTemplate[], today: string, leave?: readonly LeavePeriod[]): DescentClockState {
  const byId = new Map(templates.map((t) => [t.id, t]));
  let last: string | undefined;
  let first: string | undefined;
  const maybe: string[] = [];
  for (const log of logs) {
    const date = log.completedDate;
    if (!date || date > today) continue;
    if (!first || date < first) first = date;
    const counts = countsAsDescent(log, byId);
    if (counts === 'yes' && (!last || date > last)) last = date;
    if (counts === 'unknown') maybe.push(date);
  }
  for (const p of leave ?? []) {
    if (!isMountainTrek(p) || p.startDate > today) continue;
    const date = p.endDate < today ? p.endDate : today;
    if (!last || date > last) last = date;
  }
  const unknown = [...new Set(maybe.filter((d) => !last || d > last))].sort();
  return last ? { last, days: daysBetween(last, today), unknown } : { since: first, unknown };
}

export interface DescentAdviceInput {
  today: string;
  logs: readonly SessionLog[];
  plannedSessions: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
  context: DescentClockContext | undefined;
  respondedIds: ReadonlySet<string>;
  leave?: LeavePeriod[];
  illnessEpisodes?: IllnessEpisode[];
  // Je vaste rustdag, 1 (maandag) tot 7 (zondag): daar komt niets.
  restDay?: number;
  // Dagen waar een ander voorstel van vandaag iets neerzet: de trapsessie komt daar niet op of naast.
  taken?: ReadonlySet<string>;
}

// De eerste vrije dag van `from` tot en met `until` waar een korte trapsessie past:
// - niets gepland en niet je vaste rustdag, geen vakantie zonder training, tocht, lichte dag of ziektedag;
// - 48 uur van een zware beendag (geen zware benen de dag ervoor of erna);
// - nooit naast een harde loop, en niet in de drie dagen voor een test of de week voor een wedstrijd of tocht;
// - de week houdt een dag zonder training;
// - niet op of naast een dag waar een ander voorstel iets neerzet.
export function findDescentDay(input: DescentAdviceInput, from: string, until: string, opts: { tripGuard: boolean }): string | undefined {
  const { today, plannedSessions, logs } = input;
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const standing = plannedSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= today && !logged.has(s.id));
  const templatesOn = (day: string): SessionTemplate[] => [
    ...standing.filter((s) => s.scheduledDate === day).map((s) => byId.get(s.templateId)),
    ...logs.filter((l) => l.completedDate === day).map((l) => byId.get(l.templateId)),
  ].filter((t): t is SessionTemplate => !!t);
  const busy = (day: string) => standing.some((s) => s.scheduledDate === day) || logs.some((l) => l.completedDate === day);
  const leave = leaveDays(input.leave);
  const light = lightDays(input.leave, leave);
  const trips = input.context?.trips ?? [];

  for (let day = from; day <= until; day = addDays(day, 1)) {
    if (busy(day) || (input.restDay && isoWeekday(day) === input.restDay)) continue;
    const kind = leave.get(day)?.kind;
    if (kind === 'off' || kind === 'trek' || light.has(day) || isIllnessDay(day, input.illnessEpisodes, today)) continue;
    const around = [...templatesOn(addDays(day, -1)), ...templatesOn(addDays(day, 1))];
    if (around.some((t) => isLegHeavyTemplate(t) || isHardRun(t))) continue;
    const ahead = (n: number) => Array.from({ length: n }, (_, i) => templatesOn(addDays(day, i + 1))).flat();
    if (ahead(TEST_CLEAR_DAYS).some((t) => isTestOrRace(t)) || ahead(TAPER_NEAR_DAYS).some((t) => hasRole(t, 'race'))) continue;
    if (opts.tripGuard && trips.some((t) => day <= t.date && daysBetween(day, t.date) < TAPER_NEAR_DAYS)) continue;
    if ([addDays(day, -1), day, addDays(day, 1)].some((d) => input.taken?.has(d))) continue;
    const week = weekDates(mondayOfWeek(day));
    if (!week.some((d) => d !== day && !busy(d))) continue;
    return day;
  }
  return undefined;
}

const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
const daysText = (n: number) => (n === 1 ? '1 dag' : `${n} dagen`);

const WHY = 'Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierschade van de volgende. In onderzoek was die bescherming er na drie en zes weken nog en na negen weken niet meer (Byrnes e.a. 1985). Vijf minuten bergaf was genoeg om het krachtverlies na een lange afdaling een week later te halveren (Maeo e.a. 2017). Drie weken is een veilige eigen grens. Een afdaling telt bij 100 meter dalen of meer in een wandeling of loop, of als de training zelf een afdaaltraining is. ASCEND kiest een vrije dag met 48 uur tot je zware beendagen en niet naast een harde loop. Zonder Akkoord verandert er niets.';
const WHY_TAPER = 'Eén korte afdaling 7 tot 14 dagen voor vertrek houdt de bescherming van je bovenbenen vers voor de eerste dagen van je tocht (afgeleid uit Maeo e.a. 2017 en Byrnes e.a. 1985). In de laatste week doe je niets nieuws meer: een nieuwe prikkel geeft dan spierpijn op de tocht zelf. Bij bergwandelaars die vielen gebeurde drie kwart van de valpartijen bergaf (Faulhaber e.a. 2020). Zonder Akkoord verandert er niets.';

function addProposal(title: string, day: string, template: SessionTemplate, reason: string, rule: string, why: string): PlanChangeProposal {
  const item: PlanChangeItem = {
    action: 'add', newSessionDraft: { templateId: template.id, scheduledDate: day, weekStartDate: mondayOfWeek(day) },
    reason, generatedBy: ['engine/descentClock.ts', rule],
  };
  return {
    id: makeId('planchange'), trigger: 'new_training_data', issue: title, changes: [item], alternatives: [],
    consequences: `${template.name} staat op ${formatWeekdayDateNL(day)}.`, explanation: why, createdAt: new Date().toISOString(),
  };
}

// De regel en het voorstel van de afdaalklok. Hoogstens één advies: de afbouw voor een tocht gaat voor de 21 dagen.
export function descentAdvice(input: DescentAdviceInput): Advice[] {
  const { today, context } = input;
  if (!context) return [];
  const template = input.templates.find((t) => t.id === STAIRS_TEMPLATE_ID);
  if (!template) return [];
  // Ziek, of net beter: eerst herstellen. Op vakantie zonder training: stil tot je terug bent.
  if (activeIllness(input.illnessEpisodes) || recoveryRamp(input.illnessEpisodes, today)) return [];
  if (leaveDays(input.leave).get(today)?.kind === 'off') return [];

  const clock = descentClock(input.logs, input.templates, today, input.leave);
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  // Een afdaaltraining die al klaarstaat: dan hoeft er geen voorstel bij.
  const plannedDescent = (from: string, until: string) => input.plannedSessions.some((s) => {
    const t = byId.get(s.templateId);
    return s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= from && s.scheduledDate <= until && !!t && hasRole(t, 'descent');
  });
  const minutes = template.durationVariants.full;
  const lastText = clock.last ? `Je laatste afdaling was ${formatWeekdayDateNL(clock.last)}.` : 'ASCEND ziet nog geen afdaling in je logs.';
  // Eerlijk over wat ASCEND niet weet: een wandeling zonder hoogtemeters kan een afdaling hebben gehad.
  const doubt = clock.unknown.length > 0
    ? ` Je wandeling van ${formatWeekdayDateNL(clock.unknown.at(-1)!)} heeft geen hoogtemeters, dus of je daar afdaalde weet ASCEND niet.`
    : '';

  // --- De afbouw voor een tocht -------------------------------------------------
  const trip = context.trips.find((t) => t.date > today && daysBetween(today, t.date) <= TAPER_FAR_DAYS);
  if (trip) {
    const farDay = addDays(trip.date, -TAPER_FAR_DAYS);
    const nearDay = addDays(trip.date, -TAPER_NEAR_DAYS);
    const freshEnough = !!clock.last && clock.last >= farDay;
    if (freshEnough) return [];
    const toGo = daysBetween(today, trip.date);
    if (toGo <= TAPER_NEAR_DAYS) {
      // Te laat: geen voorstel, alleen een zin (regel A9: geen nieuwe prikkel in de laatste week).
      const id = `descent-late:${trip.date}`;
      if (input.respondedIds.has(id)) return [];
      const title = 'Te laat voor een afdaalprikkel';
      const lead = `${capital(trip.name)} begint over ${daysText(toGo)}. Een nieuwe afdaalprikkel geeft nu spierpijn op de tocht zelf.`;
      const effect = `${lead} ${lastText}${doubt} Begin je eerste afdaling rustig: kleine passen, knieën licht gebogen, stokken als je ze hebt.`;
      return [{ id, trigger: 'plan_update', ruleId: DESCENT_LATE_RULE, title, effect, lead, brief: `${capital(trip.name)} over ${daysText(toGo)}, geen verse afdaling`, why: WHY_TAPER, priority: 2 }];
    }
    const id = `descent-taper:${trip.date}`;
    if (input.respondedIds.has(id) || plannedDescent(today, nearDay)) return [];
    const from = addDays(today, 1) > farDay ? addDays(today, 1) : farDay;
    const day = findDescentDay(input, from, nearDay, { tripGuard: false });
    const title = `Nog één bekende afdaling voor ${trip.name}`;
    const fact = `${capital(trip.name)} begint over ${daysText(toGo)}. ${lastText}${doubt}`;
    if (!day) {
      const lead = `${fact} Tot ${formatWeekdayDateNL(nearDay)} is er geen vrije dag die past.`;
      const effect = `${lead} Neem voor die dag in een wandeling of loop een trap of helling mee naar beneden die je kent. Daarna niets nieuws meer voor je benen.`;
      return [{ id, trigger: 'plan_update', ruleId: DESCENT_TAPER_RULE, title, effect, lead, brief: `Nog één afdaling voor ${trip.name}`, why: WHY_TAPER, priority: 2 }];
    }
    const when = formatWeekdayDateNL(day);
    const lead = `${fact} Doe op ${when} nog één afdaling die je kent.`;
    const effect = `Met Akkoord staat ${template.name} (${minutes} minuten) op ${when}. Kies een trap of helling die je kent, en doe daarna niets nieuws meer voor je benen. Met Liever niet blijft je week zoals hij is en vraagt ASCEND er voor deze tocht niet meer naar.`;
    const proposal = addProposal(title, day, template, 'Eén bekende afdaling voor je tocht, zodat je benen beschermd zijn.', DESCENT_TAPER_RULE, WHY_TAPER);
    return [{ id, trigger: 'plan_update', ruleId: DESCENT_TAPER_RULE, title, effect, lead, brief: `Nog één afdaling voor ${trip.name}`, why: WHY_TAPER, priority: 2, proposal }];
  }

  // --- De klok van 21 dagen -----------------------------------------------------
  // Zonder afdaling telt de klok vanaf je eerste log; zonder logs weet ASCEND niets en zegt het niets.
  const start = clock.last ?? clock.since;
  if (!start) return [];
  const days = daysBetween(start, today);
  if (days < DESCENT_CLOCK_DAYS) return [];
  // Liever niet geldt voor dit blok van drie weken: op dag 42 vraagt de klok het opnieuw.
  const id = `descent:${start}:${Math.floor(days / DESCENT_CLOCK_DAYS)}`;
  if (input.respondedIds.has(id)) return [];
  const until = addDays(today, LOOK_AHEAD_DAYS);
  if (plannedDescent(today, until)) return [];
  const title = clock.last ? `Al ${days} dagen geen afdaling` : 'Nog geen afdaling in je logs';
  const brief = clock.last ? `${days} dagen geen afdaling` : 'Nog geen afdaling gelogd';
  const fact = clock.last ? `${lastText}${doubt}` : `ASCEND ziet in ${days} dagen geen afdaling in je logs.${doubt}`;
  const day = findDescentDay(input, addDays(today, 1), until, { tripGuard: true });
  if (!day) {
    const lead = `${fact} Deze week is er geen vrije dag die past.`;
    const effect = `${lead} Neem in je volgende wandeling of loop een trap of helling mee naar beneden: tien minuten rustig dalen is genoeg.`;
    return [{ id, trigger: 'plan_update', ruleId: DESCENT_CLOCK_RULE, title, effect, lead, brief, why: WHY, priority: 2 }];
  }
  const when = formatWeekdayDateNL(day);
  const lead = `${fact} Een korte trapsessie op ${when} houdt je benen beschermd.`;
  const effect = `Met Akkoord staat ${template.name} (${minutes} minuten) op ${when}, een vrije dag. Met Liever niet blijft je week zoals hij is en vraagt ASCEND het pas over drie weken weer.`;
  const proposal = addProposal(title, day, template, 'Een korte afdaalprikkel: je laatste afdaling is drie weken of langer geleden.', DESCENT_CLOCK_RULE, WHY);
  return [{ id, trigger: 'plan_update', ruleId: DESCENT_CLOCK_RULE, title, effect, lead, brief, why: WHY, priority: 2, proposal }];
}
