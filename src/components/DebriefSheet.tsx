// ASCEND — debrief right after logging (Fase 3): what the session counted
// for, in plain numbers, and any advice this log triggered. Opens once the
// completion moment has faded; never blocks logging itself.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { testMeaning, type TestMeaning } from '../engine/racePaces';
import { judgmentOptions, pacesFromLogs, testState } from '../engine/testJudgment';
import { TestVerdictCard } from './TestVerdictCard';
import { TEST_TEMPLATE_ID } from '../engine/raceBlock';
import { extractEvidenceFromLogs, keyId } from '../engine/capability';
import { capabilityKeyLabel } from '../data/baselineQuestions';
import { formatCapabilityValue } from '../models/units';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton } from './ui';
import { AdviceItem } from './CoachCard';
import { useSheetClose } from '../utils/useSheetClose';

export function DebriefSheet() {
  const { debriefLogId, dismissDebrief, celebration, sessionLogs, templateById, advice, strengthExternal: externalStrength, settings } = useAppData();
  const log = sessionLogs.find((l) => l.id === debriefLogId);
  const logAdvice = advice.filter((a) => a.relatedLogId === debriefLogId);
  const counted = useMemo(() => {
    if (!log) return [];
    const seen = new Set<string>();
    return extractEvidenceFromLogs([log]).filter((e) => (seen.has(keyId(e.key)) ? false : (seen.add(keyId(e.key)), true)));
  }, [log]);
  // A test run: what it means for your paces and your race.
  const meaning = useMemo(() => {
    if (!log || log.templateId !== TEST_TEMPLATE_ID) return undefined;
    const paces = pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces;
    return paces && paces.test.logId === log.id ? testMeaning(paces) : undefined;
  }, [log, sessionLogs, settings]);
  // A test log: it shows what was read, and asks when the test came out slower.
  const isTest = !!log && log.templateId === TEST_TEMPLATE_ID && !!testState(sessionLogs, judgmentOptions(settings), log.id);
  if (!log || celebration) return null;

  const name = templateById.get(log.templateId)?.name ?? 'Sessie';
  const strengthExternal = log.type === 'strength' && externalStrength;
  // Nothing worth a sheet: no numbers, no advice — the celebration was enough.
  if (logAdvice.length === 0 && !meaning && !isTest && (counted.length === 0 || strengthExternal)) return null;

  return <Sheet key={log.id} name={name} counted={counted.map((e) => `${capabilityKeyLabel(e.key)}: ${formatCapabilityValue(e.measured)}`)} logAdvice={logAdvice} strengthExternal={strengthExternal} meaning={meaning} testLogId={isTest ? log.id : undefined} onClose={dismissDebrief} />;
}

function Sheet({ name, counted, logAdvice, strengthExternal, meaning, testLogId, onClose }: { name: string; counted: string[]; logAdvice: ReturnType<typeof useAppData>['advice']; strengthExternal: boolean; meaning?: TestMeaning; testLogId?: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-5 rounded-b-none border-b-0 pb-6">
            <div>
              <Eyebrow>Terugblik</Eyebrow>
              <p className="mt-1.5 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{name}</p>
            </div>
            {meaning && (
              <div>
                <Eyebrow>Dit betekent je test</Eyebrow>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{meaning.headline}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {meaning.rows.map((r) => (
                    <li key={r.label}>
                      <p className="flex items-baseline justify-between gap-3 text-sm">
                        <span style={{ color: 'var(--color-ink)' }}>{r.label}</span>
                        <span className="tabular-nums" style={{ color: 'var(--color-action)' }}>{r.value}</span>
                      </p>
                      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{r.hint}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{meaning.note}</p>
              </div>
            )}
            {testLogId && <TestVerdictCard logId={testLogId} />}
            {counted.length > 0 && !strengthExternal && (
              <div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Telt mee voor</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-sm" style={{ color: 'var(--color-ink)' }}>
                  {counted.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            )}
            {logAdvice.map((a) => (
              <div key={a.id}>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{a.title}</p>
                <div className="mt-1"><AdviceItem advice={a} compact /></div>
              </div>
            ))}
            <PrimaryButton onClick={requestClose}>Begrepen</PrimaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
