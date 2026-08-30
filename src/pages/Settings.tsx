import { useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from '../components/ui';

export function SettingsPage() {
  const { exportData, importData, resetDemoData } = useAppData();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importData(file);
      setStatus('Import geslaagd.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import mislukt.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <div>
        <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>MEER</p>
      </div>

      <Card className="flex flex-col gap-3">
        <Eyebrow>GEGEVENS</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Alle data staat lokaal op dit apparaat. Exporteer regelmatig een back-up.
        </p>
        <PrimaryButton onClick={() => exportData()}>EXPORTEER DATA</PrimaryButton>
        <SecondaryButton onClick={() => fileInput.current?.click()}>IMPORTEER DATA</SecondaryButton>
        <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={handleImport} />
        {status && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{status}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>DEMO DATA</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Zet alles terug naar het standaard ASCEND-programma. Dit verwijdert je huidige voortgang.
        </p>
        {!confirmingReset ? (
          <SecondaryButton onClick={() => setConfirmingReset(true)}>RESET NAAR DEMO</SecondaryButton>
        ) : (
          <div className="flex gap-3">
            <SecondaryButton onClick={() => setConfirmingReset(false)}>ANNULEREN</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                resetDemoData();
                setConfirmingReset(false);
              }}
            >
              BEVESTIG RESET
            </PrimaryButton>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3 opacity-60">
        <Eyebrow>INTEGRATIES</Eyebrow>
        <IntegrationRow name="Garmin" note="Binnenkort" />
        <IntegrationRow name="Health Connect" note="Binnenkort" />
        <IntegrationRow name="MacroFactor" note="Binnenkort" />
      </Card>

      <p className="px-1 text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        ASCEND — Discipline. Progressie. Avontuur.
      </p>
    </div>
  );
}

function IntegrationRow({ name, note }: { name: string; note: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: 'var(--color-ink)' }}>{name}</span>
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</span>
    </div>
  );
}
