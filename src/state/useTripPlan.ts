// ASCEND — het etappeplan en de afspraak met thuis als React-state.
//
// Leest beide bij het openen uit IndexedDB, past een wijziging meteen toe op
// het scherm en schrijft hem daarna weg. Zo hapert een toetsaanslag niet op
// de opslag. De regels (wat een keuze met het plan doet) staan in
// engine/routePlan.ts, niet hier.

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_ROUTE_PLAN, EMPTY_SOLO_PLAN, type RoutePlan, type SoloPlan, type StageChoice } from '../models/routePlan';
import { applyChoice } from '../engine/routePlan';
import { RoutePlanRepo, SoloPlanRepo } from '../storage/routePlan';

export function useTripPlan() {
  const [plan, setPlan] = useState<RoutePlan>(EMPTY_ROUTE_PLAN);
  const [solo, setSolo] = useState<SoloPlan>(EMPTY_SOLO_PLAN);
  const [loaded, setLoaded] = useState(false);
  // De nieuwste waarde, zodat twee wijzigingen vlak na elkaar op elkaar
  // voortbouwen in plaats van elkaar te overschrijven.
  const planRef = useRef(plan);
  const soloRef = useRef(solo);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([RoutePlanRepo.get(), SoloPlanRepo.get()]).then(([p, s]) => {
      if (cancelled) return;
      planRef.current = p;
      soloRef.current = s;
      setPlan(p);
      setSolo(s);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const choose = useCallback((stageId: string, patch: Partial<StageChoice>) => {
    const next = applyChoice(planRef.current, stageId, patch);
    planRef.current = next;
    setPlan(next);
    void RoutePlanRepo.set(next);
  }, []);

  const updateSolo = useCallback((patch: Partial<Omit<SoloPlan, 'updatedAt'>>) => {
    const next: SoloPlan = { ...soloRef.current, ...patch, updatedAt: new Date().toISOString() };
    soloRef.current = next;
    setSolo(next);
    void SoloPlanRepo.set(next);
  }, []);

  return { plan, solo, loaded, choose, updateSolo };
}
