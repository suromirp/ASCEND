import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Toggle } from '../components/ui';
import { ImportWizard } from '../components/ImportWizard';
import { BaselineEvidenceCard } from '../components/BaselineEvidenceCard';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import type { Weekday, DailyTimeBudget, TrainingStrategyProfile } from '../models/goalEngineConfig';

const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABELS_NL: Record<Weekday, string> = {
  mon: 'Maandag', tue: 'Dinsdag', wed: 'Woensdag', thu: 'Donderdag', fri: 'Vrijdag', sat: 'Zaterdag', sun: 'Zondag',
};

// ASCEND_HEURISTIC(SOFT-FLEX-FROM-PREFERRED): softFlexMinutes is deliberately
// never asked for directly — a user says "~90 minuten", not "90 minuten plus
// 15 minuten flex". 15% of the preferred duration, with a 15-minute floor so
// even a short day still gets a little breathing room, is a plain,
// documented default rather than an invented one hidden in the UI.
function deriveSoftFlexMinutes(preferredMinutes: number): number {
  return Math.max(15, Math.round(preferredMinutes * 0.15));
}

const PAIRING_OPTIONS: { value: TrainingStrategyProfile['sameDayPairingPreference']; label: string; note: string }[] = [
  { value: 'automatic', label: 'Automatisch', note: 'ASCEND beslist zelf op basis van je tijd-budget per dag.' },
  { value: 'always', label: 'Ja', note: 'Plaats zo veel mogelijk sessies samen als de tijd het toelaat.' },
  { value: 'only_if_useful', label: 'Alleen indien nuttig', note: 'Alleen samenvoegen als er anders écht geen plek is.' },
  { value: 'never', label: 'Nee', note: 'Nooit meer dan één training per dag — het oude gedrag.' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { loading, exportData, resetSchedule, settings, updateSettings, goalEngineConfig, updateGoalEngineConfig, injuryNotes, rebuildRecommendations, resetDemoData } = useAppData();
  const activeInjuryCount = injuryNotes.filter((n) => !n.resolvedDate).length;
  const [status, setStatus] = useState<string | null>(null);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [confirmingFullReset, setConfirmingFullReset] = useState(false);
  const [fullResetting, setFullResetting] = useState(false);
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

  async function handleRebuildRecommendations() {
    setRebuilding(true);
    setRebuildStatus(null);
    await rebuildRecommendations();
    setRebuilding(false);
    setRebuildStatus('ASCEND heeft opnieuw gekeken — nieuwe aanbevelingen verschijnen hierboven zodra er iets is.');
  }

  async function handleFullReset() {
    setFullResetting(true);
    await resetDemoData();
    setFullResetting(false);
    setConfirmingFullReset(false);
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

      <DailyBudgetEditor
        key={loading ? 'loading' : 'ready'}
        dailyTimeBudget={goalEngineConfig.availability.dailyTimeBudget}
        onSave={(nextBudget) => updateGoalEngineConfig({ availability: { ...goalEngineConfig.availability, dailyTimeBudget: nextBudget } })}
      />

      <Card className="flex flex-col gap-3">
        <Eyebrow>MEERDERE TRAININGEN OP ÉÉN DAG</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Mag ASCEND twee sessies op dezelfde dag plannen als je tijd-budget dat toelaat?
        </p>
        <div className="flex flex-col gap-2">
          {PAIRING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateGoalEngineConfig({ strategy: { ...goalEngineConfig.strategy, sameDayPairingPreference: option.value } })}
              className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
              style={{ borderColor: goalEngineConfig.strategy.sameDayPairingPreference === option.value ? 'var(--color-gold)' : 'var(--color-card-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: goalEngineConfig.strategy.sameDayPairingPreference === option.value ? 'var(--color-gold)' : 'var(--color-ink)' }}>
                {option.label}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{option.note}</p>
            </button>
          ))}
        </div>
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

      <Card className="flex flex-col gap-3">
        <Eyebrow>OPNIEUW BEGINNEN</Eyebrow>
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Aanbevelingen opnieuw laten berekenen</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Krachtblok-review en de aanpassingen voor de komende weken worden normaal alleen ververst als je de app
            opnieuw opent. Heb je net iets aangepast (bijv. je beschikbare tijd) en wil je dat ASCEND daar nu meteen
            opnieuw naar kijkt? Dit verwijdert niets — je geschiedenis, doelen en huidige schema blijven ongewijzigd.
          </p>
          <SecondaryButton onClick={handleRebuildRecommendations} disabled={rebuilding}>
            {rebuilding ? 'BEZIG…' : 'HERBOUW AANBEVELINGEN'}
          </SecondaryButton>
          {rebuildStatus && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{rebuildStatus}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Alles verwijderen en opnieuw beginnen</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Wist al je geschiedenis, doelen, blessures en instellingen, en start je met een lege lei op het
            standaard programma — alsof je ASCEND voor het eerst opent. Dit kan niet ongedaan worden gemaakt.
          </p>
          {!confirmingFullReset ? (
            <button onClick={() => setConfirmingFullReset(true)} className="text-left text-xs" style={{ color: 'var(--color-danger)' }}>
              Alles verwijderen…
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
                Weet je het zeker? Al je gegevens gaan definitief verloren.
              </p>
              <div className="flex gap-3">
                <SecondaryButton onClick={() => setConfirmingFullReset(false)} disabled={fullResetting}>ANNULEREN</SecondaryButton>
                <button
                  onClick={handleFullReset}
                  disabled={fullResetting}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold tracking-wide transition-all active:scale-[0.97] disabled:opacity-40"
                  style={{ background: 'var(--color-danger)', color: '#fff' }}
                >
                  {fullResetting ? 'BEZIG…' : 'JA, ALLES VERWIJDEREN'}
                </button>
              </div>
            </div>
          )}
        </div>
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

type BudgetDraft = { preferred: string; hardMax: string };

// Rendered with a `key` that flips once real data replaces the initial
// default (SettingsPage's own `loading` -> 'ready' transition) so this
// initializes its drafts directly from props exactly once, via a fresh
// mount — no effect needed to re-sync local edit state to an
// asynchronously-loaded value.
function DailyBudgetEditor({
  dailyTimeBudget,
  onSave,
}: {
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>>;
  onSave: (next: Partial<Record<Weekday, DailyTimeBudget>>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<Weekday, BudgetDraft>>>(() => {
    const initial: Partial<Record<Weekday, BudgetDraft>> = {};
    for (const day of WEEKDAY_ORDER) {
      const budget = dailyTimeBudget[day];
      initial[day] = { preferred: budget ? String(budget.preferredMinutes) : '', hardMax: budget?.hardMaximumMinutes !== undefined ? String(budget.hardMaximumMinutes) : '' };
    }
    return initial;
  });
  const [status, setStatus] = useState<string | null>(null);

  function handleSave() {
    const next: Partial<Record<Weekday, DailyTimeBudget>> = {};
    for (const day of WEEKDAY_ORDER) {
      const draft = drafts[day];
      const preferredMinutes = draft ? Number.parseInt(draft.preferred, 10) : NaN;
      if (!draft || Number.isNaN(preferredMinutes) || preferredMinutes <= 0) continue; // an empty/invalid day simply has no budget — never a fabricated one
      const hardMaximumMinutes = draft.hardMax ? Number.parseInt(draft.hardMax, 10) : undefined;
      next[day] = {
        preferredMinutes,
        softFlexMinutes: deriveSoftFlexMinutes(preferredMinutes),
        ...(hardMaximumMinutes !== undefined && !Number.isNaN(hardMaximumMinutes) ? { hardMaximumMinutes } : {}),
      };
    }
    onSave(next);
    setStatus('Opgeslagen.');
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>TRAININGSTIJD PER DAG</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
        Hoeveel tijd heb je normaal per dag? ASCEND gebruikt dit om te bepalen of een extra sessie op een dag past —
        een dag die je leeg laat, telt gewoon als "vol zodra er één sessie op staat", zoals nu.
      </p>
      <div className="flex flex-col gap-2">
        {WEEKDAY_ORDER.map((day) => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm" style={{ color: 'var(--color-ink)' }}>{WEEKDAY_LABELS_NL[day]}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="niet ingesteld"
              value={drafts[day]?.preferred ?? ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [day]: { preferred: e.target.value, hardMax: prev[day]?.hardMax ?? '' } }))}
              className="w-28 rounded-lg border px-2 py-1.5 text-sm"
              style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}
            />
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>min</span>
            {showAdvanced && (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="harde limiet"
                value={drafts[day]?.hardMax ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [day]: { preferred: prev[day]?.preferred ?? '', hardMax: e.target.value } }))}
                className="w-24 rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}
              />
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setShowAdvanced((v) => !v)} className="self-start text-xs" style={{ color: 'var(--color-gold)' }}>
        {showAdvanced ? '− verberg harde limiet' : '+ geavanceerd: harde limiet per dag'}
      </button>
      <PrimaryButton onClick={handleSave}>OPSLAAN</PrimaryButton>
      {status && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{status}</p>}
    </Card>
  );
}
