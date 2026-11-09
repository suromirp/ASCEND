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

  // Na een fout of een time-out kan de put nog doorlopen: lees de opslag dan opnieuw, zodat de tab toont wat er staat.
  const reload = useCallback(() => { void loadSkillGoals().then(setStore).catch(() => undefined); }, []);
  const write = useCallback(async (work: Promise<SkillGoalStore>) => {
    try {
      setStore(await withTimeout(work, WRITE_MS));
    } catch (err) {
      reload();
      void work.then(reload, () => undefined);
      throw err;
    }
  }, [reload]);
  const add = useCallback((goal: SkillGoal) => write(addSkillGoal(goal, logs, today)), [write, logs, today]);
  const remove = useCallback((id: string) => write(removeSkillGoal(id, new Date().toISOString())), [write]);

  return { store, add, remove };
}
