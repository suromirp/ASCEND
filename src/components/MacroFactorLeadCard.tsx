// ASCEND: "MacroFactor is leidend voor kracht", the screens
// (engine/macrofactorLead.ts,
// docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md).
//
// - The switch, on by default, on the MacroFactor page. Off: a training you
//   logged already is only filled in where a field is empty.
// - The list of what MacroFactor took over, with "Terugzetten" per training or
//   for all of them: the own numbers of before come back (they are kept on the
//   log) and ASCEND does not offer that workout again.

import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import { setMacroFactorLeads } from '../storage/macrofactor';
import { useMacroFactor } from '../state/useMacroFactor';
import { describeStrengthManualLine, isStrengthTakeover } from '../engine/macrofactorLead';
import type { SessionLog, SessionTemplate } from '../models/training';
import { formatDateNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, Num, SecondaryButton, Toggle, SheetGrip } from './ui';
import { TextButton } from './TextButton';

function countLabel(n: number): ReactNode {
  return n === 1 ? <><Num>1</Num> training</> : <><Num>{n}</Num> trainingen</>;
}

const templateName = (templates: SessionTemplate[], log: SessionLog) => templates.find((t) => t.id === log.templateId)?.name ?? 'Training';

export function MacroFactorLeadCard() {
  const { sessionLogs, templates } = useAppData();
  const { state, loaded } = useMacroFactor();
  const [open, setOpen] = useState(false);
  const taken = sessionLogs.filter(isStrengthTakeover).sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  if (!loaded) return null;
  return (
    <>
      <Card className="flex flex-col gap-3">
        <Eyebrow>Kracht</Eyebrow>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>MacroFactor is leidend voor kracht</p>
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Voor een krachttraining die je al had vastgelegd nemen de cijfers van MacroFactor het over: duur, oefeningen, sets en herhalingen in reserve. Wat jij zelf invulde, zoals gevoel, inspanning, pijn en notities, blijft staan. Je eigen cijfers worden bewaard en je kunt ze terugzetten. Uit betekent: ASCEND vult alleen aan wat nog leeg is.
            </p>
          </div>
          <Toggle checked={state.leads} onChange={(on) => void setMacroFactorLeads(on)} label="MacroFactor is leidend voor kracht" />
        </div>
        {taken.length > 0 && <SecondaryButton onClick={() => setOpen(true)}>Bekijken en terugzetten</SecondaryButton>}
      </Card>
      {open && <TakenSheet taken={taken} templates={templates} onClose={() => setOpen(false)} />}
    </>
  );
}

function TakenSheet({ taken, templates, onClose }: { taken: SessionLog[]; templates: SessionTemplate[]; onClose: () => void }) {
  const { restoreFromMacroFactor } = useAppData();
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [busy, setBusy] = useState(false);

  async function restore(ids: string[]) {
    if (busy) return;
    setBusy(true);
    try {
      await restoreFromMacroFactor(ids);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>MacroFactor is leidend voor kracht</Eyebrow>
            <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>
              {taken.length === 0 ? 'Niets overgenomen' : <>{countLabel(taken.length)} overgenomen</>}
            </p>
            {taken.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Alles staat weer op je eigen cijfers.</p>
            ) : (
              <>
                <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  Bij elke training staan hieronder je eigen cijfers van toen. Met Terugzetten komen ze terug en is de training weer helemaal van jou. ASCEND biedt die training uit MacroFactor dan niet opnieuw aan.
                </p>
                <ul className="flex flex-col gap-2">
                  {taken.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
                      <div className="min-w-0">
                        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{templateName(templates, log)} {formatDateNL(log.completedDate)}</p>
                        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{describeStrengthManualLine(log)}</p>
                      </div>
                      <TextButton onClick={() => void restore([log.id])} disabled={busy} className="shrink-0 px-2">
                        Terugzetten
                      </TextButton>
                    </li>
                  ))}
                </ul>
                {taken.length > 1 && (
                  <SecondaryButton onClick={() => void restore(taken.map((l) => l.id))} disabled={busy}>
                    {busy ? 'Bezig…' : 'Alles terugzetten'}
                  </SecondaryButton>
                )}
              </>
            )}
            <SecondaryButton onClick={requestClose}>Sluiten</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
