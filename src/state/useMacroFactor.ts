// ASCEND: the stored MacroFactor file and naming choices, read together with
// the plan and logs into what the card and the screen show.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from './AppDataContext';
import { getLoose, getMacroFactorState, getMapping, onMacroFactorChange, type MacroFactorState } from '../storage/macrofactor';
import { planMacroFactor, type MacroFactorPlan, type NameMapping } from '../engine/macrofactorLink';
import { groupRows, linkRows, suggestAll, type LinkRow } from '../engine/macrofactorNames';

export interface MacroFactorView {
  loaded: boolean;
  state: MacroFactorState;
  mapping: NameMapping;
  // Name keys linked as a loose strength training.
  loose: string[];
  plan: MacroFactorPlan;
  // One line per unique name that still has a workout to handle, with the
  // suggestion for a name that is not linked yet.
  rows: LinkRow[];
}

const EMPTY: MacroFactorState = { workouts: [], dismissed: [], leads: true };

export function useMacroFactor(): MacroFactorView {
  const { plannedSessions, templates, sessionLogs, program } = useAppData();
  const [state, setState] = useState<MacroFactorState | null>(null);
  const [mapping, setMapping] = useState<NameMapping | null>(null);
  const [loose, setLoose] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void Promise.all([getMacroFactorState(), getMapping(), getLoose()])
        .then(([s, m, l]) => {
          if (!alive) return;
          setState(s);
          setMapping(m);
          setLoose(l);
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
    () => (state && mapping ? planMacroFactor(state.workouts, mapping, state.dismissed, plannedSessions, templates, sessionLogs, state.leads, loose ?? []) : { proposals: [], alreadyDone: 0 }),
    [state, mapping, loose, plannedSessions, templates, sessionLogs],
  );
  const rows = useMemo(() => {
    if (!state || !mapping) return [];
    const suggestions = suggestAll(state.workouts, plannedSessions, sessionLogs, templates, program?.startDate);
    return groupRows(linkRows(state.workouts, mapping, state.dismissed, sessionLogs, templates, suggestions, loose ?? []), templates);
  }, [state, mapping, loose, plannedSessions, templates, sessionLogs, program]);
  return { loaded: !!state && !!mapping, state: state ?? EMPTY, mapping: mapping ?? {}, loose: loose ?? [], plan, rows };
}
