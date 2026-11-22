// De korte test op het logblad van een rustige loop (engine/shortTest.ts#shortTestView, I-79 stap 3): de
// feiten, en vanaf de vijfde geldige test één woord met een zin. Alleen tekst: je zones veranderen niet.
// Leest de bewaarde reeksen (alleen lezen); tot ze er zijn, of als ze niet op tijd gelezen zijn, staat er
// niets. Geen rekenwerk hier. docs/beslissingen/2026-11-18-korte-test.md

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { seriesPace, shortTestLogIds, shortTestView } from '../engine/shortTest';
import { resolveNoStrapTest, strapExpected } from '../engine/thresholdEstimate';
import { recordStrapWorn } from '../engine/zoneUpdate';
import { withTimeout } from '../utils/withTimeout';
import { Eyebrow } from './ui';
import { TextButton } from './TextButton';
import { useShortTestStreams } from './useShortTestStreams';

const SAVE_LIMIT_MS = 10_000;

export function ShortTestCard({ logId }: { logId: string }) {
  const { sessionLogs, settings, updateSettings } = useAppData();
  const series = settings.shortTestSeries;
  // De rustige lopen die aan een geplande training hangen, plus de loop waar je naar kijkt.
  const ids = useMemo(() => (seriesPace(series) === undefined ? '' : shortTestLogIds(sessionLogs, series, logId).join(',')), [sessionLogs, series, logId]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const read = useShortTestStreams(ids);
  // Alleen een volledige lezing; tot dan, of na een fout of de tijdgrens, staat er niets.
  const streams = read?.complete ? read : undefined;
  const view = useMemo(() => (streams && streams.ids === ids
    ? shortTestView({ logId, logs: sessionLogs, streams: streams.streams, series, noStrap: resolveNoStrapTest(settings.noStrapTest), strapWorn: settings.strapWorn })
    : undefined), [streams, ids, logId, sessionLogs, series, settings.noStrapTest, settings.strapWorn]);
  if (!view) return null;
  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };
  const askStrap = view.askStrap && strapExpected(sessionLogs, logId);

  async function strapWorn() {
    setBusy(true);
    setProblem(null);
    try {
      await withTimeout(updateSettings({ strapWorn: recordStrapWorn(settings.strapWorn, logId) }), SAVE_LIMIT_MS);
    } catch {
      setProblem('Bewaren lukte niet. Er is niets veranderd.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }} role="group" aria-label="Korte test" data-row="korte-test-log">
      <Eyebrow tone="var(--color-ink-dim)">Korte test</Eyebrow>
      {view.word && (
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold" style={ink}>
          {view.word === 'Let op' && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
          {view.word}
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed" style={view.word ? ink : dim}>{view.line}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {view.facts.map((f) => <li key={f} className="text-xs leading-relaxed tabular-nums" style={dim}>{f}</li>)}
      </ul>
      {askStrap && <TextButton tone="dim" size="xs" disabled={busy} onClick={() => void strapWorn()}>Ik had hem wel om</TextButton>}
      {problem && <p className="text-xs" role="status" style={{ color: 'var(--color-warning)' }}>{problem}</p>}
    </div>
  );
}
