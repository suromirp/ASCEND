// In het logblad van een sport die meetelt (docs/visie/Sporten die meetellen.md, 2.6): hoe zwaar het voelde.
// Zonder antwoord staat erbij wat ASCEND aannam. Een keuze zet de zwaarte op het log via hetzelfde pad als
// "Hoe ging het?" na een training van het horloge (autoTick.ts#applyFeedback); verder verandert het log niet.

import { useState } from 'react';
import type { SessionLog } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { anySportDefinition } from '../../data/sports';
import { FELT_LABEL, FELT_RPE, feltWordOf, sessionLoad, type FeltWord } from '../../engine/sessionLoad';
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
  const given = log.rpe !== undefined && !log.rpeAssumed ? feltWordOf(log.rpe) : undefined;
  // Vragen hoe zwaar het was staat uit: alleen het feit.
  if (!resolveSportCounting(settings.sportCounting).askFelt && !given) {
    return <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{`ASCEND nam aan: ${FELT_LABEL[feltWordOf(load.rpe - 1)].toLowerCase()}.`}</p>;
  }
  async function pick(word: FeltWord) {
    if (saving) return;
    setSaving(true);
    try {
      await setLogFeedback(log.id, { rpe: FELT_RPE[word] });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mt-4">
      <FeltChoice
        value={given}
        onPick={(w) => void pick(w)}
        note={given ? 'Hoe zwaarder het voelde, hoe meer het meetelt voor je benen.' : `ASCEND nam aan: ${FELT_LABEL[feltWordOf(load.rpe - 1)].toLowerCase()}. Tik als het anders was.`}
      />
    </div>
  );
}
