// Het blad met de keuze voor een training die bleef liggen (de pil, en eenmaal bij het openen van de app) of die
// nog loopt terwijl je een andere start (OtherSessionRunning.tsx). Profiel afbreker, 14 november, backlog N.
//
// Afronden opent Forge op het blad Training afronden met wat je deed; Verder opent Forge waar je was; Weggooien
// pas na een tweede tik met Annuleren ernaast. Bij een concept wordt de stille tijd eerst een pauze
// (utils/forgeSessionStore.ts#parkSession), zodat de duur alleen de tijd telt dat je trainde. De planning en het
// logboek veranderen hier nooit.

import { useRef, useState } from 'react';
import { leftActiveSeconds, leftSessionLines, setsPhrase, activeSeconds, whenPhrase, type LeftSession } from '../../engine/forgeSession';
import { discardSession, parkSession, requestOpenSession, type SessionState } from '../../utils/forgeSessionStore';
import { PrimaryButton, SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';
import { ForgeSheet } from './parts';

type Choice = 'finish' | 'resume' | null;

export function SessionChoiceSheet({
  session,
  left,
  onClose,
  onDiscarded,
}: {
  session: SessionState;
  // Een concept (bleef liggen); zonder is het een lopende training en heet Verder "Naar de training".
  left?: LeftSession;
  onClose: () => void;
  // Na Weggooien: de aanroeper gaat verder (een nieuwe training starten) in plaats van te sluiten.
  onDiscarded?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const choice = useRef<Choice>(null);
  const discarded = useRef(false);
  const clock = { startedAt: session.startedAt, pauses: session.pauses, ...(session.lastActionAt !== undefined ? { lastActionAt: session.lastActionAt } : {}) };
  const activeSec = left ? leftActiveSeconds(clock) : activeSeconds(clock, openedAt);
  const lastAt = left?.lastActionAt ?? session.lastActionAt ?? session.startedAt;
  const lines = leftSessionLines({ name: session.pointer.name, doneSets: session.doneSets, activeSec, when: whenPhrase(lastAt), ...(left ? { reason: left.reason } : {}) });
  const finishLabel = `Afronden met ${setsPhrase(session.doneSets)}`;
  const resumeLabel = left ? 'Verder' : 'Naar de training';

  // Pas na het sluiten van dit blad opent Forge: geen twee bladen over elkaar.
  const afterClose = () => {
    // Na Weggooien met een vervolg (een nieuwe training starten) gaat dat vervolg voor sluiten.
    if (discarded.current && onDiscarded) {
      onDiscarded();
      return;
    }
    onClose();
    if (discarded.current) return;
    if (!choice.current) return;
    // Een concept: eerst de stille tijd als pauze. Lukt dat niet (geen concept meer), dan opent Forge niets.
    if (left && !parkSession(session.pointer, Date.now())) return;
    requestOpenSession(choice.current === 'finish' ? 'finish' : undefined);
  };

  return (
    <ForgeSheet title={confirm ? 'Weggooien?' : left ? 'Training niet afgerond' : 'Er loopt nog een training'} onClose={afterClose}>
      {(close) =>
        confirm ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{lines.discard}</p>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setConfirm(false)}>Annuleren</SecondaryButton>
              <button
                type="button"
                onClick={() => {
                  discardSession(session.pointer);
                  discarded.current = true;
                  close();
                }}
                className="min-h-[44px] flex-1 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger-text)' }}
              >
                Weggooien
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{lines.fact}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{lines.note}</p>
            <div className="flex flex-col gap-3">
              {left && session.doneSets > 0 ? (
                <>
                  <PrimaryButton onClick={() => { choice.current = 'finish'; close(); }}>{finishLabel}</PrimaryButton>
                  <SecondaryButton onClick={() => { choice.current = 'resume'; close(); }}>{resumeLabel}</SecondaryButton>
                </>
              ) : (
                <>
                  <PrimaryButton onClick={() => { choice.current = 'resume'; close(); }}>{resumeLabel}</PrimaryButton>
                  {session.doneSets > 0 && <SecondaryButton onClick={() => { choice.current = 'finish'; close(); }}>{finishLabel}</SecondaryButton>}
                </>
              )}
              <div className="flex items-center justify-between">
                <TextButton tone="danger" onClick={() => setConfirm(true)}>Weggooien</TextButton>
                <TextButton tone="dim" onClick={close}>{left ? 'Niet nu' : 'Annuleren'}</TextButton>
              </div>
            </div>
          </div>
        )
      }
    </ForgeSheet>
  );
}
