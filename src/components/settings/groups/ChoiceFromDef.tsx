import type { ChoiceDef } from '../../../data/settingsChoices';
import { ChoiceSheet } from '../Sheet';

// Het keuzeblad van een keuze uit data/settingsChoices.ts: titel, regel, opties,
// "Advies" en "Meer uitleg" komen uit de definitie, zodat het blad en de rij
// dezelfde woorden gebruiken.
export function ChoiceFromDef<T extends string | number>({
  def,
  value,
  onPick,
  onClose,
  keepOpen,
}: {
  def: ChoiceDef<T>;
  value: T;
  onPick: (value: T) => void;
  onClose: () => void;
  keepOpen?: boolean;
}) {
  return (
    <ChoiceSheet<T>
      eyebrow={def.group}
      title={def.title}
      line={def.line}
      options={def.options.map((o) => ({ value: o.value, label: o.label, note: o.note }))}
      value={value}
      advice={def.advice}
      helpKey={def.help}
      onPick={onPick}
      onClose={onClose}
      keepOpen={keepOpen}
    />
  );
}
