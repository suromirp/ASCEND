// Vroeg ziek zien op Vandaag (engine/illnessSigns.ts): alleen als je rusthartslag en HRV een paar
// ochtenden samen afwijken. Een vraag, geen waarschuwing: "Voel me goed" laat deze reeks rusten,
// "Word ziek" opent de gewone ziekmelding (een voorstel met Akkoord), "Niet nu" verbergt hem
// vandaag. Je antwoord is een herinnering op dit toestel, geen gegeven over je planning.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useRecoveryMetrics } from './useRecoveryMetrics';
import { illnessSign } from '../engine/illnessSigns';
import { activeIllness } from '../engine/illness';
import { affectedMorning } from '../engine/influence';
import { MetaRepo } from '../storage/database';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { TextButton } from './TextButton';
import { IllnessReportButton } from './IllnessCard';

const SEEN_KEY = 'illnessSignSeen';
interface Seen { goodFrom?: string; notNowOn?: string }

export function IllnessSignCard() {
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

  if (!sign || !seen || seen.goodFrom === sign.from || seen.notNowOn === today) return null;
  const remember = (next: Seen) => {
    setSeen(next);
    void MetaRepo.set(SEEN_KEY, next).catch(() => undefined);
  };
  return (
    <Card>
      <Eyebrow>Je ochtenden</Eyebrow>
      <p className="mt-1 text-base" style={{ color: 'var(--color-ink)' }}>{sign.text}</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Een slechte nacht, alcohol of stress kan hetzelfde doen. Jij weet het beter dan je horloge.</p>
      <div className="mt-3 flex gap-2">
        <SecondaryButton onClick={() => remember({ ...seen, goodFrom: sign.from })}>Voel me goed</SecondaryButton>
        <IllnessReportButton label="Word ziek" />
      </div>
      <div className="mt-1 flex justify-end">
        <TextButton tone="dim" onClick={() => remember({ ...seen, notNowOn: today })}>Niet nu</TextButton>
      </div>
    </Card>
  );
}
