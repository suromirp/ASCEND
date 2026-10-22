// ASCEND: the stored MacroFactor file and naming choices, read together with
// the plan and logs into what the card and the screen show.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from './AppDataContext';
import { getMacroFactorState, getMapping, onMacroFactorChange, type MacroFactorState } from '../storage/macrofactor';
import { planMacroFactor, type MacroFactorPlan, type NameMapping } from '../engine/macrofactorLink';

export interface MacroFactorView {
  loaded: boolean;
  state: MacroFactorState;
  mapping: NameMapping;
  plan: MacroFactorPlan;
}

const EMPTY: MacroFactorState = { workouts: [], dismissed: [] };

export function useMacroFactor(): MacroFactorView {
  const { plannedSessions, templates, sessionLogs } = useAppData();
  const [state, setState] = useState<MacroFactorState | null>(null);
  const [mapping, setMapping] = useState<NameMapping | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void Promise.all([getMacroFactorState(), getMapping()])
        .then(([s, m]) => {
          if (!alive) return;
          setState(s);
          setMapping(m);
        })
        .catch(() => undefined);
    load();
    const stop = onMacroFactorChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const plan = useMemo(
    () => (state && mapping ? planMacroFactor(state.workouts, mapping, state.dismissed, plannedSessions, templates, sessionLogs) : { proposals: [], alreadyDone: 0 }),
    [state, mapping, plannedSessions, templates, sessionLogs],
  );
  return { loaded: !!state && !!mapping, state: state ?? EMPTY, mapping: mapping ?? {}, plan };
}
