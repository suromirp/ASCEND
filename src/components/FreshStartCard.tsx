import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { MetaRepo } from '../storage/database';
import { shouldOfferRestore } from '../engine/freshStart';
import { todayISO } from '../utils/dates';
import { ImportWizard } from './ImportWizard';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

// On Today, in the first days after ASCEND started from an empty database:
// had you used it before, put your backup back right away.
export function FreshStartCard() {
  const { sessionLogs, settings, updateSettings } = useAppData();
  const [seededAt, setSeededAt] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    void MetaRepo.get<string>('seededAt').then(setSeededAt);
  }, []);

  const show = shouldOfferRestore({
    seededAt,
    today: todayISO(),
    logCount: sessionLogs.length,
    lastExportedAt: settings.lastExportedAt,
    dismissedAt: settings.freshStartDismissedAt,
  });
  if (!show && !importing) return null;

  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Nieuw begonnen</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        ASCEND is op deze telefoon leeg begonnen. Gebruikte je de app al eerder? Zet dan je back-up terug, dan komen je
        trainingen, doel en instellingen terug.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <SecondaryButton onClick={() => void updateSettings({ freshStartDismissedAt: new Date().toISOString() })} className="min-w-[148px] whitespace-nowrap">Nieuw beginnen</SecondaryButton>
        <PrimaryButton onClick={() => setImporting(true)} fullWidth={false} className="min-w-[120px]">Back-up terugzetten</PrimaryButton>
      </div>
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
    </Card>
  );
}
