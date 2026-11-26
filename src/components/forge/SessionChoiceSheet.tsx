// Het blad met de keuze voor een training die bleef liggen (de pil, en eenmaal bij het openen van de app) of die
// nog loopt terwijl je een andere start (OtherSessionRunning.tsx). Profiel afbreker, 14 november, backlog N.
//
// Afronden opent Forge op het blad Training afronden met wat je deed; Verder opent Forge waar je was; Verwijderen
// pas na een tweede tik met Annuleren ernaast (engine/forgeSession.ts#discardTap). Bij een concept wordt de stille
// tijd eerst een pauze (utils/forgeSessionStore.ts#parkSession), zodat de duur alleen de tijd telt dat je trainde.
// Is de training elders al afgerond of verwijderd (bij een keuze, of terwijl het blad openstaat), dan zegt het blad
// dat en sluit het niet stil; met een vervolg (een nieuwe training starten) start die na Begrepen. De planning en
// het logboek veranderen hier nooit.

import { useEffect, useRef, useState } from 'react';
import { GONE_NEXT_TEXT, SESSION_GONE_TEXT, afterChoiceClose, choiceSheetSeesGone, discardTap, leftActiveSeconds, leftSessionLines, setsPhrase, activeSeconds, whenPhrase, type DiscardStep, type LeftSession } from '../../engine/forgeSession';
import { discardSession, markPrompted, parkSession, promptKey, requestOpenSession, sessionStillThere, subscribeSession, type SessionState } from '../../utils/forgeSessionStore';
import { PrimaryButton, SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';
import { ForgeSheet } from './parts';

type Choice = 'finish' | 'resume' | null;

export function SessionChoiceSheet({
  session,
  left,
  onClose,
  onDiscarded,
  vanished = false,
}: {
  session: SessionState;
  // Een concept (bleef liggen); zonder is het een lopende training en heet Verder "Naar de training".
  left?: LeftSession;
  onClose: () => void;
  // Na Verwijderen, of na Begrepen als de training elders al weg was: de aanroeper gaat verder (een nieuwe training
  // starten) in plaats van te sluiten.
  onDiscarded?: () => void;
  // De plek van de pil zag de training verdwijnen terwijl dit blad openstond.
  vanished?: boolean;
}) {
  const [step, setStep] = useState<DiscardStep>('kiezen');
  const [gone, setGone] = useState(false);
  const goneRef = useRef(false);
  const markGone = () => {
    goneRef.current = true;
    setGone(true);
  };
  const [openedAt] = useState(() => Date.now());
  const choice = useRef<Choice>(null);
  const discarded = useRef(false);
  // Dit blad gaat er al over: de pil opent niet nog een keer vanzelf hetzelfde blad erachter.
  const pk = promptKey(session, left?.lastActionAt);
  useEffect(() => markPrompted(pk), [pk]);
  const clock = { startedAt: session.startedAt, pauses: session.pauses, ...(session.lastActionAt !== undefined ? { lastActionAt: session.lastActionAt } : {}) };
  const activeSec = left ? leftActiveSeconds(clock) : activeSeconds(clock, openedAt);
  const lastAt = left?.lastActionAt ?? session.lastActionAt ?? session.startedAt;
  const lines = leftSessionLines({ name: session.pointer.name, doneSets: session.doneSets, activeSec, when: whenPhrase(lastAt), ...(left ? { reason: left.reason } : {}) });
  const finishLabel = `Afronden met ${setsPhrase(session.doneSets)}`;
  const resumeLabel = left ? 'Verder' : 'Naar de training';
  const stillThere = () => sessionStillThere(session.pointer.key, session.startedAt);
  // Verdwijnt de training terwijl dit blad openstaat (een ander tabblad rondde hem af of verwijderde hem), dan zegt
  // het blad dat in plaats van stil te verdwijnen (Warden 15 november, I-4).
  const key = session.pointer.key;
  const startedAt = session.startedAt;
  const checkGone = useRef(() => {});
  useEffect(() => {
    checkGone.current = () => {
      if (choiceSheetSeesGone({ stillThere: sessionStillThere(key, startedAt), discarded: discarded.current, picked: choice.current !== null })) markGone();
    };
  });
  useEffect(() => subscribeSession(() => checkGone.current()), []);
  useEffect(() => {
    if (vanished) checkGone.current();
  }, [vanished]);

  // Pas na het sluiten van dit blad opent Forge: geen twee bladen over elkaar.
  const afterClose = () => {
    // Na Verwijderen of Begrepen met een vervolg (een nieuwe training starten) gaat dat vervolg voor sluiten.
    const next = afterChoiceClose({ discarded: discarded.current, gone: goneRef.current, hasNext: !!onDiscarded, choice: choice.current });
    if (next === 'next') {
      onDiscarded?.();
      return;
    }
    onClose();
    if (next === 'close' || !choice.current) return;
    // Een concept: eerst de stille tijd als pauze. Lukt dat niet (net weg), dan opent Forge niets.
    if (left && !parkSession(session.pointer, Date.now())) return;
    requestOpenSession(choice.current === 'finish' ? 'finish' : undefined);
  };

  // Een keuze: alleen als de training er nog is; anders de zin dat hij weg is, en het blad blijft staan.
  const pick = (c: Exclude<Choice, null>, close: () => void) => {
    if (!stillThere()) {
      markGone();
      return;
    }
    choice.current = c;
    close();
  };
  // Beide knoppen Verwijderen lopen door dezelfde stap: de eerste tik vraagt, de tweede verwijdert.
  const tapDiscard = (close: () => void) => {
    const next = discardTap(step);
    setStep(next.step);
    if (!next.discard) return;
    if (!stillThere()) {
      markGone();
      return;
    }
    discardSession(session.pointer);
    discarded.current = true;
    close();
  };

  const title = gone ? 'Training is weg' : step === 'bevestigen' ? 'Training verwijderen?' : left ? 'Training niet afgerond' : 'Er loopt nog een training';
  return (
    <ForgeSheet title={title} onClose={afterClose}>
      {(close) =>
        gone ? (
          <div className="flex flex-col gap-4">
            <GoneNote next={!!onDiscarded} />
            <SecondaryButton onClick={close}>Begrepen</SecondaryButton>
          </div>
        ) : step === 'bevestigen' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{lines.discard}</p>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setStep('kiezen')}>Annuleren</SecondaryButton>
              <TextButton tone="danger" onClick={() => tapDiscard(close)} className="flex-1 justify-center rounded-xl border" style={{ borderColor: 'var(--color-danger)' }}>
                Verwijderen
              </TextButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{lines.fact}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{lines.note}</p>
            <div className="flex flex-col gap-3">
              {left && session.doneSets > 0 ? (
                <>
                  <PrimaryButton onClick={() => pick('finish', close)}>{finishLabel}</PrimaryButton>
                  <SecondaryButton onClick={() => pick('resume', close)}>{resumeLabel}</SecondaryButton>
                </>
              ) : (
                <>
                  <PrimaryButton onClick={() => pick('resume', close)}>{resumeLabel}</PrimaryButton>
                  {session.doneSets > 0 && <SecondaryButton onClick={() => pick('finish', close)}>{finishLabel}</SecondaryButton>}
                </>
              )}
              <div className="flex items-center justify-between">
                <TextButton tone="danger" onClick={() => tapDiscard(close)}>Verwijderen</TextButton>
                <TextButton tone="dim" onClick={close}>{left ? 'Niet nu' : 'Annuleren'}</TextButton>
              </div>
            </div>
          </div>
        )
      }
    </ForgeSheet>
  );
}

// De zin als de training er niet meer is. Met een vervolg zegt hij eerlijk wat Begrepen doet: je nieuwe training start.
export function GoneNote({ next }: { next: boolean }) {
  return (
    <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
      {SESSION_GONE_TEXT}
      {next ? ` ${GONE_NEXT_TEXT}` : ''}
    </p>
  );
}
