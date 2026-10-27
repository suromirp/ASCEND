import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { Sheet } from '../settings/Sheet';

// Het menu van een doel (de drie puntjes): aanpassen, het label, de plek in de lijst (Hoger en
// Lager, voor wie niet wil slepen) en archiveren. Elke keuze sluit het menu; de pagina opent dan
// het blad of het voorstel dat erbij hoort.
function Row({ icon, flip, title, line, tone = 'ink', disabled, onClick }: { icon: IconName; flip?: boolean; title: string; line?: ReactNode; tone?: 'ink' | 'danger'; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[56px] w-full items-center gap-3 border-b px-4 py-2 text-left last:border-b-0"
      style={{ borderColor: 'var(--color-card-border)', color: tone === 'danger' ? 'var(--color-danger-text)' : 'var(--color-ink)' }}
    >
      <span className={`${flip ? 'flex rotate-180' : 'flex'}${disabled ? ' opacity-40' : ''}`}><Icon name={icon} size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block text-base${disabled ? ' opacity-40' : ''}`}>{title}</span>
        {line && <span className="block text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{line}</span>}
      </span>
    </button>
  );
}

export function GoalMenuSheet({
  name, index, count, up, down, onEdit, onLabel, onStep, onArchive, onClose,
}: {
  name: string;
  index: number;
  count: number;
  // Of een stap kan, en zo niet waarom niet (engine/goalList.ts#stepAvailability).
  up: { can: boolean; reason?: string };
  down: { can: boolean; reason?: string };
  onEdit: () => void;
  onLabel: () => void;
  onStep: (dir: 'up' | 'down') => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet eyebrow="Dit doel" title={name || 'Naamloos doel'} line={`Plek ${index + 1} van ${count} in je lijst.`} onClose={onClose}>
      {(close) => {
        const pick = (fn: () => void) => () => { close(); window.setTimeout(fn, 280); };
        return (
          <div className="st-list">
            <Row icon="notitie" title="Doel aanpassen" line="Datum, afstand, rugzak en meer" onClick={pick(onEdit)} />
            <Row icon="schijf" title="Label wijzigen" line="Hoe belangrijk: Top, Voortop of Verkenning" onClick={pick(onLabel)} />
            <Row icon="omlaag" flip title="Hoger in de lijst" line={up.can ? undefined : up.reason} disabled={!up.can} onClick={pick(() => onStep('up'))} />
            <Row icon="omlaag" title="Lager in de lijst" line={down.can ? undefined : down.reason} disabled={!down.can} onClick={pick(() => onStep('down'))} />
            <Row icon="wissen" title="Archiveren" line="Terughalen kan later, zonder datum" tone="danger" onClick={pick(onArchive)} />
          </div>
        );
      }}
    </Sheet>
  );
}
