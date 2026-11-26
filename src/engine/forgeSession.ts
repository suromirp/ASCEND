// ASCEND: een training in Forge als sessie (docs/beslissingen/2026-10-29-forge-als-sessie.md).
// Een klok, geen timer: de actieve tijd is nu min het begin min de som van de pauzes. Alles staat in het
// concept van de training (startedAt, pauses, lastActionAt), dus sluiten, herladen en een volgende dag
// veranderen niets. Pure functies; een concept zonder pauses werkt gewoon.

import { addDays, formatWeekdayDayMonthNL, toISODate, todayISO } from '../utils/dates';

export interface Pause {
  from: number;
  // Een open pauze heeft geen einde.
  to?: number;
}

export interface SessionClock {
  startedAt: number;
  pauses?: Pause[];
  // Het laatste moment dat jij iets deed (een set afvinken, typen, verder na een pauze).
  lastActionAt?: number;
}

// Pauzes uit een concept: alleen echte getallen, in volgorde, en hoogstens een open pauze (de laatste).
export function cleanPauses(raw: unknown): Pause[] {
  if (!Array.isArray(raw)) return [];
  const out: Pause[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const from = (p as { from?: unknown }).from;
    const to = (p as { to?: unknown }).to;
    if (typeof from !== 'number' || !Number.isFinite(from)) continue;
    if (to === undefined || to === null) out.push({ from });
    else if (typeof to === 'number' && Number.isFinite(to) && to >= from) out.push({ from, to });
  }
  out.sort((a, b) => a.from - b.from);
  // Alleen de laatste mag open zijn.
  return out.filter((p, i) => p.to !== undefined || i === out.length - 1);
}

export function isPaused(s: SessionClock): boolean {
  const list = cleanPauses(s.pauses);
  return list.length > 0 && list[list.length - 1].to === undefined;
}

// Hoeveel milliseconden de pauzes samen duren tot nu, binnen het begin en nu, zonder dubbeltelling.
export function pausedMs(s: SessionClock, now: number): number {
  let total = 0;
  let upTo = s.startedAt;
  for (const p of cleanPauses(s.pauses)) {
    const from = Math.max(p.from, s.startedAt, upTo);
    const to = Math.min(p.to ?? now, now);
    if (to > from) {
      total += to - from;
      upTo = to;
    }
  }
  return total;
}

export function activeSeconds(s: SessionClock, now: number): number {
  return Math.max(0, Math.floor((now - s.startedAt - pausedMs(s, now)) / 1000));
}

export function activeMinutes(s: SessionClock, now: number): number {
  return Math.floor(activeSeconds(s, now) / 60);
}

export function pause(s: SessionClock, now: number): SessionClock {
  if (isPaused(s)) return s;
  return { ...s, pauses: [...cleanPauses(s.pauses), { from: Math.max(now, s.startedAt) }] };
}

// Verder: sluit de open pauze. Telt als handeling, dus de lange onderbreking meet vanaf hier.
export function resume(s: SessionClock, now: number): SessionClock {
  if (!isPaused(s)) return s;
  const list = cleanPauses(s.pauses);
  const last = list[list.length - 1];
  return { ...s, pauses: [...list.slice(0, -1), { from: last.from, to: Math.max(now, last.from) }], lastActionAt: now };
}

function noteAction(s: SessionClock, now: number): SessionClock {
  return { ...s, lastActionAt: now };
}

// De drempel van de instelling "Lange onderbreking vragen na", in minuten; 0 is uit, afwezig is het advies.
export const BREAK_ASK_OPTIONS = [0, 30, 45, 60, 90] as const;
export type BreakAsk = (typeof BREAK_ASK_OPTIONS)[number];
const DEFAULT_BREAK_ASK: BreakAsk = 45;

export function resolveBreakAsk(raw: { forgeLongBreak?: unknown } | undefined | null): BreakAsk {
  return BREAK_ASK_OPTIONS.find((m) => m === raw?.forgeLongBreak) ?? DEFAULT_BREAK_ASK;
}

// Het laatste moment van handelen; valt terug op het begin.
function lastActionOf(s: SessionClock): number {
  return typeof s.lastActionAt === 'number' && Number.isFinite(s.lastActionAt) ? Math.max(s.lastActionAt, s.startedAt) : s.startedAt;
}

// Hoe lang je weg was als dat de drempel haalt terwijl de klok liep; anders niets. Gepauzeerd vraagt niets.
export function longBreakMs(s: SessionClock, now: number, thresholdMin: BreakAsk): number | undefined {
  if (thresholdMin === 0 || isPaused(s)) return undefined;
  const away = now - lastActionOf(s);
  return away > thresholdMin * 60_000 ? away : undefined;
}

// "Nee, als pauze": de tijd van de laatste handeling tot nu wordt een pauze, daarna loopt de klok door.
export function breakAsPause(s: SessionClock, now: number): SessionClock {
  const from = lastActionOf(s);
  return { ...s, pauses: [...cleanPauses(s.pauses), { from, to: Math.max(now, from) }], lastActionAt: now };
}

// "Ja, telt mee": de tijd blijft, de vraag komt niet terug.
export const breakCounts = noteAction;

// "22 uur", "2 uur", "50 minuten": rond en kort, voor de zin "Je was ... weg."
export function formatAway(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 90) return minutes === 1 ? '1 minuut' : `${minutes} minuten`;
  return `${Math.round(minutes / 60)} uur`;
}

// --- Een training die bleef liggen (profiel afbreker, 14 november, backlog N) -------------------------------
//
// Een sessie die je vergat loopt niet dagen door: na middernacht (met een uur stilte) of na een vaste grens
// zonder handeling, of als de geplande sessie in je planning overgeslagen is, is hij een concept. Er gaat dan
// niets weg en er verandert niets aan de planning: de klok staat stil op je laatste handeling, en de pil en het
// blad vragen wat je wilt (Afronden met wat je deed, Verder of Verwijderen). Alleen een keuze van jou beëindigt hem.

// De instelling "Training bewaren als concept na", in uren zonder handeling; 0 is: alleen na middernacht.
export const LEFT_AFTER_OPTIONS = [0, 4, 8, 12] as const;
export type LeftAfter = (typeof LEFT_AFTER_OPTIONS)[number];
const DEFAULT_LEFT_AFTER: LeftAfter = 12;

export function resolveLeftAfter(raw: { forgeLeftAfter?: unknown } | undefined | null): LeftAfter {
  return LEFT_AFTER_OPTIONS.find((h) => h === raw?.forgeLeftAfter) ?? DEFAULT_LEFT_AFTER;
}

// Na middernacht pas na een uur stilte: een late training die over middernacht doorloopt, blijft lopen.
export const NIGHT_QUIET_MIN = 60;

// Overgeslagen in je planning en zo lang stil: dan een concept. Kort genoeg om meteen te zien, lang genoeg voor Verder.
export const SKIPPED_QUIET_MIN = 10;

export type LeftReason = 'nacht' | 'grens' | 'overgeslagen';

export interface LeftSession {
  reason: LeftReason;
  // Je laatste handeling: de klok van het concept staat hier stil.
  lastActionAt: number;
}

// Is deze sessie blijven liggen? `dayOf` geeft de dag van een moment in je eigen tijdzone (utils/dates.ts#toISODate),
// zodat middernacht en de zomertijd kloppen; de stilte zelf is gewoon verstreken tijd in milliseconden.
export function leftSession(
  s: SessionClock,
  now: number,
  o: { afterHours: LeftAfter; dayOf: (ms: number) => string; skipped?: boolean },
): LeftSession | undefined {
  const last = lastActionOf(s);
  const quiet = now - last;
  // Overgeslagen: pas na tien minuten stilte, zodat Verder (dat de stilte parkeert) echt verder gaat.
  if (o.skipped && quiet >= SKIPPED_QUIET_MIN * 60_000) return { reason: 'overgeslagen', lastActionAt: last };
  if (o.afterHours > 0 && quiet >= o.afterHours * 3_600_000) return { reason: 'grens', lastActionAt: last };
  if (quiet >= NIGHT_QUIET_MIN * 60_000 && o.dayOf(now) > o.dayOf(last)) return { reason: 'nacht', lastActionAt: last };
  return undefined;
}

// De actieve tijd van een concept: tot je laatste handeling, nooit de uren erna.
export function leftActiveSeconds(s: SessionClock): number {
  return activeSeconds(s, lastActionOf(s));
}

// Verder of Afronden met een concept: de stilte vanaf je laatste handeling wordt een pauze, zodat de klok en de
// duur van het log alleen de tijd tellen dat je echt trainde. Zelfde regel als "Nee, als pauze".
export const parkLeft = breakAsPause;

// "3 sets", "1 set", "geen sets": voor de zinnen van het blad.
export function setsPhrase(n: number): string {
  if (n <= 0) return 'geen sets';
  return n === 1 ? '1 set' : `${n} sets`;
}

// "42 min", "1 uur 35 min", "2 uur": de tijd die je trainde, voor de zinnen van het blad.
export function minutesPhrase(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} uur` : `${h} uur ${m} min`;
}

// De zinnen van het blad bij een training die bleef liggen of nog loopt. `when` is "gisteren om 22:41" en zo,
// in je eigen tijdzone gemaakt door de aanroeper. Het droge feit eerst, dan wat er gebeurt als je niets kiest.
export function leftSessionLines(o: { name: string; doneSets: number; activeSec: number; when: string; reason?: LeftReason }): { fact: string; note: string; discard: string } {
  const sets = setsPhrase(o.doneSets);
  const fact = `${o.name}: ${sets} afgevinkt, ${minutesPhrase(o.activeSec)} getraind. Je laatste handeling was ${o.when}.`;
  const note =
    o.reason === 'overgeslagen'
      ? 'In je planning staat hij als overgeslagen. Je sets staan als concept klaar. Er gaat niets weg tot je kiest.'
      : o.reason
        ? 'Hij staat als concept klaar. Er gaat niets weg tot je kiest.'
        : 'Er loopt één training tegelijk.';
  const discard = `${o.doneSets > 0 ? `${sets[0].toUpperCase()}${sets.slice(1)} en ${minutesPhrase(o.activeSec)}` : 'Deze training'} van ${o.when.replace(/ om .*/, '')} ${o.doneSets > 0 ? 'gaan' : 'gaat'} weg. Je logboek en je planning veranderen niet.`;
  return { fact, note, discard };
}

// "vandaag om 08:10", "gisteren om 22:41", "di 17 nov om 22:41": in je eigen tijdzone.
export function whenPhrase(ms: number, today = todayISO()): string {
  const d = new Date(ms);
  const day = toISODate(d);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const label = day === today ? 'vandaag' : day === addDays(today, -1) ? 'gisteren' : formatWeekdayDayMonthNL(day);
  return `${label} om ${time}`;
}

// Het blad van een concept of een lopende training, als die elders al afgerond of verwijderd is.
export const SESSION_GONE_TEXT = 'Deze training is er niet meer. Hij is elders afgerond of verwijderd. Wat bewaard is, staat in je logboek.';
// Erachter als je net een andere training wilde starten: Begrepen start die (OtherSessionRunning.tsx).
export const GONE_NEXT_TEXT = 'Na Begrepen start je nieuwe training.';

// Verwijderen in het blad van een concept gaat in twee tikken: de eerste toont de bevestiging met Annuleren, pas de
// tweede (in die bevestiging) verwijdert. Het blad roept voor beide knoppen deze ene stap aan.
export type DiscardStep = 'kiezen' | 'bevestigen';
export function discardTap(step: DiscardStep): { step: DiscardStep; discard: boolean } {
  return step === 'bevestigen' ? { step, discard: true } : { step: 'bevestigen', discard: false };
}

// De dag die Afronden voorstelt bij Gedaan op: de dag van je laatst afgevinkte set, ook bij een geplande training
// die je een dag eerder of later deed (Warden 15 november, I-4), binnen de 60 dagen van het veld. De training zelf
// blijft gekoppeld; alleen de dag van het nieuwe log volgt het werk. Zonder afgevinkte set: een geplande training
// van een eerdere dag krijgt die dag, anders vandaag. Zo komt een beendag op de dag dat je hem deed (de
// 48-uursregel leest die dag). Een bestaand log verandert hier nooit.
export function finishDayDefault(o: { today: string; plannedSessionId?: string; scheduledDate?: string; lastTickAt?: number; dayOf: (ms: number) => string }): string {
  const tick = tickDay(o);
  if (tick !== undefined) return tick;
  if (o.plannedSessionId) return o.scheduledDate && o.scheduledDate < o.today ? o.scheduledDate : o.today;
  return o.today;
}

// De dag van je laatst afgevinkte set, als die binnen het veld valt (niet na vandaag, niet voor 60 dagen terug).
function tickDay(o: { today: string; lastTickAt?: number; dayOf: (ms: number) => string }): string | undefined {
  if (o.lastTickAt === undefined || !Number.isFinite(o.lastTickAt)) return undefined;
  const day = o.dayOf(o.lastTickAt);
  return day <= o.today && day >= addDays(o.today, -60) ? day : undefined;
}

// Het tijdstip (`completedAt`) van het nieuwe log bij de dag van Afronden (onderhoud 15 november): vandaag is het nu;
// een eerdere dag krijgt het moment van je laatste echte werk op die dag (`lastWorkAt`, uit
// engine/forgeWorkout.ts#lastWorkMomentOn), en 12:00 alleen zonder set op die dag. Nooit
// later dan nu, en nooit een dag naast `completedDate` (die twee lopen niet uiteen). Alleen voor een nieuw log.
export function finishCompletedAt(o: { doneOn: string; today: string; now: number; lastWorkAt?: number; dayOf: (ms: number) => string }): string {
  if (o.doneOn >= o.today) return new Date(o.now).toISOString();
  const work = o.lastWorkAt;
  if (work !== undefined && Number.isFinite(work) && work <= o.now && o.dayOf(work) === o.doneOn) return new Date(work).toISOString();
  const noon = new Date(`${o.doneOn}T12:00:00`).getTime();
  return new Date(Number.isFinite(noon) ? Math.min(noon, o.now) : o.now).toISOString();
}

// De knoppen bij Gedaan op voor een geplande training: de geplande dag (als die niet na vandaag ligt), de dag van
// je laatste set en vandaag, oud naar nieuw, zonder dubbele. Een enkele dag (alles vandaag) is geen keuze: leeg.
export function finishDayChoices(o: { today: string; scheduledDate?: string; lastTickAt?: number; dayOf: (ms: number) => string }): string[] {
  const days = [o.scheduledDate && o.scheduledDate <= o.today ? o.scheduledDate : undefined, tickDay(o), o.today].filter((d): d is string => !!d);
  const unique = [...new Set(days)].sort();
  return unique.length > 1 ? unique : [];
}

// Het blad Lange onderbreking gesloten zonder antwoord: onthoud voor welke stilte (de laatste handeling), zodat de
// minuut-tik hem niet terugzet. Stond de vraag niet open, dan blijft wat er al onthouden was.
export function rememberDismiss(o: { asking: boolean; lastActionAt: number; dismissedFor?: number }): number | undefined {
  return o.asking ? o.lastActionAt : o.dismissedFor;
}

// Het keuzeblad sloot: wat nu? Na Verwijderen, of als de training elders al weg was (Begrepen), gaat een vervolg
// (een nieuwe training starten) voor; anders sluit het blad, en opent Forge alleen na een keuze.
export function afterChoiceClose(o: { discarded: boolean; gone: boolean; hasNext: boolean; choice: 'finish' | 'resume' | null }): 'next' | 'close' | 'open' {
  if ((o.discarded || o.gone) && o.hasNext) return 'next';
  if (o.discarded || o.gone || !o.choice) return 'close';
  return 'open';
}

// De training verdween terwijl het keuzeblad openstond (een ander tabblad rondde hem af of verwijderde hem): het
// blad zegt dat, tenzij dit blad hem zelf verwijderde of al een keuze maakte en aan het sluiten is.
export function choiceSheetSeesGone(o: { stillThere: boolean; discarded: boolean; picked: boolean }): boolean {
  return !o.stillThere && !o.discarded && !o.picked;
}

// Wie een sessie is: de training en het moment van starten (zoals de sleutel van OtherSessionRunning in ForgeWorkout).
export function sessionIdentity(s: { pointer: { key: string }; startedAt: number }): string {
  return `${s.pointer.key}\u0001${s.startedAt}`;
}

// De laatste stand die de plek van de pil onthoudt: de live sessie, behalve als het blad openstaat en er een andere
// training loopt dan die waarvoor het openging; dan blijft de oude stand (pillSlot zegt dan weg). Een nieuwe stand van
// dezelfde training neemt hij altijd over.
export function nextPillLast<S>(o: { live: S | undefined; last: S | undefined; sheetOpen: boolean; keyOf: (s: S) => string }): S | undefined {
  if (o.live === undefined || o.live === o.last) return o.last;
  if (!o.sheetOpen || o.last === undefined || o.keyOf(o.live) === o.keyOf(o.last)) return o.live;
  return o.last;
}

// De pil en zijn keuzeblad: verdwijnt de training terwijl het blad openstaat, dan blijft het blad staan met de
// laatste stand (en zegt het zelf dat hij weg is); de pil zelf gaat weg. Loopt er intussen een andere training
// (in een ander tabblad A verwijderd en meteen B gestart), dan is A voor het open blad net zo goed weg: B komt nooit
// in een blad dat voor A openging (Warden 15 november, I-45). Zonder open blad: alleen de live sessie.
export function pillSlot<S>(o: { live: S | undefined; last: S | undefined; sheetOpen: boolean; keyOf: (s: S) => string }): { session: S; gone: boolean } | undefined {
  const other = o.live !== undefined && o.last !== undefined && o.keyOf(o.live) !== o.keyOf(o.last);
  if (o.sheetOpen && o.last !== undefined && (o.live === undefined || other)) return { session: o.last, gone: true };
  if (o.live !== undefined) return { session: o.live, gone: false };
  return undefined;
}

// De vraag Lange onderbreking: bij een echte terugkomst altijd (als de stilte de drempel haalt), op de minuut-tik
// alleen als je het blad niet al sloot zonder antwoord voor deze zelfde stilte. Een gesloten blad komt dus niet
// binnen een minuut terug; pas na een nieuwe handeling of een echte terugkomst.
export function askBreakNow(o: { gapMs: number | undefined; source: 'tik' | 'terug'; lastActionAt: number; dismissedFor?: number }): boolean {
  if (o.gapMs === undefined) return false;
  return o.source === 'terug' || o.dismissedFor !== o.lastActionAt;
}

// De duur die Afronden voorstelt: de actieve tijd, tenzij de klok onwaarschijnlijk lang liep (een vergeten
// sessie, een telefoon in een tas). Boven de grens valt het voorstel terug op de verwachte duur en zegt een
// regel wat de klok zei. Jij kunt het getal altijd zelf aanpassen.
const MAX_CLOCK_MINUTES = 240;

export interface FinishDuration {
  minutes: number;
  // De klok ging over de grens: het voorstel is de verwachte duur.
  clamped: boolean;
  // "16 uur 40 min", alleen als clamped.
  clockSaid?: string;
}

export function finishDuration(activeSec: number, expectedMin: number): FinishDuration {
  const minutes = Math.max(1, Math.round(activeSec / 60));
  if (minutes <= MAX_CLOCK_MINUTES) return { minutes, clamped: false };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { minutes: Math.max(1, Math.round(expectedMin)), clamped: true, clockSaid: m === 0 ? `${h} uur` : `${h} uur ${m} min` };
}

// Wat er bestaat, voor het opruimen van een sessie die nergens meer bij hoort.
export interface SessionWorld {
  plannedIds: ReadonlySet<string>;
  // De geplande sessies waar al een log van is.
  loggedIds: ReadonlySet<string>;
  templateIds: ReadonlySet<string>;
}

// Een sessie is dood als zijn training of geplande sessie er niet meer is, of al gelogd is: dan staat er
// geen pil die andere trainingen blokkeert en schrijft Afronden nooit een log naar een sessie die niet bestaat.
// Een lege wereld (de app laadt nog of startte niet goed op) is nooit een reden om iets weg te halen. Een
// geplande sessie die verdween maakt de sessie niet dood: afronden maakt er dan een losse training van, je
// sets blijven.
export function sessionIsDead(s: { templateId: string; plannedSessionId?: string }, w: SessionWorld): boolean {
  if (w.templateIds.size === 0) return false;
  if (!w.templateIds.has(s.templateId)) return true;
  if (s.plannedSessionId && w.loggedIds.has(s.plannedSessionId)) return true;
  return false;
}

const DRAFT_PREFIX = 'ascend.afvinkconcept.';
const LOOSE_KEEP_DAYS = 3;
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const UNPLANNED = /:(\d{4}-\d{2}-\d{2}|los)$/;

// Welke concepten van Forge bij het opstarten weg mogen: die van een geplande sessie die gelogd is of
// verdwenen, en die van een losse training van een eerdere dag. Het concept van de lopende sessie blijft.
export function draftsToPrune(keys: string[], w: SessionWorld, today: string, keepKey?: string): string[] {
  if (w.templateIds.size === 0) return [];
  // Een losse training mag een paar dagen blijven liggen voor hij weg mag.
  const looseBefore = shiftDay(today, -LOOSE_KEEP_DAYS);
  return keys.filter((key) => {
    if (key === keepKey || !key.startsWith(DRAFT_PREFIX) || !key.endsWith(':forge')) return false;
    const subject = key.slice(DRAFT_PREFIX.length, -':forge'.length);
    const loose = UNPLANNED.exec(subject);
    if (loose) return loose[1] !== 'los' && loose[1] < looseBefore;
    return !w.plannedIds.has(subject) || w.loggedIds.has(subject);
  });
}

// h:mm:ss, of m:ss onder het uur (de klok op de pil).
export function formatSessionClock(seconds: number, withHours = true): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (withHours || h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
