import { useState } from 'react';
import { PrimaryButton, StatusPill } from '../ui';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';

// De eerste keuze bij het doel Calisthenics (docs/beslissingen/2026-11-09-calisthenics-algemeen.md): algemeen sterk
// met eigen gewicht (het advies en de standaard) of één vaardigheid. Het blad slaat niets op; Volgende opent het
// voorstel met Akkoord (algemeen) of het blad van de vaardigheid.

export type CalisthenicsChoice = 'general' | 'skill';

const OPTIONS: { id: CalisthenicsChoice; label: string; line: string }[] = [
  { id: 'general', label: 'Algemeen sterk met eigen gewicht', line: 'Vijf basisladders tegelijk, zonder datum.' },
  { id: 'skill', label: 'Eén vaardigheid', line: 'Eén ladder met een doelstap, zoals de pull-up.' },
];

export function CalisthenicsChoiceSheet({ generalTaken, onSubmit, onClose }: {
  // Er staat al een algemeen doel op Ascend: een tweede kan niet.
  generalTaken: boolean;
  onSubmit: (choice: CalisthenicsChoice, close: () => void) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<CalisthenicsChoice>(generalTaken ? 'skill' : 'general');
  return (
    <Sheet eyebrow="Doel toevoegen · stap 2 van 3" title="Calisthenics" line="Kies hoe je met eigen gewicht wilt trainen." onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Soort calisthenicsdoel">
            {OPTIONS.map((o) => {
              const on = o.id === choice;
              const taken = o.id === 'general' && generalTaken;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={taken}
                  onClick={() => setChoice(o.id)}
                  className="flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-2xl border px-4 py-3 text-left disabled:opacity-40"
                  style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', background: on ? 'var(--color-action-muted)' : 'var(--color-card)' }}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{o.label}</span>
                    {o.id === 'general' && <StatusPill tone="neutral">{taken ? 'Al een doel' : 'Advies'}</StatusPill>}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{o.line}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-stretch gap-1">
            <PrimaryButton onClick={() => onSubmit(choice, close)}>Volgende</PrimaryButton>
            <TextButton tone="dim" onClick={close} className="self-center">Annuleren</TextButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}
