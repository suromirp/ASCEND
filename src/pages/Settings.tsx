import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Toggle } from '../components/ui';
import { ImportWizard } from '../components/ImportWizard';
import { BaselineEvidenceCard } from '../components/BaselineEvidenceCard';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';

export function SettingsPage() {
  const navigate = useNavigate();
  const { exportData, resetSchedule, settings, updateSettings, injuryNotes } = useAppData();
  const activeInjuryCount = injuryNotes.filter((n) => !n.resolvedDate).length;
  const [status, setStatus] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetStartFrom, setResetStartFrom] = useState<'this_week' | 'next_week'>('next_week');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showBaselineEditor, setShowBaselineEditor] = useState(false);
  const [hasPreferredDirectory, setHasPreferredDirectory] = useState(false);
  const supportsPreferredDirectory = webBackupFileAdapter.supportsPreferredDirectory();

  useEffect(() => {
    if (!supportsPreferredDirectory) return;
    webBackupFileAdapter.hasPreferredDirectory?.().then(setHasPreferredDirectory);
  }, [supportsPreferredDirectory]);

  async function handleExport() {
    const success = await exportData();
    setStatus(success ? 'Export geslaagd.' : null);
  }

  async function handleChooseDirectory() {
    await webBackupFileAdapter.choosePreferredDirectory?.();
    setHasPreferredDirectory((await webBackupFileAdapter.hasPreferredDirectory?.()) ?? false);
  }

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div>
        <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>MEER</p>
      </div>

      <Card className="flex flex-col gap-1">
        <Eyebrow>GIDSEN</Eyebrow>
        <NavRow label="Trainingsgids" note="Doel, uitvoering en waar op letten per trainingsdag" onClick={() => navigate('/gids')} />
        <NavRow label="Garmin" note="Zones, dataschermen en hoe je de metrics leest" onClick={() => navigate('/garmin')} />
      </Card>

      <Card className="flex flex-col gap-1">
        <Eyebrow>GEZONDHEID</Eyebrow>
        <NavRow
          label="Blessures"
          note={activeInjuryCount > 0 ? `${activeInjuryCount} actief` : 'Geen actieve blessures'}
          onClick={() => navigate('/blessures')}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>GEGEVENS</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Alle data staat lokaal op dit apparaat. Exporteer regelmatig een back-up.
        </p>
        <PrimaryButton onClick={handleExport}>EXPORTEER DATA</PrimaryButton>
        <SecondaryButton onClick={() => setShowImportWizard(true)}>IMPORTEER DATA</SecondaryButton>
        {status && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{status}</p>}
      </Card>

      {supportsPreferredDirectory && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>BACK-UPMAP</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            Kies een vaste map op dit apparaat waar EXPORTEER DATA automatisch naartoe schrijft, zonder elke keer een
            opslaanvenster te tonen.
          </p>
          <SecondaryButton onClick={handleChooseDirectory}>
            {hasPreferredDirectory ? 'MAP WIJZIGEN' : 'MAP KIEZEN'}
          </SecondaryButton>
        </Card>
      )}

      {showImportWizard && <ImportWizard onClose={() => setShowImportWizard(false)} />}

      <Card className="flex flex-col gap-3">
        <Eyebrow>SCHEMA OPNIEUW LADEN</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Zet je toekomstige planning terug naar het standaard weekschema (Maand 1 — Herstel, Easy Run, Lower A, Upper A,
          Upper B, Heuvel-/Incline-Intervallen, Lange Duurloop). Je geschiedenis, voltooide sessies, doelen en
          blessures blijven gewoon bewaard — dit raakt alleen wat er nog gepland staat.
        </p>
        {!confirmingReset ? (
          <SecondaryButton onClick={() => setConfirmingReset(true)}>SCHEMA OPNIEUW LADEN</SecondaryButton>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {(['this_week', 'next_week'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setResetStartFrom(option)}
                  className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                  style={{ borderColor: resetStartFrom === option ? 'var(--color-gold)' : 'var(--color-card-border)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: resetStartFrom === option ? 'var(--color-gold)' : 'var(--color-ink)' }}>
                    {option === 'this_week' ? 'Vanaf nu, deze week' : 'Vanaf volgende week'}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                    {option === 'this_week'
                      ? 'De rest van deze week krijgt meteen het standaard schema.'
                      : 'Deze week maak je af zoals gepland — het standaard schema begint aankomende maandag.'}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setConfirmingReset(false)}>ANNULEREN</SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  resetSchedule(resetStartFrom);
                  setConfirmingReset(false);
                }}
              >
                BEVESTIG RESET
              </PrimaryButton>
            </div>
          </div>
        )}
      </Card>

      {!showBaselineEditor ? (
        <Card className="flex flex-col gap-1">
          <button onClick={() => setShowBaselineEditor(true)} className="flex items-center justify-between gap-3 text-left">
            <div>
              <Eyebrow>GEAVANCEERD: BASELINE HANDMATIG INVULLEN</Eyebrow>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                Meestal niet nodig — bij het aanmaken of aanpassen van een doel vraagt ASCEND daar zelf al gericht
                naar wat nog ontbreekt. Gebruik dit alleen om los van een doel iets vast te leggen.
              </p>
            </div>
            <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>+</span>
          </button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowBaselineEditor(false)} className="self-end text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            − verbergen
          </button>
          <BaselineEvidenceCard />
        </div>
      )}

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
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Geluidseffecten</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Een paar percussieve dreunen bij het openen van de app, en een chime bij een voltooide sessie of
              mijlpaal. Browsers staan geluid pas toe na je eerste tik — het openingsgeluid speelt dus af zodra je
              iets aanraakt, niet al bij het laadscherm zelf.
            </p>
          </div>
          <Toggle
            checked={settings.introSoundEnabled}
            onChange={(v) => updateSettings({ introSoundEnabled: v })}
            label="Geluidseffecten"
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
