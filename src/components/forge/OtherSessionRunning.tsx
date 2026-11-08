// Het blad "Er loopt nog een training", uit ForgeWorkout.tsx: een sessie per keer.

import { useRef } from 'react';
import { PrimaryButton, SecondaryButton } from '../ui';
import { requestOpenSession } from '../../utils/forgeSessionStore';
import { ForgeSheet } from './parts';

export function OtherSessionRunning({ name, onClose }: { name: string; onClose: () => void }) {
  const goTo = useRef(false);
  return (
    <ForgeSheet
      title="Er loopt nog een training"
      onClose={() => {
        onClose();
        if (goTo.current) requestOpenSession();
      }}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Er loopt nog een training: {name}. Eerst afronden of verwijderen?</p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={() => { goTo.current = true; close(); }}>Naar de training</PrimaryButton>
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}
