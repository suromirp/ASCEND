import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { draftsToPrune, leftSession, resolveLeftAfter, sessionIsDead, type LeftSession, type SessionWorld } from '../../engine/forgeSession';
import { todayISO, toISODate } from '../../utils/dates';
import { clearDraft } from '../../utils/loggerDraft';
import {
  clearSessionPointer, forgeDraftKeys, forgeOpenSnapshot, openRequestSnapshot, readPointer, readSession, removeDraftKey, sessionSnapshot, subscribeForgeOpen,
  subscribeOpenRequest, subscribeSession, type SessionState,
} from '../../utils/forgeSessionStore';

// Wat er bestaat: de training, de geplande sessie en of die al gelogd is.
export function useSessionWorld(): SessionWorld & { loading: boolean; skippedIds: ReadonlySet<string> } {
  const { loading, bootError, plannedSessions, sessionLogs, templates } = useAppData();
  return useMemo(
    () => ({
      // Een opstartfout of een lege lijst trainingen telt als laden: dan wordt er nooit iets opgeruimd.
      loading: loading || !!bootError || templates.length === 0,
      plannedIds: new Set(plannedSessions.map((p) => p.id)),
      loggedIds: new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id)),
      templateIds: new Set(templates.map((t) => t.id)),
      // Overgeslagen in je planning: een sessie daarvan is een concept dat om een keuze vraagt, nooit stil weg.
      skippedIds: new Set(plannedSessions.filter((p) => p.status === 'skipped').map((p) => p.id)),
    }),
    [loading, bootError, plannedSessions, sessionLogs, templates],
  );
}

// De lopende training, of niets. Een sessie waarvan de training of de geplande sessie niet meer bestaat, of
// al in het logboek staat, telt niet meer mee (useSessionHousekeeping ruimt de restanten op).
function useLiveSession(): SessionState | undefined {
  const snap = useSyncExternalStore(subscribeSession, sessionSnapshot);
  const world = useSessionWorld();
  const session = useMemo(() => (snap ? readSession() : undefined), [snap]);
  return session && !world.loading && sessionIsDead(session.pointer, world) ? undefined : session;
}

// Eén keer in App: een wijzer zonder concept of van een dode sessie gaat weg met zijn concept, en bij het
// opstarten ook de concepten van sessies die gelogd of verdwenen zijn (behalve de lopende).
export function useSessionHousekeeping(): void {
  const snap = useSyncExternalStore(subscribeSession, sessionSnapshot);
  const world = useSessionWorld();
  useEffect(() => {
    if (world.loading || !snap) return;
    const pointer = readPointer();
    if (!pointer) return;
    const session = readSession();
    if (!session || sessionIsDead(pointer, world)) {
      clearDraft(pointer.key, 'local');
      clearSessionPointer(pointer.key);
    }
  }, [snap, world]);
  const pruned = useRef(false);
  useEffect(() => {
    if (world.loading || pruned.current) return;
    pruned.current = true;
    const keep = readPointer()?.key;
    draftsToPrune(forgeDraftKeys(), world, todayISO(), keep).forEach(removeDraftKey);
  }, [world]);
}

// De pil staat er zolang er een sessie is en het volle scherm van Forge niet open is.
export function useSessionPill(): SessionState | undefined {
  const live = useLiveSession();
  const open = useSyncExternalStore(subscribeForgeOpen, forgeOpenSnapshot);
  return open ? undefined : live;
}

export function useOpenRequest(): boolean {
  return useSyncExternalStore(subscribeOpenRequest, openRequestSnapshot);
}

// Een minuut-tik (en terug in de app): genoeg om middernacht en de grens van uren te zien zonder elke seconde te rekenen.
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}

const dayOf = (ms: number) => toISODate(new Date(ms));

// Is de lopende sessie blijven liggen (engine/forgeSession.ts#leftSession)? Dan is hij een concept: de pil toont
// geen lopende klok meer en het blad vraagt Afronden, Verder of Weggooien. Leest het concept zelf, zodat een set
// die net in een ander tabblad werd afgevinkt meetelt.
export function useLeftSession(session: SessionState | undefined): LeftSession | undefined {
  const { settings } = useAppData();
  const world = useSessionWorld();
  const now = useMinute();
  if (!session) return undefined;
  const fresh = readSession() ?? session;
  const skipped = !!fresh.pointer.plannedSessionId && world.skippedIds.has(fresh.pointer.plannedSessionId);
  return leftSession(fresh, now, { afterHours: resolveLeftAfter(settings), dayOf, skipped });
}
