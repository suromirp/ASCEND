// ASCEND: het blad Veld kiezen. Eén lange lijst, in de groepen van het model; kiezen past meteen toe en sluit.
// Een veld dat een borstband vraagt of alleen bij lopen of in een workout bestaat blijft kiesbaar: het horloge
// toont zo'n veld ook leeg. De teksten komen uit engine/watchFields.ts (fieldHint).

import { useEffect, useRef } from 'react';
import type { WatchModel } from '../../data/watchModels';
import { fieldHint, fieldLabel } from '../../engine/watchFields';
import { ChoiceList, Sheet, SheetButtons } from '../settings/Sheet';
import { Eyebrow } from '../ui';

export function WatchFieldSheet({
  model,
  page,
  cell,
  current,
  advised,
  onPick,
  onClose,
}: {
  model: WatchModel;
  page: number;
  cell: number;
  // Het veld dat er nu staat en het veld uit het advies voor deze plek.
  current: string;
  advised?: string;
  onPick: (fieldId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<(() => void) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Sheet eyebrow={`Pagina ${page + 1}, veld ${cell + 1}`} title="Veld kiezen" line={`Nu: ${fieldLabel(model, current)}.`} onClose={onClose}>
      {(close) => {
        closeRef.current = close;
        return (
          <>
            {model.groups.map((group) => {
              const fields = model.fields.filter((f) => f.group === group.id);
              if (fields.length === 0) return null;
              return (
                <section key={group.id} aria-label={group.label}>
                  <div className="st-eyebrow" style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface)', paddingBlock: 'var(--s2)', marginBlock: 0 }}>
                    <Eyebrow>{group.label}</Eyebrow>
                  </div>
                  <ChoiceList
                    label={group.label}
                    options={fields.map((f) => ({ value: f.id, label: f.label, note: fieldHint(f) }))}
                    value={current}
                    advice={advised}
                    onPick={(id) => {
                      onPick(id);
                      timer.current = window.setTimeout(() => closeRef.current?.(), 240);
                    }}
                  />
                </section>
              );
            })}
            <SheetButtons>
              <button type="button" className="st-btn" onClick={close}>Annuleren</button>
            </SheetButtons>
          </>
        );
      }}
    </Sheet>
  );
}
