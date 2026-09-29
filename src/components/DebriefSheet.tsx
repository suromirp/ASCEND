// ASCEND — debrief right after logging (Fase 3): what the session counted
// for, in plain numbers, and any advice this log triggered. Opens once the
// completion moment has faded; never blocks logging itself.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { extractEvidenceFromLogs, keyId } from '../engine/capability';
import { capabilityKeyLabel } from '../data/baselineQuestions';
import { formatCapabilityValue } from '../models/units';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton } from './ui';
import { AdviceItem } from './CoachCard';
import { useSheetClose } from '../utils/useSheetClose';

export function DebriefSheet() {
  const { debriefLogId, dismissDebrief, celebration, sessionLogs, templateById, advice, settings } = useAppData();
  const log = sessionLogs.find((l) => l.id === debriefLogId);
  const logAdvice = advice.filter((a) => a.relatedLogId === debriefLogId);
  const counted = useMemo(() => {
    if (!log) return [];
    const seen = new Set<string>();
    return extractEvidenceFromLogs([log]).filter((e) => (seen.has(keyId(e.key)) ? false : (seen.add(keyId(e.key)), true)));
  }, [log]);
  if (!log || celebration) return null;

  const name = templateById.get(log.templateId)?.name ?? 'Sessie';
  const strengthExternal = log.type === 'strength' && settings.strengthTrackedExternally;
  // Nothing worth a sheet: no numbers, no advice — the celebration was enough.
  if (logAdvice.length === 0 && (counted.length === 0 || strengthExternal)) return null;

  return <Sheet key={log.id} name={name} counted={counted.map((e) => `${capabilityKeyLabel(e.key)}: ${formatCapabilityValue(e.measured)}`)} logAdvice={logAdvice} strengthExternal={strengthExternal} onClose={dismissDebrief} />;
}

function Sheet({ name, counted, logAdvice, strengthExternal, onClose }: { name: string; counted: string[]; logAdvice: ReturnType<typeof useAppData>['advice']; strengthExternal: boolean; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-5 rounded-b-none border-b-0 pb-6">
            <div>
              <Eyebrow>DEBRIEF</Eyebrow>
              <p className="mt-1.5 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{name}</p>
            </div>
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
            <PrimaryButton onClick={requestClose}>SLUITEN</PrimaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
