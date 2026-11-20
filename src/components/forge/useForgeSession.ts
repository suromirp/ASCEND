import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { settingsPageRoute } from '../../data/settingsLayout';
import { useAppData } from '../../state/AppDataContext';
import { draftsToPrune, leftSession, resolveLeftAfter, sessionIsDead, type LeftSession, type SessionWorld } from '../../engine/forgeSession';
import { todayISO, toISODate } from '../../utils/dates';
import { clearDraft } from '../../utils/loggerDraft';
import {
  clearSessionPointer, forgeDraftKeys, forgeOpenSnapshot, openRequestSnapshot, readPointer, readSession, rememberTrainingReturn, removeDraftKey, requestOpenSession, sessionSnapshot, subscribeForgeOpen,
  subscribeOpenRequest, subscribeSession, trainingReturn, type SessionState,
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
// geen lopende klok meer en het blad vraagt Afronden, Verder of Verwijderen. Leest het concept zelf, zodat een set
// die net in een ander tabblad werd afgevinkt meetelt.
export function useLeftSession(session: SessionState | undefined): LeftSession | undefined {
  const check = useLeftCheck();
  const now = useMinute();
  return session ? check(session, now) : undefined;
}

// De toets zelf, voor een moment naar keuze (de pil roept hem aan bij een terugkomst in de app). Zolang de app
// laadt, is niets een concept: dan weten we nog niet of de geplande sessie overgeslagen is.
export function useLeftCheck(): (session: SessionState, now: number) => LeftSession | undefined {
  const { settings } = useAppData();
  const world = useSessionWorld();
  const afterHours = resolveLeftAfter(settings);
  return (session, now) => {
    if (world.loading) return undefined;
    const fresh = readSession() ?? session;
    const skipped = !!fresh.pointer.plannedSessionId && world.skippedIds.has(fresh.pointer.plannedSessionId);
    return leftSession(fresh, now, { afterHours, dayOf, skipped });
  };
}

// Na de sprong van de kaart IJkset naar Instellingen: de terugknop (en alleen die) opent de training weer. Een andere
// weg weg van Instellingen, of de pagina niet bereikt, laat hem met rust en vergeet de terugweg.
export function useTrainingReturn(): void {
  const { pathname } = useLocation();
  const type = useNavigationType();
  const seen = useRef(false);
  useEffect(() => {
    const pending = trainingReturn();
    if (!pending) {
      seen.current = false;
      return;
    }
    if (pathname === settingsPageRoute('forge')) {
      seen.current = true;
      return;
    }
    if (!seen.current) return;
    seen.current = false;
    if (type === 'POP') requestOpenSession();
    else rememberTrainingReturn(undefined);
  }, [pathname, type]);
}
