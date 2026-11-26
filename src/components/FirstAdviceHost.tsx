// ASCEND: belangrijk advies als blad bij het openen (I-157, docs/visie/Plek belangrijk advies.md,
// docs/beslissingen/2026-11-26-belangrijk-advies-als-blad.md).
//
// Een groot voorstel (een rustiger instap, golven zonder doel, de ladder van heel licht) komt bij het openen één keer
// als eigen blad naar voren. Welk advies en wanneer niet kiest engine/adviceFirst.ts#firstSheetAdvice; dit tekent het
// blad, gebouwd zoals DebriefSheet. De kaart op Vandaag blijft staan, met Liever niet.
//
// Niet nu (ook een tik op de achtergrond of terug) is geen antwoord: alleen `firstSheet` onthoudt het, de volgende
// keer is morgen, hoogstens drie keer. Bekijk opent het voorstel van de planningsronde, zoals de kaart. Akkoord
// rekent het plan uit en past het meteen toe (useHorizonChange met `direct`), met een tijdsgrens en de uitkomst in
// het blad; onderin staat daarna wat er veranderde, met ongedaan maken.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice } from '../engine/adviceEngine';
import {
  FIRST_SHEET_DONE_NOTE, FIRST_SHEET_FAILED_NOTE, FIRST_SHEET_SETTLE_MS, FIRST_SHEET_SLOW_NOTE, FIRST_SHEET_TIMEOUT_MS, firstSheetAdvice, pausedToday,
  rememberFirstSheetNotNow, rememberFirstSheetShown,
} from '../engine/adviceFirst';
import { WAITING_LINE } from '../engine/oneAnswerPerDay';
import { needsFirstPlan } from '../engine/freshStart';
import { effortWords } from '../engine/forgeWords';
import { useSheetRow, useInSheetRow } from '../state/sheetRow';
import { forgeOpenSnapshot, subscribeForgeOpen } from '../utils/forgeSessionStore';
import { useSheetClose } from '../utils/useSheetClose';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { todayISO } from '../utils/dates';
import { useOpenRequest, useSessionPill } from './forge/useForgeSession';
import { useForgeWords } from './useForgeWords';
import { useAdviceAccept } from './useAdviceAccept';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, SheetGrip } from './ui';
import { TextButton } from './TextButton';

export function FirstAdviceHost({ ready }: { ready: boolean }) {
  const { advice, settings, updateSettings, program, plannedSessions, openDraftId, leavePeriods } = useAppData();
  const row = useSheetRow();
  const pill = useSessionPill();
  const forgeOpen = useSyncExternalStore(subscribeForgeOpen, forgeOpenSnapshot);
  const request = useOpenRequest();
  const [settled, setSettled] = useState(false);
  const [shown, setShown] = useState<Advice | null>(null);
  // Hoogstens één blad per keer dat je de app opent.
  const opened = useRef(false);
  const today = todayISO();

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setSettled(true), FIRST_SHEET_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  const candidate = useMemo(() => {
    if (!ready || !settled) return undefined;
    return firstSheetAdvice(advice, {
      on: settings.firstAdviceSheet !== false,
      today,
      memory: settings.firstSheet,
      hasPlan: !needsFirstPlan({ programs: program ? 1 : 0, plannedSessions: plannedSessions.length }),
      trainingOpen: !!pill || forgeOpen || request,
      draftOpen: !!openDraftId,
      otherSheetOpen: row.length > 0,
      paused: pausedToday(today, leavePeriods, settings.illnessEpisodes),
    });
  }, [ready, settled, advice, settings.firstAdviceSheet, settings.firstSheet, settings.illnessEpisodes, today, program, plannedSessions.length, pill, forgeOpen, request, openDraftId, row.length, leavePeriods]);

  useEffect(() => {
    if (!candidate || opened.current) return;
    opened.current = true;
    setShown(candidate);
    // Getoond is getoond: zonder Niet nu komt dit advies niet meer als blad.
    void updateSettings({ firstSheet: rememberFirstSheetShown(settings.firstSheet, candidate.id, today) });
  }, [candidate, settings.firstSheet, today, updateSettings]);

  if (!shown) return null;
  return (
    <FirstAdviceSheet
      key={shown.id}
      advice={shown}
      onNotNow={() => void updateSettings({ firstSheet: rememberFirstSheetNotNow(settings.firstSheet, shown.id, today) })}
      onDone={() => setShown(null)}
    />
  );
}

// ask: de vraag. busy: Akkoord of Bekijk rekent. settle: Akkoord is klaar of wacht op een voorstel dat toch eerst moet
// (twee doelen die botsen). viewing: het voorstel van Bekijk staat erboven, dit blad is weg. done: de uitkomst.
type Phase = 'ask' | 'busy' | 'settle' | 'viewing' | 'done';

function FirstAdviceSheet({ advice, onNotNow, onDone }: { advice: Advice; onNotNow: () => void; onDone: () => void }) {
  const { respondToAdvice } = useAppData();
  const words = useForgeWords();
  const { horizon, accept } = useAdviceAccept(advice);
  const [phase, setPhase] = useState<Phase>('ask');
  const [outcome, setOutcome] = useState<string | null>(null);
  // Dicht zonder antwoord (achtergrond, terug, Niet nu) telt als Niet nu; na Bekijk of Akkoord niet meer.
  const answered = useRef(false);
  const { closing, requestClose, sheetRef } = useSheetClose(() => {
    if (!answered.current) onNotNow();
    onDone();
  // Niet dicht terwijl het rekent of terwijl het voorstel van Bekijk erboven staat (dat sluit eerst zelf).
  }, 200, () => phase !== 'busy' && phase !== 'settle' && !horizon.sheet);
  useInSheetRow('first-advice', true);

  // Na Akkoord of Bekijk: staat er geen voorstel (meer), dan de uitkomst in het blad, of dicht als er niets te zeggen is
  // (Bekijk, en het voorstel ging dicht zonder antwoord).
  const after = (phase === 'settle' || phase === 'viewing') && !horizon.sheet && !horizon.busy;
  const showDone = phase === 'done' || (after && (phase === 'settle' || !!horizon.note || !!outcome));
  const closeNow = after && !showDone;
  useEffect(() => {
    if (closeNow) requestClose();
  }, [closeNow, requestClose]);

  async function agree() {
    answered.current = true;
    setPhase('busy');
    try {
      const own = await withTimeout(accept(true), FIRST_SHEET_TIMEOUT_MS);
      if (!own) await withTimeout(respondToAdvice(advice, 'accepted'), FIRST_SHEET_TIMEOUT_MS);
      setPhase('settle');
    } catch (err) {
      // Te lang: de ronde loopt door; de melding onderin zegt het zodra hij klaar is (useHorizonChange, onLate).
      setOutcome(err instanceof TimeoutError ? FIRST_SHEET_SLOW_NOTE : FIRST_SHEET_FAILED_NOTE);
      setPhase('done');
    }
  }

  async function view() {
    answered.current = true;
    setPhase('busy');
    await accept(false);
    setPhase('viewing');
  }

  const busy = !showDone && (phase === 'busy' || phase === 'settle');
  return (
    <>
      {(phase !== 'viewing' || showDone) && (
        <Portal>
          <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={busy ? undefined : requestClose}>
            <div ref={sheetRef} className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="first-advice-title">
              <SheetGrip />
              <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-6">
                <div>
                  <Eyebrow>Voorstel</Eyebrow>
                  <p id="first-advice-title" className="mt-1.5 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{advice.title}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{effortWords(advice.effect, words)}</p>
                  {!!advice.waiting?.length && <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{WAITING_LINE}</p>}
                </div>
                {showDone ? (
                  <>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{outcome ?? horizon.note ?? FIRST_SHEET_DONE_NOTE}</p>
                    <SecondaryButton onClick={requestClose}>Begrepen</SecondaryButton>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => void agree()} disabled={busy}>{busy ? 'Bezig…' : 'Akkoord'}</PrimaryButton>
                    <SecondaryButton onClick={() => void view()} disabled={busy}>Bekijk</SecondaryButton>
                    <TextButton tone="dim" onClick={requestClose} disabled={busy} className="min-h-[44px] self-center">Niet nu</TextButton>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Portal>
      )}
      {horizon.sheet}
    </>
  );
}
