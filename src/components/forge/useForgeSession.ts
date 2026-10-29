import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { draftsToPrune, sessionIsDead, type SessionWorld } from '../../engine/forgeSession';
import { todayISO } from '../../utils/dates';
import { clearDraft } from '../../utils/loggerDraft';
import {
  clearSessionPointer, forgeDraftKeys, forgeOpenSnapshot, openRequestSnapshot, readPointer, readSession, removeDraftKey, sessionSnapshot, subscribeForgeOpen,
  subscribeOpenRequest, subscribeSession, type SessionState,
} from '../../utils/forgeSessionStore';

// Wat er bestaat: de training, de geplande sessie en of die al gelogd is.
export function useSessionWorld(): SessionWorld & { loading: boolean } {
  const { loading, plannedSessions, sessionLogs, templates } = useAppData();
  return useMemo(
    () => ({
      loading,
      plannedIds: new Set(plannedSessions.map((p) => p.id)),
      loggedIds: new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id)),
      templateIds: new Set(templates.map((t) => t.id)),
    }),
    [loading, plannedSessions, sessionLogs, templates],
  );
}

// De lopende training, of niets. Een sessie waarvan de training of de geplande sessie niet meer bestaat, of
// al in het logboek staat, telt niet meer mee (useSessionHousekeeping ruimt de restanten op).
export function useLiveSession(): SessionState | undefined {
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
