// ASCEND: een training in Forge als sessie (docs/beslissingen/2026-10-29-forge-als-sessie.md).
// Een klok, geen timer: de actieve tijd is nu min het begin min de som van de pauzes. Alles staat in het
// concept van de training (startedAt, pauses, lastActionAt), dus sluiten, herladen en een volgende dag
// veranderen niets. Pure functies; een concept zonder pauses werkt gewoon.

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

export function noteAction(s: SessionClock, now: number): SessionClock {
  return { ...s, lastActionAt: now };
}

// De drempel van de instelling "Lange onderbreking vragen na", in minuten; 0 is uit, afwezig is het advies.
export const BREAK_ASK_OPTIONS = [0, 30, 45, 60, 90] as const;
export type BreakAsk = (typeof BREAK_ASK_OPTIONS)[number];
export const DEFAULT_BREAK_ASK: BreakAsk = 45;

export function resolveBreakAsk(raw: { forgeLongBreak?: unknown } | undefined | null): BreakAsk {
  return BREAK_ASK_OPTIONS.find((m) => m === raw?.forgeLongBreak) ?? DEFAULT_BREAK_ASK;
}

// Het laatste moment van handelen; valt terug op het begin.
export function lastActionOf(s: SessionClock): number {
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

// De duur die Afronden voorstelt: de actieve tijd, tenzij de klok onwaarschijnlijk lang liep (een vergeten
// sessie, een telefoon in een tas). Boven de grens valt het voorstel terug op de verwachte duur en zegt een
// regel wat de klok zei. Jij kunt het getal altijd zelf aanpassen.
export const MAX_CLOCK_MINUTES = 240;

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
export function sessionIsDead(s: { templateId: string; plannedSessionId?: string }, w: SessionWorld): boolean {
  if (!w.templateIds.has(s.templateId)) return true;
  if (s.plannedSessionId && (!w.plannedIds.has(s.plannedSessionId) || w.loggedIds.has(s.plannedSessionId))) return true;
  return false;
}

const DRAFT_PREFIX = 'ascend.afvinkconcept.';
const UNPLANNED = /:(\d{4}-\d{2}-\d{2}|los)$/;

// Welke concepten van Forge bij het opstarten weg mogen: die van een geplande sessie die gelogd is of
// verdwenen, en die van een losse training van een eerdere dag. Het concept van de lopende sessie blijft.
export function draftsToPrune(keys: string[], w: SessionWorld, today: string, keepKey?: string): string[] {
  return keys.filter((key) => {
    if (key === keepKey || !key.startsWith(DRAFT_PREFIX) || !key.endsWith(':forge')) return false;
    const subject = key.slice(DRAFT_PREFIX.length, -':forge'.length);
    const loose = UNPLANNED.exec(subject);
    if (loose) return loose[1] !== 'los' && loose[1] < today;
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
