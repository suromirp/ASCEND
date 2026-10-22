import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { PackItem } from '../../data/packList';
import { normalizePackList, resolvePackItems } from '../../engine/packList';
import { targetPackWeightKg } from '../../engine/demand';

// The packing list as the screens use it: the stored list (or the example),
// a way to change it and the goal's pack weight when it has one.
export function usePackList(): {
  items: PackItem[];
  customised: boolean;
  goalKg: number | undefined;
  change: (fn: (items: PackItem[]) => PackItem[]) => void;
  reset: () => void;
} {
  const { settings, updateSettings, trainingGoals } = useAppData();
  const stored = useMemo(() => normalizePackList(settings.packList).state, [settings.packList]);
  const items = resolvePackItems(stored);
  const goalKg = trainingGoals
    .filter((g) => g.status === 'active')
    .map((g) => targetPackWeightKg(g.requirements))
    .find((v) => v !== undefined);

  // Two quick taps must not overwrite each other with an older list.
  const latest = useRef(items);
  useEffect(() => { latest.current = items; }, [items]);
  const change = useCallback((fn: (items: PackItem[]) => PackItem[]) => {
    const next = fn(latest.current);
    latest.current = next;
    void updateSettings({ packList: { v: 1, items: next } });
  }, [updateSettings]);
  const reset = useCallback(() => {
    // Back to the example: the field is removed, not filled with a copy.
    void updateSettings({ packList: undefined });
  }, [updateSettings]);

  return { items, customised: !!stored, goalKg, change, reset };
}
