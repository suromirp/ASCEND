// "Klaar voor je test" (engine/testReadiness.ts): leest de feiten van je laatste loop met een reeks
// (storage/testStreams.ts) en geeft ze terug. Alleen gelezen; undefined tot ze er zijn.

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { lastRunStreamFacts } from '../storage/testStreams';
import { testReadiness, type TestReadiness } from '../engine/testReadiness';

export function useTestReadiness(active: boolean): TestReadiness | undefined {
  const { sessionLogs } = useAppData();
  const [ready, setReady] = useState<TestReadiness | undefined>(undefined);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void lastRunStreamFacts(sessionLogs).then((facts) => {
      if (live) setReady(testReadiness(facts));
    });
    return () => {
      live = false;
    };
  }, [active, sessionLogs]);
  return active ? ready : undefined;
}
