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

// h:mm:ss, of m:ss onder het uur (de klok op de pil).
export function formatSessionClock(seconds: number, withHours = true): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (withHours || h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
