// ASCEND: één regel voor alle uitzonderingen (I-67, docs/visie/Ontwerp een regel voor uitzonderingen.md,
// docs/beslissingen/2026-11-16-een-regel-uitzonderingen.md).
//
// Mag deze training of deze stap op deze dag, en zo niet, wat dan? Eén plek die ziek, de opbouw na ziek, vakantie,
// tocht, de lichte dagen rond een tocht, zonder sportschool, de afbouw voor een race, de dag van je doel, je rustdag,
// een vaste afspraak, kracht uit en de rustige weken kent. Elke stap die vroeger zelf toetste, leest hier.
//
// Twee lagen. De feiten: wat geldt er op een dag (`dayRules(stand).facts(datum)`), op volgorde van voorrang. Het
// oordeel: een vaste tabel van oorzaak maal stap (`may`). Geen gewichten, geen score; dezelfde invoer geeft altijd
// hetzelfde antwoord. De eerste oorzaak die iets zegt over de stap wint, de andere staan erbij (`also`).
//
// De functie schrijft niets en plant niets. Vervalt, vervang of verplaats voor een opgeslagen rij is altijd een voorstel
// met Akkoord bij de aanroeper; waarschuw is alleen tekst; weiger voor een stap van ASCEND is stil, voor een stap van jou
// zegt de dag de reden. Wat de ronde zelf herstelt (engine/weekValidator.ts, engine/noGym.ts) blijft daar; wat twee
// trainingen over elkaar zeggen (48 uur, frisse benen voor een test) ook.
//
// Puur: geen React, geen opslag, geen klok. Vandaag komt mee als invoer.

import type { IllnessEpisode, IllnessKind } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween, isoWeekday } from '../utils/dates';
import { activeIllness, isHeavySession, recoveryRamp } from './illness';
import { leaveDays, lightDays, type LeaveDay } from './leave';
import { RACE_GUARD_DAYS } from './raceWindow';
import { isStrengthTemplate } from './strengthTraining';
import { isGymStrengthTemplate } from './templateRoles';

// --- de stand -------------------------------------------------------------------------------------------------------

// Een rustige periode in het programma: rustige instap (engine/reentry.ts), een lichte golfweek, de beginnersstart of
// een rustige week. Daarin komt er niets bij en geen set tot bijna falen.
export interface EasedRange {
  from: string;
  until: string;
}

export interface DayState {
  today: string;
  leave?: readonly LeavePeriod[];
  illness?: readonly IllnessEpisode[];
  // De dagen van de races in de planning (engine/raceWindow.ts#raceDatesOf).
  races?: readonly string[];
  // De dag van je doel: niets op of na.
  goalDay?: string;
  // Weekdag 1 tot 7 van je rustdag.
  restDay?: number;
  eased?: readonly EasedRange[];
  // Krachttraining uit (engine/strengthTraining.ts#strengthTrainingOn).
  strengthOff?: boolean;
}

// --- de feiten ------------------------------------------------------------------------------------------------------

// Op volgorde van voorrang, van sterk naar zwak (hoofdstuk 3.4 van het ontwerp). Ziek gaat voor vakantie: dan gaat het
// advies over je gezondheid en niet over je agenda. De volgorde van vakantie, tocht en zonder sportschool is die van
// engine/leave.ts#leaveDays.
export const CAUSE_ORDER = [
  'history', // voorbij of gelogd: nooit aangeraakt
  'goal', // op of na de dag van je doel
  'ill', // ziek met koorts of buikgriep: alles
  'off', // vakantie zonder training
  'trek', // een dag van je tocht
  'race', // de racedag zelf
  'taper', // de zeven dagen voor een race
  'ill_light', // ziek met neus of keel: alleen wat zwaar is
  'ramp', // opbouw na ziek
  'light', // licht rond een tocht: alleen wat zwaar is
  'nogym', // zonder sportschool: alleen wat de sportschool nodig heeft
  'strength_off', // krachttraining uit: alleen kracht
  'eased', // rustige instap, lichte golfweek, beginnersstart, rustige week
  'rest', // je rustdag
  'fixed', // een vaste afspraak van een sport
  'free', // vrije dagen: beperken nooit
] as const;
export type DayCause = typeof CAUSE_ORDER[number];

export interface DayFact {
  cause: DayCause;
  // Vakantie, tocht, licht, zonder sportschool, vrije dagen: de periode.
  period?: LeavePeriod;
  // Ziek: de melding, met de soort.
  illness?: { kind: IllnessKind; episode: IllnessEpisode; running: boolean };
  // Opbouw na ziek: de eerste dag dat zwaar weer mag, en de laatste dag van de opbouw.
  heavyFrom?: string;
  until?: string;
  // Afbouw: de dag van de race.
  raceDate?: string;
}

// --- de vraag en het oordeel ----------------------------------------------------------------------------------------

// place: de ronde zet een rij van zichzelf neer of laat hem staan. add: ASCEND zet er iets bij (extra training,
// weekvoorschrift, hoeveel per soort, heuvelloop). move: verplaatsen naar deze dag (slepen, het blad, ruilen, een
// voorstel). catch_up: inhalen op deze dag. add_set: een set erbij in Forge (de ijkset). propose: mag ASCEND op deze dag
// (vandaag) iets voorstellen. count: telt een niet gedane training op deze dag als gemist. do: hoort hij vandaag bij je
// missie.
export type DayStep = 'place' | 'add' | 'move' | 'catch_up' | 'add_set' | 'propose' | 'count' | 'do';
export type DayActor = 'you' | 'ascend';

// vervalt (drop), vervang (replace), verplaats (move), waarschuw (warn), weiger (refuse).
export type DayOutcome = 'drop' | 'replace' | 'move' | 'warn' | 'refuse';

export type TemplateFacts = Pick<SessionTemplate, 'id' | 'type'> & Partial<SessionTemplate>;

export interface DayQuestion {
  date: string;
  step: DayStep;
  // Wie het doet. Standaard ASCEND; slepen, ruilen en een datum kiezen doe jij.
  actor?: DayActor;
  // Het sjabloon: zwaar, sportschool nodig, kracht. Zonder sjabloon zegt een oorzaak die alleen een soort training raakt
  // niets.
  template?: TemplateFacts;
  // De geplande rij als die er al is: het slot, een vaste afspraak, gelogd.
  session?: Pick<PlannedSession, 'id' | 'scheduledDate' | 'lock' | 'status' | 'fixed'>;
  logged?: boolean;
}

// `also`: elke andere oorzaak die op die dag geldt. `more`: de andere oorzaken die ook iets over deze stap zeggen, op
// volgorde van voorrang (slepen op je rustdag in een periode zonder sportschool vraagt beide).
export type DayVerdict =
  | { ok: true; also: DayCause[]; more?: undefined }
  | { ok: false; outcome: DayOutcome; cause: DayCause; reason: string; also: DayCause[]; more: { cause: DayCause; outcome: DayOutcome }[]; yours?: true };

// --- de teksten -----------------------------------------------------------------------------------------------------

// Eén tabel, zodat slepen, ruilen, het blad en Let op hetzelfde woord gebruiken. `chip` hoogstens 28 tekens.
// `line`: na de dag ("Woensdag 18 november is een vakantiedag."), `kept`: na de dag in een zin ("valt nog in je ziekte").
// `ask`: de vraag bij een stap van jou die mag na Akkoord (waarschuw), zonder de dag.
export const DAY_CAUSE_TEXT: Record<DayCause, { chip: string; kept: string; line: (day: string) => string; ask?: string }> = {
  history: { chip: 'Dag is voorbij', kept: 'is al voorbij', line: (day) => `${day} is al voorbij.` },
  goal: { chip: 'Na je doel', kept: 'ligt op of na je doel', line: (day) => `${day} ligt op of na je doel.` },
  ill: { chip: 'Je bent ziek', kept: 'valt nog in je ziekte', line: (day) => `${day} valt nog in je ziekte.` },
  off: { chip: 'Vakantie', kept: 'is een vakantiedag', line: (day) => `${day} is een vakantiedag.` },
  trek: { chip: 'Tochtdag', kept: 'is een tochtdag', line: (day) => `${day} is een tochtdag.` },
  race: { chip: 'Je wedstrijd', kept: 'is de dag van je wedstrijd', line: (day) => `${day} is de dag van je wedstrijd.` },
  taper: { chip: 'Afbouw voor je race', kept: 'valt in de afbouw voor je race', line: (day) => `${day} valt in de afbouw voor je race.` },
  ill_light: { chip: 'Je bent verkouden', kept: 'valt in je verkoudheid, niets zwaars', line: (day) => `${day} valt in je verkoudheid. Niets zwaars.`, ask: 'Je bent verkouden. Rustig bewegen mag, niets zwaars.' },
  ramp: { chip: 'Opbouw na ziek', kept: 'valt in je opbouw na ziekte, nog niets zwaars', line: (day) => `${day} valt in je opbouw na ziekte. Nog niets zwaars.`, ask: 'Je bouwt op na ziekte. Nog niets zwaars.' },
  light: { chip: 'Lichte dag bij je tocht', kept: 'blijft licht door je tocht', line: (day) => `${day} blijft licht door je tocht, daar past geen zware training.` },
  nogym: { chip: 'Zonder sportschool', kept: 'valt in je periode zonder sportschool', line: () => 'Sportschool nodig, en je zit zonder sportschool.', ask: 'Sportschool nodig, en je zit zonder sportschool.' },
  strength_off: { chip: 'Kracht staat uit', kept: 'valt buiten je planning, kracht staat uit', line: () => 'Krachttraining staat uit.' },
  eased: { chip: 'Rustige week', kept: 'valt in een rustige week', line: (day) => `${day} valt in een rustige week.` },
  rest: { chip: 'Je rustdag', kept: 'is je rustdag', line: () => 'Dit is je rustdag. Een rustdag is er om te herstellen.', ask: 'Dit is je rustdag. Een rustdag is er om te herstellen.' },
  fixed: { chip: 'Vaste afspraak', kept: 'is een vaste afspraak', line: () => 'Een vaste afspraak van een sport is van jou.' },
  free: { chip: 'Vrije dag', kept: 'is een vrije dag', line: (day) => `${day}. Vrije dag.` },
};

// Bij een rij die je zelf vastzette (hoofdstuk 3.5): de planning laat hem staan, Let op zegt het.
export const YOURS_LINE = 'Je zette hem zelf hier.';

// --- de tabel -------------------------------------------------------------------------------------------------------

const heavyOf = (t: TemplateFacts | undefined) => !!t && isHeavySession(t as SessionTemplate);
const gymOf = (t: TemplateFacts | undefined) => !!t && isGymStrengthTemplate(t);
const strengthOf = (t: TemplateFacts | undefined) => !!t && isStrengthTemplate(t);

// Wat een oorzaak zegt over een stap, of niets. `fact` voor de afbouw (telt pas als de race er was).
function rule(cause: DayCause, q: DayQuestion, fact: DayFact, today: string): DayOutcome | undefined {
  const { step, template: t } = q;
  const you = q.actor === 'you';
  switch (cause) {
    case 'history':
      return step === 'place' || step === 'add' || step === 'move' || step === 'catch_up' ? 'refuse' : undefined;
    case 'goal':
      if (step === 'place') return 'drop';
      return step === 'add' || step === 'move' || step === 'catch_up' ? 'refuse' : undefined;
    case 'ill':
      if (step === 'count') return 'drop';
      // Een voorbije melding zegt alleen nog iets over de telling en de ijkset (die meet dan iets anders).
      if (!fact.illness?.running) return step === 'add_set' ? 'refuse' : undefined;
      return step === 'place' ? 'drop' : 'refuse';
    case 'off':
    case 'trek':
      if (step === 'place') return 'move';
      if (step === 'count') return 'drop';
      return step === 'propose' || step === 'do' ? undefined : 'refuse';
    case 'race':
      return step === 'add' || step === 'add_set' ? 'refuse' : undefined;
    case 'taper':
      // Wat in de afbouw niet gedaan is, vervalt zodra de race er is (engine/raceWindow.ts#isTaperDay).
      if (step === 'count') return fact.raceDate && fact.raceDate <= today ? 'drop' : undefined;
      // Geen set tot bijna falen in de week voor een race: het ene venster van engine/adviceShared.ts#raceWeekGuard.
      return step === 'add_set' ? 'refuse' : undefined;
    case 'ill_light':
      // Neus of keel: rustig bewegen mag, niets zwaars. Wat er toch stond telt niet als gemist; voorstellen en een
      // ijkset wachten tot je beter bent.
      if (step === 'count') return 'drop';
      if (!fact.illness?.running) return step === 'add_set' ? 'refuse' : undefined;
      if (step === 'propose' || step === 'add' || step === 'add_set') return 'refuse';
      if (!heavyOf(t)) return undefined;
      if (step === 'place') return 'drop';
      return step === 'move' && you ? 'warn' : 'refuse';
    case 'ramp':
      if (step === 'propose' || step === 'add' || step === 'add_set') return 'refuse';
      if (step === 'count' || !heavyOf(t) || !fact.heavyFrom || q.date >= fact.heavyFrom) return undefined;
      if (step === 'place') return 'drop';
      if (step === 'do') return undefined;
      return step === 'move' && you ? 'warn' : 'refuse';
    case 'light':
      if (!heavyOf(t)) return undefined;
      if (step === 'place') return 'move';
      return step === 'move' || step === 'add' || step === 'catch_up' ? 'refuse' : undefined;
    case 'nogym':
      // Er komt niets bij in een periode zonder sportschool (eigenaar, 16 november: je traint bewust minder). De
      // heuvelloop die de periode zelf neerzet gaat niet via deze stap (engine/noGym.ts).
      if (step === 'add') return 'refuse';
      if (step === 'add_set') return 'refuse';
      if (!gymOf(t)) return undefined;
      if (step === 'place') return 'replace';
      if (step === 'count') return 'drop';
      if (step === 'move') return you ? 'warn' : 'refuse';
      return step === 'catch_up' ? 'refuse' : undefined;
    case 'strength_off':
      if (!strengthOf(t)) return step === 'add_set' ? 'refuse' : undefined;
      return step === 'place' ? 'drop' : step === 'add' || step === 'catch_up' || step === 'add_set' ? 'refuse' : undefined;
    case 'eased':
      return step === 'add' || step === 'add_set' ? 'refuse' : undefined;
    case 'rest':
      if (step === 'place') return 'move';
      return step === 'move' ? (you ? 'warn' : 'refuse') : undefined;
    case 'fixed':
      return step === 'catch_up' || (step === 'move' && !you) ? 'refuse' : undefined;
    case 'free':
      return undefined;
  }
}

// Een rij met jouw slot krijgt nooit vervalt, vervang of verplaats: waarschuw, met "Je zette hem zelf hier." Alleen
// historie is sterker (hoofdstuk 3.5).
const yoursHeld = (q: DayQuestion) => q.step === 'place' && !!q.session && (!!q.session.lock || q.session.status === 'moved');

// --- de functie -----------------------------------------------------------------------------------------------------

export interface DayRules {
  state: DayState;
  facts(date: string, q?: Pick<DayQuestion, 'session' | 'logged'>): DayFact[];
  may(q: DayQuestion): DayVerdict;
  // Kort: mag het zonder meer.
  ok(q: DayQuestion): boolean;
  // De dag van de vakantie, tocht of periode zonder sportschool (engine/leave.ts#leaveDays), voor wie de periode zelf
  // nodig heeft.
  leaveDay(date: string): LeaveDay | undefined;
}

export function dayRules(state: DayState): DayRules {
  const today = state.today;
  const leave = state.leave?.length ? [...state.leave] : undefined;
  const days = leaveDays(leave);
  const light = lightDays(leave, days);
  const episodes = state.illness?.length ? [...state.illness] : undefined;
  const running = activeIllness(episodes);
  const ramp = recoveryRamp(episodes, today);
  const lastEnd = ramp ? [...(episodes ?? [])].filter((e) => e.endDate).sort((a, b) => b.endDate!.localeCompare(a.endDate!))[0]?.endDate : undefined;
  const races = [...(state.races ?? [])].sort();

  const illFact = (date: string): DayFact | undefined => {
    // Een lopende ziekte houdt vandaag en morgen vast (wat ziek melden van de planning haalde); een voorbije dag in een
    // melding is ziek tot en met de dag van beter melden, of tot vandaag (engine/illness.ts#isIllnessDay).
    if (running && date >= running.startDate && date <= addDays(today, 1)) return { cause: running.kind === 'above_neck' ? 'ill_light' : 'ill', illness: { kind: running.kind, episode: running, running: true } };
    const past = (episodes ?? []).find((e) => date >= e.startDate && date <= (e.endDate ?? today));
    if (past) return { cause: past.kind === 'above_neck' ? 'ill_light' : 'ill', illness: { kind: past.kind, episode: past, running: !past.endDate } };
    return undefined;
  };

  const facts = (date: string, q?: Pick<DayQuestion, 'session' | 'logged'>): DayFact[] => {
    const out: DayFact[] = [];
    if (q?.logged || date < today) out.push({ cause: 'history' });
    if (state.goalDay && date >= state.goalDay) out.push({ cause: 'goal' });
    const ill = illFact(date);
    if (ill) out.push(ill);
    const day = days.get(date);
    if (day?.kind === 'off') out.push({ cause: 'off', period: day.period });
    if (day?.kind === 'trek') out.push({ cause: 'trek', period: day.period });
    if (races.includes(date)) out.push({ cause: 'race', raceDate: date });
    else {
      const race = races.find((r) => date < r && daysBetween(date, r) <= RACE_GUARD_DAYS);
      if (race) out.push({ cause: 'taper', raceDate: race });
    }
    if (ramp && lastEnd && date >= lastEnd && date <= ramp.until) out.push({ cause: 'ramp', heavyFrom: ramp.heavyFrom, until: ramp.until });
    const lightDay = light.get(date);
    if (lightDay) out.push({ cause: 'light', period: lightDay.period });
    if (day?.kind === 'nogym') out.push({ cause: 'nogym', period: day.period });
    if (state.strengthOff) out.push({ cause: 'strength_off' });
    if (state.eased?.some((r) => date >= r.from && date <= r.until)) out.push({ cause: 'eased' });
    if (state.restDay && isoWeekday(date) === state.restDay) out.push({ cause: 'rest' });
    if (q?.session?.fixed) out.push({ cause: 'fixed' });
    if (day?.kind === 'free') out.push({ cause: 'free', period: day.period });
    return out.sort((a, b) => CAUSE_ORDER.indexOf(a.cause) - CAUSE_ORDER.indexOf(b.cause));
  };

  const may = (q: DayQuestion): DayVerdict => {
    const all = facts(q.date, q);
    const saying = all.filter((f) => rule(f.cause, q, f, today) !== undefined);
    const also = all.map((f) => f.cause);
    const first = saying[0];
    if (!first) return { ok: true, also };
    let outcome = rule(first.cause, q, first, today)!;
    const rest = also.filter((c) => c !== first.cause);
    const more = saying.slice(1).map((f) => ({ cause: f.cause, outcome: rule(f.cause, q, f, today)! }));
    const reason = DAY_CAUSE_TEXT[first.cause].line(q.date);
    if (first.cause !== 'history' && yoursHeld(q) && (outcome === 'drop' || outcome === 'replace' || outcome === 'move')) {
      outcome = 'warn';
      return { ok: false, outcome, cause: first.cause, reason: `${reason} ${YOURS_LINE}`, also: rest, more, yours: true };
    }
    return { ok: false, outcome, cause: first.cause, reason, also: rest, more };
  };

  return {
    state,
    facts,
    may,
    ok: (q) => may(q).ok,
    leaveDay: (date) => days.get(date),
  };
}

// Voor één vraag zonder de stand te bewaren.
export function mayOn(q: DayQuestion, state: DayState): DayVerdict {
  return dayRules(state).may(q);
}
