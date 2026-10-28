import { useState } from 'react';
import { PACK_GROUPS, PACK_GROUP_LABEL, type PackGroup, type PackItem } from '../../data/packList';
import { useSheetClose } from '../../utils/useSheetClose';
import { NumberField } from '../NumberField';
import { Portal } from '../Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

// Add an item to the packing list, or change or remove one: name, weight in
// grams and the group it belongs to.
export function PackItemSheet({
  item,
  defaultGroup = 'overig',
  onSave,
  onDelete,
  onClose,
}: {
  item?: PackItem;
  defaultGroup?: PackGroup;
  onSave: (values: { name: string; grams: number; group: PackGroup }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [name, setName] = useState(item?.name ?? '');
  const [grams, setGrams] = useState<number | undefined>(item?.grams);
  const [group, setGroup] = useState<PackGroup>(item?.group ?? defaultGroup);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = name.trim().length > 0 && grams !== undefined && grams >= 0;

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} role="dialog" aria-label={item ? 'Onderdeel aanpassen' : 'Onderdeel toevoegen'} className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-8">
            <Eyebrow>{item ? 'Onderdeel aanpassen' : 'Onderdeel toevoegen'}</Eyebrow>
            <div>
              <label htmlFor="pack-name" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Naam</label>
              <input
                id="pack-name"
                type="text"
                value={name}
                maxLength={80}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
                style={fieldStyle}
              />
            </div>
            <NumberField label="Gewicht" unit="g" value={grams} onChange={setGrams} helper="Weeg het op een keukenweegschaal als je het hebt." />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Groep</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PACK_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={group === g}
                    onClick={() => setGroup(g)}
                    className="min-h-[44px] rounded-full border px-3 text-xs"
                    style={{
                      borderColor: group === g ? 'var(--color-action)' : 'var(--color-control-border)',
                      color: group === g ? 'var(--color-action)' : 'var(--color-ink)',
                    }}
                  >
                    {PACK_GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
              <PrimaryButton
                disabled={!valid}
                fullWidth={false}
                onClick={() => {
                  if (!valid || grams === undefined) return;
                  onSave({ name: name.trim(), grams, group });
                  requestClose();
                }}
              >
                Opslaan
              </PrimaryButton>
            </div>
            {onDelete && (
              <TextButton
                onClick={() => {
                  if (!confirmDelete) { setConfirmDelete(true); return; }
                  onDelete();
                  requestClose();
                }}
                tone={confirmDelete ? 'danger' : 'dim'}
                className="self-start text-left"
              >
                {confirmDelete ? 'Zeker weten? Tik nog een keer om te verwijderen' : 'Verwijderen van de lijst'}
              </TextButton>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
