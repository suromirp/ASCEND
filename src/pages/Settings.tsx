import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Toggle } from '../components/ui';

export function SettingsPage() {
  const navigate = useNavigate();
  const { exportData, importData, resetDemoData, settings, updateSettings } = useAppData();
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

      <Card className="flex flex-col gap-1">
        <Eyebrow>GIDSEN</Eyebrow>
        <NavRow label="Trainingsgids" note="Doel, uitvoering en waar op letten per trainingsdag" onClick={() => navigate('/gids')} />
        <NavRow label="Garmin" note="Zones, dataschermen en hoe je de metrics leest" onClick={() => navigate('/garmin')} />
      </Card>

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
        <Eyebrow>SCHEMA OPNIEUW LADEN</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Zet alles terug naar je standaard trainingsschema (Maand 1 — Upper A, Easy Run, Lower A, Upper B, Bergconditie,
          Lower B, Herstel), startend deze week. Dit verwijdert je huidige voortgang.
        </p>
        {!confirmingReset ? (
          <SecondaryButton onClick={() => setConfirmingReset(true)}>SCHEMA OPNIEUW LADEN</SecondaryButton>
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

      <Card className="flex flex-col gap-3">
        <Eyebrow>KRACHTTRAINING</Eyebrow>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Bijgehouden in MacroFactor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sets, reps en gewicht van kracht-sessies log je al in MacroFactor. Zet dit aan om kracht-sessies in
              ASCEND in één tik af te vinken, zonder invulformulier.
            </p>
          </div>
          <Toggle
            checked={settings.strengthTrackedExternally}
            onChange={(v) => updateSettings({ strengthTrackedExternally: v })}
            label="Kracht bijgehouden in MacroFactor"
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>GELUID</Eyebrow>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Openingsgeluid</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Een paar percussieve dreunen bij het openen van de app. Browsers staan geluid pas toe na je eerste
              tik — het speelt dus af zodra je iets aanraakt, niet al bij het laadscherm zelf.
            </p>
          </div>
          <Toggle
            checked={settings.introSoundEnabled}
            onChange={(v) => updateSettings({ introSoundEnabled: v })}
            label="Openingsgeluid"
          />
        </div>
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

function NavRow({ label, note, onClick }: { label: string; note: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between gap-3 py-2 text-left">
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{label}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
      </div>
      <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>›</span>
    </button>
  );
}
