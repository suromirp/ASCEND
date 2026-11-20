// De korte test in de Briefing van een rustige loop (engine/shortTest.ts#shortTestBriefing, I-79 stap 3):
// op de dag van de test het blok met de stappen, en zolang er geen antwoord is het voorstel met Liever niet
// en Akkoord. Akkoord legt het testtempo van de reeks vast; Liever niet laat alles staan. Geen rekenwerk hier.
// `minutes`: de minuten van de ene regel voor Briefing en horloge (engine/shortTest.ts#shortTestRunMinutes).
// docs/beslissingen/2026-11-18-korte-test.md

import { useMemo, useState } from 'react';
import type { PlannedSession } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { shortTestBriefing, shortTestDone, shortTestOn } from '../engine/shortTest';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { syncWatchWorkouts } from '../storage/watchWorkouts';
import { todayISO } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';
import { Card, Eyebrow, SecondaryButton } from './ui';

const SAVE_LIMIT_MS = 10_000;

export function ShortTestBlock({ session, minutes, place }: { session: PlannedSession | undefined; minutes: number | undefined; place: string | undefined }) {
  const { settings, sessionLogs, plannedSessions, updateSettings } = useAppData();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const today = todayISO();
  const view = useMemo(() => shortTestBriefing({
    session, minutes, sessions: plannedSessions, on: shortTestOn(settings.shortTest), series: settings.shortTestSeries,
    paces: pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces, place,
    ...shortTestDone(today, sessionLogs),
  }), [session, minutes, plannedSessions, settings, sessionLogs, today, place]);
  if (!view) return null;
  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };

  if (view.kind === 'brief') {
    return (
      <Card className="flex flex-col gap-2" role="group" aria-label={view.brief.title} data-row="korte-test">
        <Eyebrow tone="var(--color-ink-dim)">{view.brief.title}</Eyebrow>
        <ol className="flex flex-col gap-1">
          {view.brief.steps.map((s) => <li key={s} className="text-sm leading-snug tabular-nums" style={ink}>{s}</li>)}
        </ol>
        <p className="text-xs leading-snug" style={dim}>{view.brief.note}</p>
      </Card>
    );
  }

  const { offer } = view;
  async function answer(kind: 'accepted' | 'declined') {
    setBusy(true);
    setProblem(null);
    try {
      await withTimeout(updateSettings({ shortTestSeries: kind === 'accepted' ? { answer: 'accepted', date: today, paceSecKm: offer.paceSecKm } : { answer: 'declined', date: today } }), SAVE_LIMIT_MS);
      // De rustige loop met de test gaat meteen naar je horloge als het sturen aan staat; het stuurt zelf niets als het uit staat.
      if (kind === 'accepted') void syncWatchWorkouts({ force: true });
    } catch {
      setProblem('Bewaren lukte niet. Er is niets veranderd.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2" role="group" aria-label={offer.title} data-row="korte-test-voorstel">
      <p className="text-sm font-semibold" style={ink}>{offer.title}</p>
      {offer.lines.map((l) => <p key={l} className="text-xs leading-relaxed tabular-nums" style={dim}>{l}</p>)}
      {problem && <p className="text-xs" role="status" style={{ color: 'var(--color-warning)' }}>{problem}</p>}
      <div className="mt-1 flex gap-3">
        <SecondaryButton disabled={busy} onClick={() => void answer('declined')}>Liever niet</SecondaryButton>
        <SecondaryButton disabled={busy} onClick={() => void answer('accepted')}>Akkoord</SecondaryButton>
      </div>
    </Card>
  );
}
