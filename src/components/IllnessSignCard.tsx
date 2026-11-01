// Vroeg ziek zien op Vandaag (engine/illnessSigns.ts): alleen als je rusthartslag en HRV een paar
// ochtenden samen afwijken. Een vraag, geen waarschuwing: "Voel me goed" laat deze reeks rusten,
// "Word ziek" opent de gewone ziekmelding (een voorstel met Akkoord), "Niet nu" verbergt hem
// vandaag. Je antwoord is een herinnering op dit toestel, geen gegeven over je planning.

import type { IllnessSignState } from './useIllnessSign';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { TextButton } from './TextButton';
import { IllnessReportButton } from './IllnessCard';

export function IllnessSignCard({ state }: { state: IllnessSignState }) {
  const { shown, sign, seen, today, remember } = state;
  if (!shown || !sign || !seen) return null;
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
