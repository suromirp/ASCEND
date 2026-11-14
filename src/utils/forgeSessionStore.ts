// ASCEND: de lopende training van Forge (docs/beslissingen/2026-10-29-forge-als-sessie.md).
//
// Er is hoogstens één sessie. Het concept van die training (utils/loggerDraft.ts, localStorage) is de enige
// bron voor rijen, verloop, klok en pauzes; hier staat alleen het wijzende stukje: welk concept, welke
// training en welke dag. Daarmee vindt de pil boven de tabbalk de sessie zonder dat een pagina hem kent.
// Een sessie eindigt met Afronden of Verwijderen, nooit door tijd. Hij begint bij de eerste echte handeling,
// niet bij openen (dan wordt de wijzer pas geschreven).

import { cleanPauses, parkLeft, type Pause } from '../engine/forgeSession';

const POINTER_KEY = 'ascend.forge.sessie';
const DRAFT_PREFIX = 'ascend.afvinkconcept.';
const EVENT = 'ascend:forge-sessie';

export interface SessionPointer {
  // De sleutel van het concept in localStorage (inclusief ':forge').
  key: string;
  templateId: string;
  name: string;
  plannedSessionId?: string;
  scheduledDate?: string;
  variant?: string;
}

export interface SessionState {
  pointer: SessionPointer;
  startedAt: number;
  pauses: Pause[];
  lastActionAt?: number;
  // Afgevinkte werksets in het concept: voor de pil en het blad van een training die bleef liggen.
  doneSets: number;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parsePointer(raw: string | null): SessionPointer | undefined {
  if (!raw) return undefined;
  try {
    const p = JSON.parse(raw) as Partial<SessionPointer> | null;
    if (!p || typeof p !== 'object') return undefined;
    if (typeof p.key !== 'string' || typeof p.templateId !== 'string' || typeof p.name !== 'string') return undefined;
    return {
      key: p.key,
      templateId: p.templateId,
      name: p.name,
      ...(typeof p.plannedSessionId === 'string' ? { plannedSessionId: p.plannedSessionId } : {}),
      ...(typeof p.scheduledDate === 'string' ? { scheduledDate: p.scheduledDate } : {}),
      ...(typeof p.variant === 'string' ? { variant: p.variant } : {}),
    };
  } catch {
    return undefined;
  }
}

// De klok uit het concept, defensief: een concept zonder pauses werkt gewoon.
function sessionFromDraftRaw(pointer: SessionPointer, raw: string | null): SessionState | undefined {
  if (!raw) return undefined;
  try {
    const d = JSON.parse(raw) as { startedAt?: unknown; pauses?: unknown; lastActionAt?: unknown; savedAt?: unknown; exercises?: unknown } | null;
    if (!d || typeof d !== 'object' || typeof d.startedAt !== 'number' || !Array.isArray(d.exercises)) return undefined;
    // Het laatste moment van handelen: het bewaarde moment, anders het wegschrijven (een concept van voor dit veld).
    const last = typeof d.lastActionAt === 'number' ? d.lastActionAt : typeof d.savedAt === 'number' ? d.savedAt : undefined;
    return {
      pointer,
      startedAt: d.startedAt,
      pauses: cleanPauses(d.pauses),
      ...(last !== undefined && Number.isFinite(last) ? { lastActionAt: last } : {}),
      doneSets: countDoneWork(d.exercises),
    };
  } catch {
    return undefined;
  }
}

// Afgevinkte werksets, defensief gelezen (engine/forgeWorkout.ts#progress telt dezelfde rijen).
function countDoneWork(exercises: unknown[]): number {
  let n = 0;
  for (const e of exercises) {
    const rows = (e as { rows?: unknown } | null)?.rows;
    if (!Array.isArray(rows)) continue;
    for (const r of rows) if (r && typeof r === 'object' && (r as { kind?: unknown }).kind === 'work' && (r as { done?: unknown }).done === true) n++;
  }
  return n;
}

// Wat de pil nodig heeft: de wijzer en de klok, in een korte tekst die alleen verandert als een van die
// echt verandert. Het concept zelf (rijen, verloop) wordt alleen opnieuw gelezen als de tekst ervan veranderde.
let cache: { raw: string | null; draftRaw: string | null; snap: string; session?: SessionState } = { raw: null, draftRaw: null, snap: '' };

function compute(): { snap: string; session?: SessionState } {
  const raw = read(POINTER_KEY);
  if (!raw) {
    if (cache.raw !== null || cache.snap !== '') cache = { raw: null, draftRaw: null, snap: '' };
    return cache;
  }
  const pointer = parsePointer(raw);
  const draftRaw = pointer ? read(pointer.key) : null;
  if (cache.raw === raw && cache.draftRaw === draftRaw) return cache;
  const session = pointer ? sessionFromDraftRaw(pointer, draftRaw) : undefined;
  // Zonder lastActionAt: die verandert bij elke tik, en de pil en het opruimen lezen hem niet.
  const snap = session ? `${raw}\u0001${session.startedAt}\u0001${JSON.stringify(session.pauses)}` : `${raw}\u0001`;
  // Zelfde klok en wijzer, ander concept (een set getikt): niets te melden, de snapshot blijft dezelfde tekst.
  cache = { raw, draftRaw, snap, ...(session ? { session } : {}) };
  return cache;
}

export function readPointer(): SessionPointer | undefined {
  return parsePointer(read(POINTER_KEY));
}

// De sessie zoals hij nu is, of niets. Een wijzer zonder concept is een sessie die al ten einde is.
export function readSession(): SessionState | undefined {
  return compute().session;
}

export function sessionSnapshot(): string {
  return compute().snap;
}

// Alleen melden als wat de pil ziet echt veranderde.
let lastEmitted = '';
function emit() {
  const snap = sessionSnapshot();
  if (snap === lastEmitted) return;
  lastEmitted = snap;
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // geen venster: niemand om te waarschuwen
  }
}

// De wijzer van déze sessie schrijven. Staat er al een wijzer met een andere sleutel (een andere sessie
// loopt), dan blijft die staan en geeft dit onwaar terug.
export function writeSessionPointer(pointer: SessionPointer): boolean {
  const current = readPointer();
  if (current && current.key !== pointer.key) return false;
  try {
    const raw = JSON.stringify(pointer);
    if (localStorage.getItem(POINTER_KEY) !== raw) localStorage.setItem(POINTER_KEY, raw);
  } catch {
    // geen opslag: dan is er alleen het concept
  }
  emit();
  return true;
}

// Alleen de wijzer van déze sessie gaat weg; die van een andere blijft.
export function clearSessionPointer(key: string): void {
  const p = readPointer();
  if (p && p.key !== key) return;
  try {
    localStorage.removeItem(POINTER_KEY);
  } catch {
    // niets te wissen
  }
  emit();
}

// Een training die bleef liggen gaat verder of wordt afgerond (engine/forgeSession.ts#parkLeft): de stilte vanaf
// je laatste handeling wordt een pauze in het concept. De sets en het verloop blijven precies zoals ze waren.
// Onwaar als er geen concept is om te bewaren; dan verandert er niets.
export function parkSession(pointer: SessionPointer, now: number): boolean {
  const raw = read(pointer.key);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw) as Record<string, unknown> | null;
    if (!d || typeof d !== 'object' || typeof d.startedAt !== 'number' || !Array.isArray(d.exercises)) return false;
    const last = typeof d.lastActionAt === 'number' ? d.lastActionAt : typeof d.savedAt === 'number' ? d.savedAt : undefined;
    const next = parkLeft({ startedAt: d.startedAt, pauses: cleanPauses(d.pauses), ...(last !== undefined ? { lastActionAt: last } : {}) }, now);
    localStorage.setItem(pointer.key, JSON.stringify({ ...d, pauses: next.pauses, lastActionAt: next.lastActionAt, savedAt: now }));
  } catch {
    return false;
  }
  emit();
  return true;
}

// Weggooien na Annuleren-bevestiging: het concept en de wijzer van déze sessie gaan weg. Je logboek verandert niet.
export function discardSession(pointer: SessionPointer): void {
  removeDraftKey(pointer.key);
  clearSessionPointer(pointer.key);
}

// Het concept is net weggeschreven of weggehaald.
export function notifySession(): void {
  emit();
}

// Alles verwijderen en een back-up terugzetten: de sessie hoort bij de oude planning en gaat mee weg,
// samen met alle concepten van trainingen (localStorage en sessionStorage).
export function clearForgeSessions(): void {
  for (const store of [safe(() => localStorage), safe(() => sessionStorage)]) {
    if (!store) continue;
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && (k === POINTER_KEY || k.startsWith(DRAFT_PREFIX))) keys.push(k);
      }
      keys.forEach((k) => store.removeItem(k));
    } catch {
      // niets te wissen
    }
  }
  emit();
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

// De sleutels van de concepten van Forge in localStorage.
export function forgeDraftKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX) && k.endsWith(':forge')) keys.push(k);
    }
  } catch {
    // geen opslag
  }
  return keys;
}

export function removeDraftKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // niets te wissen
  }
}

export function subscribeSession(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === POINTER_KEY || e.key.startsWith(DRAFT_PREFIX)) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

// --- Is het volle scherm van Forge open? De pil staat er alleen als dat niet zo is. ---------------------------

let openCount = 0;
const openListeners = new Set<() => void>();
const fireOpen = () => openListeners.forEach((l) => l());

export function registerForgeOpen(): () => void {
  openCount++;
  fireOpen();
  return () => {
    openCount--;
    fireOpen();
  };
}
export const forgeOpenSnapshot = () => openCount > 0;
export function subscribeForgeOpen(cb: () => void): () => void {
  openListeners.add(cb);
  return () => {
    openListeners.delete(cb);
  };
}

// --- Open de sessie vanaf de pil (of vanaf "Naar de training"): het verzoek leest de host in App. ---------------------

// Met `finish` opent Forge meteen op het blad Training afronden (Afronden vanaf een training die bleef liggen).
let requested = false;
let requestFinish = false;
const requestListeners = new Set<() => void>();
const fireRequest = () => requestListeners.forEach((l) => l());

export function requestOpenSession(mode?: 'finish'): void {
  requested = true;
  requestFinish = mode === 'finish';
  fireRequest();
}
export function clearOpenRequest(): void {
  if (!requested) return;
  requested = false;
  requestFinish = false;
  fireRequest();
}
export const openRequestFinishes = () => requestFinish;
export const openRequestSnapshot = () => requested;
export function subscribeOpenRequest(cb: () => void): () => void {
  requestListeners.add(cb);
  return () => {
    requestListeners.delete(cb);
  };
}
