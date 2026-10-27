// De test na afloop: wat er is gelezen (beste 5 km of hele run), de vraag bij een
// twijfeltest en "Telt niet mee" achteraf. Geen rekenwerk hier: engine/testJudgment.ts
// zegt hoe de test erbij staat en welke tempo's veranderen. Een antwoord dat tempo's
// verandert, laat eerst de getallen zien (was en wordt) en wacht op Akkoord.
// docs/beslissingen/2026-10-27-testloop-lezen.md

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { effortOffer, judgmentOptions, previewEffort, previewVerdict, testBasisLine, testState, upsertTestJudgment, type PaceChangeRow } from '../engine/testJudgment';
import { formatRaceTime, TEST_DISTANCE_KM } from '../engine/racePrediction';
import { acceptBestEffort } from '../storage/activityDetail';
import type { TestVerdict } from '../models/testJudgment';
import { todayISO } from '../utils/dates';
import { SecondaryButton } from './ui';
import { TextButton } from './TextButton';

export function TestVerdictCard({ logId }: { logId: string }) {
  const { sessionLogs, settings, updateSettings, refresh } = useAppData();
  const [asked, setAsked] = useState<{ verdict: TestVerdict; rows: PaceChangeRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const log = sessionLogs.find((l) => l.id === logId);
  const offer = useMemo(() => (log ? effortOffer(log) : undefined), [log]);
  // The best stretch of this run, when counting it would change your paces: shown first, as numbers.
  const offerRows = useMemo(() => (offer ? previewEffort(sessionLogs, settings, logId) : []), [offer, sessionLogs, settings, logId]);
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

  async function acceptOffer() {
    setBusy(true);
    try {
      if (await acceptBestEffort(logId)) await refresh();
    } finally {
      setBusy(false);
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
      <PaceRows
        title={asked.verdict === 'counts' ? 'Dit worden je tempo\'s' : 'Dit worden je tempo\'s zonder deze test'}
        rows={asked.rows}
        busy={busy}
        onAkkoord={() => void save(asked.verdict)}
        onCancel={() => setAsked(null)}
      />
    );
  }

  return (
    <div>
      {offer && offerRows.length > 0 && !offerDismissed && (
        <div className="mb-4">
          <p className="text-sm" style={ink}>
            Uit je run blijkt een beste {String(TEST_DISTANCE_KM).replace('.', ',')} km van <span className="tabular-nums">{formatRaceTime(offer.minutes)}</span>. Je tempo's rekenden met de hele run.
          </p>
          <div className="mt-2">
            <PaceRows title="Dit worden je tempo's" rows={offerRows} busy={busy} onAkkoord={() => void acceptOffer()} onCancel={() => setOfferDismissed(true)} cancelLabel="Niet nu" />
          </div>
        </div>
      )}
      <p className="text-xs" style={dim}>{testBasisLine(state.result)}</p>
      {state.result.basis === 'whole' && !!log?.externalId && !log.bestEffort && !log.bestEffortTried && (
        <p className="text-xs" style={dim}>Dit is de hele run. De beste {String(TEST_DISTANCE_KM).replace('.', ',')} km komt erbij zodra de reeks van je horloge binnen is.</p>
      )}
      {state.standing === 'pending' && (
        <div className="mt-3">
          <p className="text-sm font-semibold" style={ink}>Deze test was trager dan je vorige. Telt hij mee voor je tempo's?</p>
          <p className="mt-1 text-xs leading-relaxed" style={dim}>
            Fietsen vooraf, wind of vermoeide benen maken een test trager. Dat zegt weinig over je vorm. Tot je antwoordt blijven je tempo's die van je vorige test.
          </p>
          {state.newerWaits && <p className="mt-1 text-xs leading-relaxed" style={dim}>Een nieuwere test wacht ook op je antwoord.</p>}
          <div className="mt-3 flex gap-3">
            <SecondaryButton disabled={busy} onClick={() => choose('counts')}>Telt mee</SecondaryButton>
            <SecondaryButton disabled={busy} onClick={() => choose('ignore')}>Telt niet mee</SecondaryButton>
          </div>
        </div>
      )}
      {state.standing === 'held' && (
        <div className="mt-3">
          <p className="text-sm font-semibold" style={ink}>Deze test was trager dan je vorige en is niet meegeteld. Telt hij toch mee?</p>
          <p className="mt-1 text-xs leading-relaxed" style={dim}>Een nieuwere test bepaalt nu je tempo's.</p>
          <div className="mt-3 flex gap-3">
            <SecondaryButton disabled={busy} onClick={() => choose('counts')}>Laten meetellen</SecondaryButton>
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

// De tempo's van nu naar straks, met Akkoord en Annuleren: eerst zien, dan bewaren.
function PaceRows({ title, rows, busy, onAkkoord, onCancel, cancelLabel = 'Annuleren' }: { title: string; rows: PaceChangeRow[]; busy: boolean; onAkkoord: () => void; onCancel: () => void; cancelLabel?: string }) {
  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };
  return (
    <div role="group" aria-label="Wat er verandert">
      <p className="text-sm font-semibold" style={ink}>{title}</p>
      <ul className="mt-2 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <span style={ink}>{r.label}</span>
            <span className="block text-xs" style={dim}>Nu <span className="tabular-nums">{r.from}</span></span>
            <span className="block tabular-nums" style={{ color: 'var(--color-action)' }}>Straks {r.to}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed" style={dim}>Je trainingen en het horloge gebruiken deze tempo's bij de volgende keer synchroniseren.</p>
      <div className="mt-3 flex gap-3">
        <SecondaryButton disabled={busy} onClick={onAkkoord}>Akkoord</SecondaryButton>
        <SecondaryButton disabled={busy} onClick={onCancel}>{cancelLabel}</SecondaryButton>
      </div>
    </div>
  );
}
