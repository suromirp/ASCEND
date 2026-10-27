// De test na afloop: wat er is gelezen (beste 5 km of hele run), de vraag bij een
// twijfeltest en "Telt niet mee" achteraf. Geen rekenwerk hier: engine/testJudgment.ts
// zegt hoe de test erbij staat en welke tempo's veranderen. Een antwoord dat tempo's
// verandert, laat eerst de getallen zien (was en wordt) en wacht op Akkoord.
// docs/beslissingen/2026-10-27-testloop-lezen.md

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, previewVerdict, testBasisLine, testState, upsertTestJudgment, type PaceChangeRow } from '../engine/testJudgment';
import type { TestVerdict } from '../models/testJudgment';
import { todayISO } from '../utils/dates';
import { SecondaryButton } from './ui';
import { TextButton } from './TextButton';

export function TestVerdictCard({ logId }: { logId: string }) {
  const { sessionLogs, settings, updateSettings } = useAppData();
  const [asked, setAsked] = useState<{ verdict: TestVerdict; rows: PaceChangeRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const state = useMemo(() => testState(sessionLogs, judgmentOptions(settings), logId), [sessionLogs, settings, logId]);
  if (!state) return null;

  async function save(verdict: TestVerdict) {
    setBusy(true);
    try {
      const list = upsertTestJudgment(settings.testJudgments, { logId, verdict, date: todayISO() });
      await updateSettings({ testJudgments: list });
    } finally {
      setBusy(false);
      setAsked(null);
    }
  }

  // Giving a verdict: when it changes paces, show them first.
  function choose(verdict: TestVerdict) {
    const rows = previewVerdict(sessionLogs, settings, logId, verdict, todayISO());
    if (rows.length === 0) void save(verdict);
    else setAsked({ verdict, rows });
  }

  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };

  if (asked) {
    return (
      <div role="group" aria-label="Wat er verandert">
        <p className="text-sm font-semibold" style={ink}>
          {asked.verdict === 'counts' ? 'Dit worden je tempo\'s' : 'Dit worden je tempo\'s zonder deze test'}
        </p>
        <ul className="mt-2 flex flex-col gap-2.5">
          {asked.rows.map((r) => (
            <li key={r.label} className="text-sm">
              <span style={ink}>{r.label}</span>
              <span className="block text-xs" style={dim}>Nu <span className="tabular-nums">{r.from}</span></span>
              <span className="block tabular-nums" style={{ color: 'var(--color-action)' }}>Straks {r.to}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed" style={dim}>Je trainingen en het horloge gebruiken deze tempo's bij de volgende keer synchroniseren.</p>
        <div className="mt-3 flex gap-3">
          <SecondaryButton disabled={busy} onClick={() => void save(asked.verdict)}>Akkoord</SecondaryButton>
          <SecondaryButton disabled={busy} onClick={() => setAsked(null)}>Annuleren</SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs" style={dim}>{testBasisLine(state.result)}</p>
      {state.standing === 'pending' && (
        <div className="mt-3">
          <p className="text-sm font-semibold" style={ink}>Deze test was trager dan je vorige. Telt hij mee voor je tempo's?</p>
          <p className="mt-1 text-xs leading-relaxed" style={dim}>
            Fietsen vooraf, wind of vermoeide benen maken een test trager. Dat zegt weinig over je vorm. Tot je antwoordt blijven je tempo's die van je vorige test.
          </p>
          <div className="mt-3 flex gap-3">
            <SecondaryButton disabled={busy} onClick={() => choose('counts')}>Telt mee</SecondaryButton>
            <SecondaryButton disabled={busy} onClick={() => choose('ignore')}>Telt niet mee</SecondaryButton>
          </div>
        </div>
      )}
      {state.standing === 'counts' && (
        <div className="mt-1">
          <p className="text-xs" style={dim}>Deze test telt mee voor je tempo's en je voorspelling.</p>
          <TextButton tone="dim" size="xs" disabled={busy} onClick={() => choose('ignore')}>Telt niet mee</TextButton>
        </div>
      )}
      {state.standing === 'ignored' && (
        <div className="mt-1">
          <p className="text-xs" style={dim}>Deze test blijft in je logboek, maar telt niet mee voor je tempo's en je voorspelling.</p>
          <TextButton size="xs" disabled={busy} onClick={() => choose('counts')}>Laten meetellen</TextButton>
        </div>
      )}
    </div>
  );
}
