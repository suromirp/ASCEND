// De routes per geplande training voor een scherm (storage/sessionRoutes.ts): meteen wat er bekend is, en bij het
// openen een verse lezing. Week, Vandaag en de Briefing horen dezelfde verandering.

import { useEffect, useSyncExternalStore } from 'react';
import { loadSessionRoutes, peekSessionRoutes, subscribeSessionRoutes } from '../storage/sessionRoutes';
import type { SessionRoute } from '../models/sessionRoute';

const EMPTY: SessionRoute[] = [];

export function useSessionRoutes(): SessionRoute[] {
  const snapshot = () => peekSessionRoutes() ?? EMPTY;
  const routes = useSyncExternalStore(subscribeSessionRoutes, snapshot, snapshot);
  useEffect(() => {
    void loadSessionRoutes();
  }, []);
  return routes;
}
