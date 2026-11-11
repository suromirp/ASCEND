// ASCEND: de afdaalklok (docs/beslissingen/2026-11-11-afdaalklok.md, onderzoek
// docs/onderzoek/Kansen 11 november training.md punt 1 en regels A1, A2 en A9 in
// docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md).
//
// Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierschade van de volgende
// (Maeo e.a. 2017, Byrnes e.a. 1985). De klok kijkt naar wat je echt deed, niet naar wat gepland stond:
// - DESCENT-CLOCK: 21 dagen of meer geen afdaling in je logs: één regel en een voorstel met Akkoord voor een
//   korte trapsessie op een vrije dag, of anders na een herstelwandeling of een rustige loop op dezelfde dag.
// - DESCENT-TAPER: begint een bergtocht over 7 tot 14 dagen en was er sinds dag -14 geen afdaling, dan een voorstel
//   voor één bekende afdaling tussen dag -14 en dag -7. Op dag -7 zelf: geen voorstel meer, wel wat vandaag nog kan.
// - DESCENT-LATE: begint de tocht over minder dan 7 dagen, dan alleen een zin. Een nieuwe prikkel geeft dan
//   spierpijn op de tocht zelf (regel A9).
// De planning verandert nooit stil: alleen een voorstel, en zonder dagen die passen alleen een zin.
// Puur: geen React, geen opslag.

import type { Advice } from './adviceShared';
import type { TrainingGoal } from '../models/goals';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { addDays, daysBetween, formatWeekdayDateNL, isoWeekday, localDateOf, mondayOfWeek, weekDates, weekdayOf } from '../utils/dates';
import { makeId } from '../utils/id';
import { goalKindOf } from './goalLabels';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { leaveDays, lightDays } from './leave';
import { mainGoal, type Ladder } from './mainGoal';
import { MOUNTAIN_KINDS, hasMountainGoal } from './mountainMuscles';
import { isKeyFor, type KeyFocus } from './keySession';
import { dayHasRoomFor, isHardRun, isLegHeavyTemplate } from './scheduler';
import { logSport, templateSport } from './sports';
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
// Na Liever niet of Begrepen blijft de klok zo lang stil, geteld vanaf de dag van je antwoord. De zin in het
// voorstel en het id rekenen met dit ene getal.
export const DECLINE_QUIET_DAYS = 21;

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
// (rol `descent`: de trapsessie, Heuvelsprints en afdalen). 'unknown': een wandeling zonder hoogtemeters of met een geschatte hoogte, dus
// ASCEND weet het niet. 'no': al het andere. Fietsen telt niet (bergaf rollen is geen excentrisch werk), een
// loopband en een trapmachine ook niet (je klimt, je daalt niet). Een loop zonder hoogtemeters telt als vlak.
export function countsAsDescent(log: SessionLog, templateById: ReadonlyMap<string, SessionTemplate>): 'yes' | 'unknown' | 'no' {
  const template = templateById.get(log.templateId);
  if (template ? hasRole(template, 'descent') : hasRole({ id: log.templateId }, 'descent')) return 'yes';
  const sport = logSport(log);
  if (sport !== 'hiking' && sport !== 'running') return 'no';
  if (descentOf(log) >= DESCENT_MIN_M) return 'yes';
  const data = log.outdoorData ?? log.cardioData;
  // Een geschatte hoogte is geen meting: dan weet ASCEND het net zo min als zonder getal.
  const measured = !data?.estimatedElevation && (data?.elevationLossM !== undefined || data?.elevationGainM !== undefined);
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
  // De dag van je antwoord per advies-id (Liever niet, Akkoord of Begrepen): de drie weken stilte tellen vanaf die dag.
  answeredOn?: Readonly<Record<string, string>>;
  // Wat de sleuteltraining is (engine/keySession.ts): daar komt de trapsessie niet bij op dezelfde dag.
  keyFocus?: KeyFocus;
  // Voor een trapsessie na een rustige training op dezelfde dag: je tijd per dag en of twee trainingen op een dag mag.
  program?: Program | null;
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>;
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'];
}

export interface DescentSlot {
  day: string;
  // De rustige training van die dag waar de trapsessie achteraan komt; zonder: een vrije dag.
  after?: SessionTemplate;
}

// De eerste dag van `from` tot en met `until` waar een korte trapsessie past. Eerst een vrije dag; is die er niet,
// dan een dag met alleen een herstelwandeling of een rustige loop (niet hard, niet zwaar voor de benen, geen
// sleuteltraining), waar de trapsessie als korte toevoeging achteraan komt. Voor beide geldt:
// - niet je vaste rustdag, geen vakantie zonder training, tocht, lichte dag of ziektedag;
// - 48 uur van een zware beendag: geen zware benen de dag erna, en de dag ervoor alleen bij een toevoeging
//   achter een rustige training (nooit op een vrije dag direct na de beendag);
// - nooit naast een harde loop, en niet in de drie dagen voor een test of de week voor een wedstrijd of tocht;
// - niet op of naast een dag waar een ander voorstel iets neerzet.
// Een vrije dag telt alleen als de week daarna nog een dag zonder training houdt (vanaf vandaag geteld; een rij
// Herstel is geen training). Een toevoeging op dezelfde dag vraagt ruimte in je tijd en dat twee trainingen op een dag mag.
export function findDescentDay(input: DescentAdviceInput, from: string, until: string, opts: { tripGuard: boolean }): DescentSlot | undefined {
  const { today, plannedSessions, logs } = input;
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const stairs = byId.get(STAIRS_TEMPLATE_ID);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const standing = plannedSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= today && !logged.has(s.id));
  const rowsOn = (day: string) => standing.filter((s) => s.scheduledDate === day);
  const templatesOn = (day: string): SessionTemplate[] => [
    ...rowsOn(day).map((s) => byId.get(s.templateId)),
    ...logs.filter((l) => l.completedDate === day).map((l) => byId.get(l.templateId)),
  ].filter((t): t is SessionTemplate => !!t);
  const busy = (day: string) => rowsOn(day).length > 0 || logs.some((l) => l.completedDate === day);
  // Een dag zonder training: niets gepland of gedaan behalve Herstel.
  const trains = (day: string) => rowsOn(day).some((s) => byId.get(s.templateId)?.type !== 'recovery') || logs.some((l) => l.completedDate === day && l.type !== 'recovery');
  const leave = leaveDays(input.leave);
  const light = lightDays(input.leave, leave);
  const trips = input.context?.trips ?? [];
  // Een herstelwandeling of een rustige loop: niet hard, niet zwaar voor de benen, geen sleuteltraining, test of wedstrijd.
  const easy = (t: SessionTemplate) => t.type === 'recovery'
    || (templateSport(t) === 'running' && !isHardRun(t) && !isLegHeavyTemplate(t) && !isTestOrRace(t) && !isKeyFor(t, input.keyFocus));

  const fits = (day: string, addOn = false): boolean => {
    if (input.restDay && isoWeekday(day) === input.restDay) return false;
    const kind = leave.get(day)?.kind;
    if (kind === 'off' || kind === 'trek' || light.has(day) || isIllnessDay(day, input.illnessEpisodes, today)) return false;
    const before = templatesOn(addDays(day, -1));
    const after = templatesOn(addDays(day, 1));
    if ([...before, ...after].some((t) => isHardRun(t)) || after.some((t) => isLegHeavyTemplate(t))) return false;
    // De dag na een zware beendag: alleen als toevoeging achter een rustige training, nooit op een vrije dag
    // (besluit 2026-11-11-afdaalklok.md: Trap af is matig en het programma zet op die dag zelf al een loop).
    if (!addOn && before.some((t) => isLegHeavyTemplate(t))) return false;
    const ahead = (n: number) => Array.from({ length: n }, (_, i) => templatesOn(addDays(day, i + 1))).flat();
    if (ahead(TEST_CLEAR_DAYS).some((t) => isTestOrRace(t)) || ahead(TAPER_NEAR_DAYS).some((t) => hasRole(t, 'race'))) return false;
    if (opts.tripGuard && trips.some((t) => day <= t.date && daysBetween(day, t.date) < TAPER_NEAR_DAYS)) return false;
    return ![addDays(day, -1), day, addDays(day, 1)].some((d) => input.taken?.has(d));
  };
  const days: string[] = [];
  for (let day = from; day <= until; day = addDays(day, 1)) days.push(day);

  // 1. Een vrije dag gaat voor.
  for (const day of days) {
    if (busy(day) || !fits(day)) continue;
    if (!weekDates(mondayOfWeek(day)).some((d) => d !== day && d >= today && !trains(d))) continue;
    return { day };
  }
  // 2. Anders na een herstelwandeling of een rustige loop op dezelfde dag.
  if (!stairs || input.sameDayPairingPreference === 'never') return undefined;
  for (const day of days) {
    const rows = rowsOn(day);
    if (rows.length !== 1 || logs.some((l) => l.completedDate === day) || !fits(day, true)) continue;
    const template = byId.get(rows[0].templateId);
    if (!template || !easy(template)) continue;
    const week = standing.filter((s) => mondayOfWeek(s.scheduledDate) === mondayOfWeek(day));
    // Met een tijdsbudget voor die dag moet het passen; zonder budget is 20 minuten na een rustige training goed.
    if (input.dailyTimeBudget?.[weekdayOf(day)] && !dayHasRoomFor(day, stairs, week, byId, input.program, input.dailyTimeBudget, input.sameDayPairingPreference)) continue;
    return { day, after: template };
  }
  return undefined;
}

const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
const daysText = (n: number) => (n === 1 ? '1 dag' : `${n} dagen`);
// ", na je rustige duurloop": de trapsessie komt achter de rustige training van die dag.
const afterText = (slot: DescentSlot) => (slot.after ? `, na je ${slot.after.name.charAt(0).toLowerCase()}${slot.after.name.slice(1)}` : '');

const WHY = 'Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierschade van de volgende. In onderzoek was die bescherming er na drie en zes weken nog en na negen weken niet meer (Byrnes e.a. 1985). Vijf minuten bergaf was genoeg om het krachtverlies na een lange afdaling een week later te halveren (Maeo e.a. 2017). Drie weken is een veilige eigen grens. Een afdaling telt bij 100 meter dalen of meer in een wandeling of loop, of als de training zelf een afdaaltraining is. ASCEND kiest een vrije dag met 48 uur tot je zware beendagen en niet naast een harde loop. Is er geen vrije dag, dan komt de trapsessie na een herstelwandeling of een rustige loop op dezelfde dag; dat mag ook de dag na een zware beendag, nooit de dag ervoor. Zonder Akkoord verandert er niets.';
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
    // Te laat is pas na dag -7: op dag -7 zelf mag de bekende afdaling nog. Staat hij voor vandaag gepland, dan zwijgt de klok.
    if (toGo < TAPER_NEAR_DAYS) {
      // Geen voorstel, alleen een zin (regel A9: geen nieuwe prikkel in de laatste week).
      const id = `descent-late:${trip.date}`;
      if (input.respondedIds.has(id) || plannedDescent(today, today)) return [];
      const title = 'Te laat voor een afdaalprikkel';
      const lead = `${capital(trip.name)} begint over ${daysText(toGo)}. Een nieuwe afdaalprikkel geeft nu spierpijn op de tocht zelf.`;
      const effect = `${lead} ${lastText}${doubt} Begin je eerste afdaling rustig: kleine passen, knieën licht gebogen, stokken als je ze hebt.`;
      return [{ id, trigger: 'plan_update', ruleId: DESCENT_LATE_RULE, title, effect, lead, brief: `${capital(trip.name)} over ${daysText(toGo)}, geen verse afdaling`, why: WHY_TAPER, priority: 2 }];
    }
    const id = `descent-taper:${trip.date}`;
    if (input.respondedIds.has(id) || plannedDescent(today, nearDay)) return [];
    const from = addDays(today, 1) > farDay ? addDays(today, 1) : farDay;
    const slot = from <= nearDay ? findDescentDay(input, from, nearDay, { tripGuard: false }) : undefined;
    const title = `Nog één bekende afdaling voor ${trip.name}`;
    const fact = `${capital(trip.name)} begint over ${daysText(toGo)}. ${lastText}${doubt}`;
    if (!slot) {
      // Vandaag is dag -7: morgen is te laat, dus geen voorstel meer, alleen wat je vandaag nog kunt doen.
      const lastDay = from > nearDay;
      const lead = lastDay ? `${fact} Vandaag is de laatste dag voor een bekende afdaling.` : `${fact} Tot en met ${formatWeekdayDateNL(nearDay)} is er geen dag die past.`;
      const effect = `${lead} Neem ${lastDay ? 'vandaag' : 'voor die dag'} in een wandeling of loop een trap of helling mee naar beneden die je kent. Daarna niets nieuws meer voor je benen.`;
      return [{ id, trigger: 'plan_update', ruleId: DESCENT_TAPER_RULE, title, effect, lead, brief: `Nog één afdaling voor ${trip.name}`, why: WHY_TAPER, priority: 2 }];
    }
    const when = `${formatWeekdayDateNL(slot.day)}${afterText(slot)}`;
    const lead = `${fact} Doe op ${when}${slot.after ? ',' : ''} nog één afdaling die je kent.`;
    const effect = `Met Akkoord staat ${template.name} (${minutes} minuten) op ${when}. Kies een trap of helling die je kent, en doe daarna niets nieuws meer voor je benen. Met Liever niet blijft je week zoals hij is en vraagt ASCEND er voor deze tocht niet meer naar.`;
    const proposal = addProposal(title, slot.day, template, 'Eén bekende afdaling voor je tocht, zodat je benen beschermd zijn.', DESCENT_TAPER_RULE, WHY_TAPER);
    return [{ id, trigger: 'plan_update', ruleId: DESCENT_TAPER_RULE, title, effect, lead, brief: `Nog één afdaling voor ${trip.name}`, why: WHY_TAPER, priority: 2, proposal }];
  }

  // --- De klok van 21 dagen -----------------------------------------------------
  // Zonder afdaling telt de klok vanaf je eerste log; zonder logs weet ASCEND niets en zegt het niets.
  const start = clock.last ?? clock.since;
  if (!start) return [];
  const days = daysBetween(start, today);
  if (days < DESCENT_CLOCK_DAYS) return [];
  // Je antwoord (Liever niet, Akkoord of Begrepen) houdt de klok drie weken stil, geteld vanaf de dag van dat antwoord.
  // Daarna krijgt het advies een nieuw id, met de dag waarop het weer mag: dezelfde som als de zin in het voorstel.
  const base = `descent:${start}`;
  const mine = (key: string) => key === base || key.startsWith(`${base}:`);
  const answered = Object.entries(input.answeredOn ?? {}).filter(([key]) => mine(key)).map(([, date]) => date).sort().at(-1);
  if (answered && daysBetween(answered, today) < DECLINE_QUIET_DAYS) return [];
  // Een antwoord zonder dag (alleen het id is bekend): stil, want wanneer de drie weken om zijn is niet te zeggen.
  if (!answered && [...input.respondedIds].some(mine)) return [];
  const id = answered ? `${base}:${addDays(answered, DECLINE_QUIET_DAYS)}` : base;
  if (input.respondedIds.has(id)) return [];
  const until = addDays(today, LOOK_AHEAD_DAYS);
  if (plannedDescent(today, until)) return [];
  const title = clock.last ? `Al ${days} dagen geen afdaling` : 'Nog geen afdaling in je logs';
  const brief = clock.last ? `${days} dagen geen afdaling` : 'Nog geen afdaling gelogd';
  const fact = clock.last ? `${lastText}${doubt}` : `ASCEND ziet in ${days} dagen geen afdaling in je logs.${doubt}`;
  const again = formatWeekdayDateNL(addDays(today, DECLINE_QUIET_DAYS));
  const slot = findDescentDay(input, addDays(today, 1), until, { tripGuard: true });
  if (!slot) {
    const lead = `${fact} De komende week is er geen dag die past.`;
    const effect = `${lead} Neem in je volgende wandeling of loop een trap of helling mee naar beneden: tien minuten rustig dalen is genoeg. Na Begrepen vraagt ASCEND het op zijn vroegst op ${again} weer.`;
    return [{ id, trigger: 'plan_update', ruleId: DESCENT_CLOCK_RULE, title, effect, lead, brief, why: WHY, priority: 2 }];
  }
  const when = `${formatWeekdayDateNL(slot.day)}${afterText(slot)}`;
  const lead = `${fact} Een korte trapsessie op ${when}${slot.after ? ',' : ''} houdt je benen beschermd.`;
  const effect = `Met Akkoord staat ${template.name} (${minutes} minuten) op ${when}${slot.after ? '' : ', een vrije dag'}. Met Liever niet blijft je week zoals hij is en vraagt ASCEND het op zijn vroegst op ${again} weer.`;
  const proposal = addProposal(title, slot.day, template, 'Een korte afdaalprikkel: je laatste afdaling is drie weken of langer geleden.', DESCENT_CLOCK_RULE, WHY);
  return [{ id, trigger: 'plan_update', ruleId: DESCENT_CLOCK_RULE, title, effect, lead, brief, why: WHY, priority: 2, proposal }];
}

/** De dag van elk antwoord op een advies, voor `answeredOn`. Een antwoord zonder tijdstip (een oude of
 *  geïmporteerde back-up) slaat hij over in plaats van te crashen; zo'n id houdt de klok stil tot je weer
 *  een afdaling logt (zie het besluit). */
export function answeredDays(responses: Readonly<Record<string, { at?: unknown } | null | undefined>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, r] of Object.entries(responses ?? {})) {
    if (r && typeof r.at === 'string' && r.at) out[id] = localDateOf(r.at);
  }
  return out;
}

// De korte aanwijzing in de rij van Week: staat de trapsessie op een dag met een rustige loop of een
// herstelwandeling, dan komt hij daar achteraan ("na je rustige duurloop"). Alleen weergave.
export function descentRowNotes(sessions: readonly PlannedSession[], templates: readonly SessionTemplate[]): Map<string, string> {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const live = sessions.filter((s) => s.status !== 'skipped');
  const out = new Map<string, string>();
  for (const s of live) {
    if (s.templateId !== STAIRS_TEMPLATE_ID) continue;
    const others = live.filter((o) => o.id !== s.id && o.scheduledDate === s.scheduledDate).map((o) => byId.get(o.templateId)).filter((x): x is SessionTemplate => !!x);
    const first = others.length === 1 && (others[0].type === 'recovery' || templateSport(others[0]) === 'running') ? others[0] : undefined;
    if (first) out.set(s.id, `na je ${first.name.charAt(0).toLowerCase()}${first.name.slice(1)}`);
  }
  return out;
}
