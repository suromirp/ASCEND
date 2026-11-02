// In het logblad van een sport die meetelt (docs/visie/Sporten die meetellen.md, 2.6): hoe zwaar het voelde.
// Zonder antwoord staat erbij wat ASCEND aannam. Een keuze zet de zwaarte op het log via hetzelfde pad als
// "Hoe ging het?" na een training van het horloge (autoTick.ts#applyFeedback); verder verandert het log niet.

import { useState } from 'react';
import type { SessionLog } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { anySportDefinition } from '../../data/sports';
import { FELT_LABEL, FELT_RPE, feltWordOf, mayAskFelt, sessionLoad, type FeltWord } from '../../engine/sessionLoad';
import { resolveSportCounting, sportCounts } from '../../engine/sportRole';
import { FeltChoice } from './FeltChoice';

export function SportFeltBlock({ log }: { log: SessionLog }) {
  const { settings, setLogFeedback } = useAppData();
  const [saving, setSaving] = useState(false);
  if (!log.countedSport) return null;
  const def = anySportDefinition(log.countedSport);
  if (!sportCounts(settings, log.countedSport)) {
    return <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{`Telt niet mee: je koos Negeren voor ${def.label.toLowerCase()}.`}</p>;
  }
  const load = sessionLoad(log, def.typicalIntensity);
  // Een eigen antwoord staat vast: alleen tonen, nooit overschrijven.
  if (!mayAskFelt(log)) {
    return <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{`Hoe zwaar voelde het: ${FELT_LABEL[feltWordOf(log.rpe!)].toLowerCase()}.`}</p>;
  }
  const assumed = FELT_LABEL[feltWordOf(load.rpe - 1)].toLowerCase();
  // Vragen hoe zwaar het was staat uit: alleen wat ASCEND aannam.
  if (!resolveSportCounting(settings.sportCounting).askFelt) {
    return <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{`ASCEND nam aan: ${assumed}.`}</p>;
  }
  async function pick(word: FeltWord) {
    if (saving || !mayAskFelt(log)) return;
    setSaving(true);
    try {
      await setLogFeedback(log.id, { rpe: FELT_RPE[word], onlyIfOpen: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mt-4">
      <FeltChoice
        value={undefined}
        onPick={(w) => void pick(w)}
        note={`ASCEND nam aan: ${assumed}. Tik als het anders was. Je antwoord staat daarna vast.`}
      />
    </div>
  );
}
