import { useAppData } from '../state/AppDataContext';
import type { FreshStartState } from './useFreshStart';
import { ImportWizard } from './ImportWizard';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

// On Today, in the first days after ASCEND started from an empty database:
// had you used it before, put your backup back right away.
// `quiet`: Back-up terugzetten omlijnd in plaats van gevuld, op Vandaag naast de hoofdknop van de missie (regel 5: één mint per
// scherm; besluit 2026-11-12-missiekaart.md).
export function FreshStartCard({ state, quiet = false }: { state: FreshStartState; quiet?: boolean }) {
  const { updateSettings } = useAppData();
  const { shown, importing, setImporting } = state;
  if (!shown) return null;

  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Nieuw begonnen</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        ASCEND is op deze telefoon leeg begonnen. Gebruikte je de app al eerder? Zet dan je back-up terug, dan komen je
        trainingen, doel en instellingen terug.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <SecondaryButton onClick={() => void updateSettings({ freshStartDismissedAt: new Date().toISOString() })} className="min-w-[148px] whitespace-nowrap">Nieuw beginnen</SecondaryButton>
        {quiet
          ? <SecondaryButton onClick={() => setImporting(true)} className="min-w-[120px]">Back-up terugzetten</SecondaryButton>
          : <PrimaryButton onClick={() => setImporting(true)} fullWidth={false} className="min-w-[120px]">Back-up terugzetten</PrimaryButton>}
      </div>
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
    </Card>
  );
}
