// ASCEND: de stand van de kaart Vroeg ziek zien (components/IllnessSignCard.tsx, engine/illnessSigns.ts),
// los van de kaart zelf.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useRecoveryMetrics } from './useRecoveryMetrics';
import { illnessSign } from '../engine/illnessSigns';
import { activeIllness } from '../engine/illness';
import { affectedMorning } from '../engine/influence';
import { MetaRepo } from '../storage/database';
import { todayISO } from '../utils/dates';

const SEEN_KEY = 'illnessSignSeen';
interface Seen { goodFrom?: string; notNowOn?: string }

// De stand van de kaart, los van waar hij staat (engine/todayCards.ts): `shown` zegt of hij er is.
export function useIllnessSign() {
  const { settings } = useAppData();
  const metrics = useRecoveryMetrics();
  const today = todayISO();
  const [seen, setSeen] = useState<Seen | null>(null);
  useEffect(() => {
    let alive = true;
    void MetaRepo.get<Seen>(SEEN_KEY).then((s) => alive && setSeen(s ?? {})).catch(() => alive && setSeen({}));
    return () => {
      alive = false;
    };
  }, []);

  const off = settings.illnessSigns === false;
  const ill = !!activeIllness(settings.illnessEpisodes);
  const explained = useMemo(() => new Set((settings.influences ?? []).filter((e) => e.reasons.length > 0 || e.excludeHeartRate).map(affectedMorning)), [settings.influences]);
  const sign = useMemo(() => (off ? undefined : illnessSign({ today, metrics, explained, ill })), [off, today, metrics, explained, ill]);
  const shown = !!sign && !!seen && seen.goodFrom !== sign.from && seen.notNowOn !== today;
  const remember = (next: Seen) => {
    setSeen(next);
    void MetaRepo.set(SEEN_KEY, next).catch(() => undefined);
  };
  return { shown, sign, seen, today, remember };
}

export type IllnessSignState = ReturnType<typeof useIllnessSign>;
