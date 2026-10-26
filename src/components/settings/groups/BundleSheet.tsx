import type { ReactNode } from 'react';
import { SettingsList } from '../SettingsList';
import { Sheet } from '../Sheet';

// Het blad van een rij die meer keuzes bundelt (docs/beslissingen/2026-10-26-instellingen-opruimen.md):
// de losse keuzes staan als rijen in een lijst, met dezelfde samenvatting als op een pagina
// (SummaryRow). Een keuze met meer opties opent haar eigen onderblad bovenop dit blad. Een rij
// die er nu niet hoort tekent niets (data/settingsLayout.ts).
export function BundleSheet({
  eyebrow,
  title,
  line,
  onClose,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  line?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet eyebrow={eyebrow} title={title} line={line} onClose={onClose}>
      <SettingsList>{children}</SettingsList>
      {footer}
    </Sheet>
  );
}
