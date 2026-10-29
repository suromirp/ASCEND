// ASCEND: de lopende training van Forge (docs/beslissingen/2026-10-29-forge-als-sessie.md).
//
// Er is hoogstens één sessie. Het concept van die training (utils/loggerDraft.ts, localStorage) is de enige
// bron voor rijen, verloop, klok en pauzes; hier staat alleen het wijzende stukje: welk concept, welke
// training en welke dag. Daarmee vindt de pil boven de tabbalk de sessie zonder dat een pagina hem kent.
// Een sessie eindigt met Afronden of Verwijderen, nooit door tijd.

import { cleanPauses, type Pause } from '../engine/forgeSession';
import { loadDraft } from './loggerDraft';

const POINTER_KEY = 'ascend.forge.sessie';
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
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parsePointer(raw: string | null): SessionPointer | undefined {
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
export function sessionFromDraft(pointer: SessionPointer): SessionState | undefined {
  const d = loadDraft<{ startedAt: number; pauses: unknown; lastActionAt: number; exercises: unknown }>(pointer.key, 'local');
  if (!d || typeof d.startedAt !== 'number' || !Array.isArray(d.exercises)) return undefined;
  return {
    pointer,
    startedAt: d.startedAt,
    pauses: cleanPauses(d.pauses),
    ...(typeof d.lastActionAt === 'number' ? { lastActionAt: d.lastActionAt } : {}),
  };
}

// De sessie zoals hij nu is, of niets. Een wijzer zonder concept is een sessie die al ten einde is.
export function readSession(): SessionState | undefined {
  const pointer = parsePointer(read(POINTER_KEY));
  return pointer ? sessionFromDraft(pointer) : undefined;
}

function emit() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // geen venster: niemand om te waarschuwen
  }
}

export function writeSessionPointer(pointer: SessionPointer): void {
  try {
    const raw = JSON.stringify(pointer);
    if (localStorage.getItem(POINTER_KEY) !== raw) localStorage.setItem(POINTER_KEY, raw);
  } catch {
    // geen opslag: dan is er alleen het concept
  }
  emit();
}

// Alleen de wijzer van déze sessie gaat weg; die van een andere blijft.
export function clearSessionPointer(key: string): void {
  const p = parsePointer(read(POINTER_KEY));
  if (p && p.key !== key) return;
  try {
    localStorage.removeItem(POINTER_KEY);
  } catch {
    // niets te wissen
  }
  emit();
}

// Iets in het concept of de wijzer is veranderd (het concept is net weggeschreven).
export function notifySession(): void {
  emit();
}

// Een waarde die verandert als de wijzer of het concept verandert, voor useSyncExternalStore.
export function sessionSnapshot(): string {
  const raw = read(POINTER_KEY);
  const p = parsePointer(raw);
  return p ? `${raw}|${read(p.key) ?? ''}` : '';
}

export function subscribeSession(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === POINTER_KEY || e.key.startsWith('ascend.afvinkconcept.')) cb();
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

let requested = false;
const requestListeners = new Set<() => void>();
const fireRequest = () => requestListeners.forEach((l) => l());

export function requestOpenSession(): void {
  requested = true;
  fireRequest();
}
export function clearOpenRequest(): void {
  if (!requested) return;
  requested = false;
  fireRequest();
}
export const openRequestSnapshot = () => requested;
export function subscribeOpenRequest(cb: () => void): () => void {
  requestListeners.add(cb);
  return () => {
    requestListeners.delete(cb);
  };
}
