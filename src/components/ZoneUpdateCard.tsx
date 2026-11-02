// Zones bijwerken na een test (engine/zoneUpdate.ts): per zone het oude en het nieuwe getal, met
// Liever niet en Akkoord. Akkoord bewaart alleen je drempelhartslag; Liever niet laat alles staan.
// Geen rekenwerk hier. docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions } from '../engine/testJudgment';
import { recordZoneAnswer, zoneOffer } from '../engine/zoneUpdate';
import { todayISO } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';
import { SecondaryButton } from './ui';
import { TextButton } from './TextButton';

const SAVE_LIMIT_MS = 10_000;

export function ZoneUpdateCard({ logId }: { logId: string }) {
  const { sessionLogs, settings, updateSettings } = useAppData();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const offer = useMemo(
    () => zoneOffer({ logId, logs: sessionLogs, options: judgmentOptions(settings), heartRate: settings.heartRate, enabled: settings.zonesAfterTest !== false, answers: settings.zoneAnswers }),
    [logId, sessionLogs, settings],
  );
  const accepted = settings.zoneAnswers?.find((a) => a.logId === logId && a.answer === 'accepted');
  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };

  async function save(patch: Parameters<typeof updateSettings>[0]) {
    setBusy(true);
    setProblem(null);
    try {
      await withTimeout(updateSettings(patch), SAVE_LIMIT_MS);
    } catch {
      setProblem('Bewaren lukte niet. Er is niets veranderd.');
    } finally {
      setBusy(false);
    }
  }

  // Na Akkoord: wat er nu staat, met Ongedaan maken zolang je drempel nog die van dit voorstel is.
  if (!offer && accepted && settings.heartRate?.lthr === accepted.lthrTo) {
    return (
      <div className="mt-3" role="status">
        <p className="text-xs" style={dim}>
          Je drempelhartslag is bijgewerkt naar <span className="tabular-nums">{accepted.lthrTo}</span> bpm
          {accepted.lthrFrom !== undefined ? <>, hij was <span className="tabular-nums">{accepted.lthrFrom}</span></> : null}.
        </p>
        <TextButton tone="dim" size="xs" disabled={busy} onClick={() => void save({
          heartRate: { ...settings.heartRate, lthr: accepted.lthrFrom },
          zoneAnswers: recordZoneAnswer(settings.zoneAnswers, { ...accepted, answer: 'declined', date: todayISO() }),
        })}>Ongedaan maken</TextButton>
        {problem && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>{problem}</p>}
      </div>
    );
  }
  if (!offer) return null;

  const answer = (kind: 'accepted' | 'declined') => {
    const entry = { logId, answer: kind, date: todayISO(), ...(offer.lthrFrom !== undefined ? { lthrFrom: offer.lthrFrom } : {}), lthrTo: offer.lthrTo };
    void save(kind === 'accepted'
      ? { heartRate: { ...settings.heartRate, lthr: offer.lthrTo }, zoneAnswers: recordZoneAnswer(settings.zoneAnswers, entry) }
      : { zoneAnswers: recordZoneAnswer(settings.zoneAnswers, entry) });
  };

  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }} role="group" aria-label="Zones bijwerken">
      <p className="text-sm font-semibold" style={ink}>Je zones na deze test</p>
      <p className="mt-1 text-xs leading-relaxed" style={dim}>
        Je hartslag in deze test wijst op een drempel van <span className="tabular-nums">{offer.lthrTo}</span> bpm
        {offer.lthrFrom !== undefined ? <>; nu staat er <span className="tabular-nums">{offer.lthrFrom}</span></> : '; je had er nog geen ingevuld'}. Een schatting, geen labtest.
      </p>
      <ul className="mt-2 flex flex-col gap-2.5">
        {offer.hrRows.map((r) => (
          <li key={r.label} className="text-sm">
            <span style={ink}>{r.label}</span>
            <span className="block text-xs" style={dim}>Nu <span className="tabular-nums">{r.from}</span></span>
            <span className="block tabular-nums" style={{ color: 'var(--color-action)' }}>Straks {r.to}</span>
          </li>
        ))}
      </ul>
      {offer.paceRows.length > 0 && (
        <>
          <p className="mt-3 text-sm" style={ink}>Je tempo's na deze test</p>
          <ul className="mt-1 flex flex-col gap-2.5">
            {offer.paceRows.map((r) => (
              <li key={r.label} className="text-sm">
                <span style={ink}>{r.label}</span>
                <span className="block text-xs" style={dim}>Was <span className="tabular-nums">{r.from}</span></span>
                <span className="block tabular-nums" style={ink}>Nu {r.to}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs leading-relaxed" style={dim}>Je tempo's volgen je test al. Akkoord verandert alleen je hartslagzones.</p>
        </>
      )}
      {problem && <p className="mt-2 text-xs" style={{ color: 'var(--color-warning)' }}>{problem}</p>}
      <div className="mt-3 flex gap-3">
        <SecondaryButton disabled={busy} onClick={() => answer('declined')}>Liever niet</SecondaryButton>
        <SecondaryButton disabled={busy} onClick={() => answer('accepted')}>Akkoord</SecondaryButton>
      </div>
    </div>
  );
}
