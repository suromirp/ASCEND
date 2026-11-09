import { useCallback, useEffect, useState } from 'react';
import { addSkillGoal, loadSkillGoals, recordSkillSteps, removeSkillGoal } from '../../storage/skillGoals';
import type { SessionLog } from '../../models/training';
import type { SkillGoal, SkillGoalStore } from '../../models/skillGoals';
import { withTimeout } from '../../utils/withTimeout';

// De vaardigheden op de Ascend-tab (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md). Bij elke
// verandering van de logs komen de stappen die je sindsdien haalde erbij (alleen toevoegen); toevoegen en weghalen
// gaan na Akkoord. Elke schrijfactie heeft een grens in tijd, zodat een knop nooit blijft wachten.
const WRITE_MS = 5000;
const EMPTY: SkillGoalStore = { goals: [], progress: [] };

export function useSkillGoals(logs: readonly SessionLog[], today: string, enabled: boolean) {
  const [store, setStore] = useState<SkillGoalStore>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    withTimeout(recordSkillSteps(logs, today), WRITE_MS)
      .catch(() => loadSkillGoals())
      .then((s) => { if (live) setStore(s); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [logs, today, enabled]);

  const add = useCallback(async (goal: SkillGoal) => setStore(await withTimeout(addSkillGoal(goal, logs, today), WRITE_MS)), [logs, today]);
  const remove = useCallback(async (id: string) => setStore(await withTimeout(removeSkillGoal(id, new Date().toISOString()), WRITE_MS)), []);

  return { store, add, remove };
}
