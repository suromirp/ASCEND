// "Wat speelde er": de trainingen die niet meetellen voor hartslag, als hook op zichzelf, zodat
// het loopinzicht en de trends hem kunnen lezen zonder de rest van useInfluence.ts.

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { excludedLogIds } from '../../engine/influence';

// The set of trainings that do not count for heart rate. Kept on a key of the ids, so a change that
// does not touch the exclusion (a reason, a seen mark) does not make every list work again.
export function useExcludedLogIds(): ReadonlySet<string> {
  const { settings } = useAppData();
  const key = useMemo(() => [...excludedLogIds(settings.influences)].sort().join('|'), [settings.influences]);
  return useMemo(() => new Set(key ? key.split('|') : []), [key]);
}
