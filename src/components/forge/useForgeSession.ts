import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { clearDraft } from '../../utils/loggerDraft';
import {
  clearSessionPointer, forgeOpenSnapshot, openRequestSnapshot, parsePointer, readSession, sessionSnapshot, subscribeForgeOpen, subscribeOpenRequest, subscribeSession,
  type SessionState,
} from '../../utils/forgeSessionStore';

// De lopende training, of niets. Een sessie waarvan de training al in het logboek staat is klaar
// (op een ander scherm afgerond): de restanten gaan dan weg. Een wijzer zonder concept ook.
export function useLiveSession(): SessionState | undefined {
  const snap = useSyncExternalStore(subscribeSession, sessionSnapshot);
  const { sessionLogs } = useAppData();
  const session = useMemo(() => (snap ? readSession() : undefined), [snap]);
  const pointer = useMemo(() => (snap ? parsePointer(snap.slice(0, snap.indexOf('|'))) : undefined), [snap]);
  const logged = !!session?.pointer.plannedSessionId && sessionLogs.some((l) => l.plannedSessionId === session.pointer.plannedSessionId);
  useEffect(() => {
    if (logged && session) {
      clearDraft(session.pointer.key, 'local');
      clearSessionPointer(session.pointer.key);
    } else if (pointer && !session) {
      clearSessionPointer(pointer.key);
    }
  }, [logged, session, pointer]);
  return logged ? undefined : session;
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
