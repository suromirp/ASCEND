import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Toggle } from '../components/ui';
import { ImportWizard } from '../components/ImportWizard';
import { BaselineEvidenceCard } from '../components/BaselineEvidenceCard';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import { NumberField } from '../components/NumberField';
import { ImpactSheet } from '../components/ImpactSheet';
import type { Weekday, DailyTimeBudget, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { PlanChangeProposal } from '../models/planChange';
import { classifyChangeImpact, describeChanges, needsConfirmation, CHANGE_APPLY_MODE_LABEL, type ChangeApplyMode } from '../engine/changeImpact';
import { computeScheduleFit, computeSportDisableProposal } from '../engine/scheduleFit';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, templateSport, type Sport } from '../engine/sports';
import { todayISO, resolveProgramWeek } from '../utils/dates';

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
  { value: 'never', label: 'Nee', note: 'Nooit meer dan één training per dag.' },
];

type SettingsTab = 'algemeen' | 'training' | 'gegevens' | 'geavanceerd';
const TABS: { value: SettingsTab; label: string }[] = [
  { value: 'algemeen', label: 'Algemeen' },
  { value: 'training', label: 'Training' },
  { value: 'gegevens', label: 'Gegevens' },
  { value: 'geavanceerd', label: 'Geavanceerd' },
];
const TAB_STORAGE_KEY = 'ascend.settingsTab';

function readStoredTab(): SettingsTab {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some((t) => t.value === v) ? (v as SettingsTab) : 'algemeen';
  } catch {
    return 'algemeen';
  }
}

const PLANNABLE_SPORTS: Sport[] = ['running', 'hiking', 'cycling'];

type PendingImpact = { section: string; title: string; proposal: PlanChangeProposal; lines: string[] };

export function SettingsPage() {
  const navigate = useNavigate();
  const {
    loading, exportData, resetSchedule, settings, updateSettings, goalEngineConfig, updateGoalEngineConfig, injuryNotes,
    rebuildRecommendations, resetDemoData, plannedSessions, templates, sessionLogs, program, commitPlanChange, templateById, restartProgram,
  } = useAppData();
  const activeInjuryCount = injuryNotes.filter((n) => !n.resolvedDate).length;
  const [tab, setTab] = useState<SettingsTab>(readStoredTab);
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
  const [pending, setPending] = useState<PendingImpact | null>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [restartFrom, setRestartFrom] = useState<'this_week' | 'next_week'>('this_week');
  const position = program ? resolveProgramWeek(program, todayISO()) : null;
  const [applying, setApplying] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const supportsPreferredDirectory = webBackupFileAdapter.supportsPreferredDirectory();
  const applyMode: ChangeApplyMode = settings.changeApplyMode ?? 'auto_small';
  const enabledSports = { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports };

  useEffect(() => {
    if (!supportsPreferredDirectory) return;
    webBackupFileAdapter.hasPreferredDirectory?.().then(setHasPreferredDirectory);
  }, [supportsPreferredDirectory]);

  function selectTab(next: SettingsTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // per-viewer convenience only
    }
  }

  function note(section: string, text: string) {
    setNotes((prev) => ({ ...prev, [section]: text }));
  }

  // The one path every schedule-affecting setting goes through (Fase 2
  // feedback pattern): nothing to change -> say so; a change the user's
  // "Wijzigingen toepassen" choice lets through -> apply with a notice and
  // undo; otherwise -> ask "nu toepassen / alleen nieuwe planning" first.
  async function route(section: string, title: string, proposal: PlanChangeProposal) {
    const asOf = todayISO();
    const level = classifyChangeImpact(proposal.changes, plannedSessions, asOf);
    if (level === 'hint') {
      note(section, `Opgeslagen. ${proposal.consequences}`);
      return;
    }
    const lines = describeChanges(proposal.changes, plannedSessions, templates);
    if (needsConfirmation(level, applyMode)) {
      setPending({ section, title, proposal, lines });
      return;
    }
    await commitPlanChange(proposal, title);
    note(section, 'Opgeslagen en toegepast. Onderaan zie je wat er veranderde, met ongedaan maken.');
  }

  function scheduleFitFor(settingLabel: string, dailyTimeBudget: typeof goalEngineConfig.availability.dailyTimeBudget, pairing: TrainingStrategyProfile['sameDayPairingPreference']) {
    return computeScheduleFit({
      plannedSessions, templates, sessionLogs, program, dailyTimeBudget, sameDayPairingPreference: pairing, asOf: todayISO(), settingLabel,
    }).proposal;
  }

  async function handlePairingChange(value: TrainingStrategyProfile['sameDayPairingPreference']) {
    if (value === goalEngineConfig.strategy.sameDayPairingPreference) return;
    await updateGoalEngineConfig({ strategy: { ...goalEngineConfig.strategy, sameDayPairingPreference: value } });
    const label = 'Meerdere trainingen op één dag';
    await route('pairing', label, scheduleFitFor(label, goalEngineConfig.availability.dailyTimeBudget, value));
  }

  async function handleBudgetSave(nextBudget: typeof goalEngineConfig.availability.dailyTimeBudget) {
    await updateGoalEngineConfig({ availability: { ...goalEngineConfig.availability, dailyTimeBudget: nextBudget } });
    const label = 'Trainingstijd per dag';
    await route('budget', label, scheduleFitFor(label, nextBudget, goalEngineConfig.strategy.sameDayPairingPreference));
  }

  async function handleSportToggle(sport: Sport, on: boolean) {
    await updateSettings({ enabledSports: { ...enabledSports, [sport]: on } });
    if (on) {
      note('sports', `${SPORT_LABEL[sport]} staat aan. ASCEND neemt het weer mee in nieuwe planning.`);
      return;
    }
    const proposal = computeSportDisableProposal(
      (s) => { const t = templateById.get(s.templateId); return t ? templateSport(t) === sport : false; },
      SPORT_LABEL[sport], plannedSessions, sessionLogs, todayISO(),
    );
    await route('sports', `${SPORT_LABEL[sport]} uitgezet`, proposal);
  }

  async function applyPending() {
    if (!pending) return;
    setApplying(true);
    await commitPlanChange(pending.proposal, pending.title);
    note(pending.section, 'Opgeslagen en toegepast. Onderaan zie je wat er veranderde, met ongedaan maken.');
    setApplying(false);
    setPending(null);
  }

  function keepForNewPlanning() {
    if (!pending) return;
    note(pending.section, 'Opgeslagen. Je bestaande planning blijft zoals hij is, nieuwe planning gebruikt de nieuwe instelling.');
    setPending(null);
  }

  async function handleExport() {
    const success = await exportData();
    setStatus(success ? 'Export geslaagd.' : null);
  }

  async function handleRebuildRecommendations() {
    setRebuilding(true);
    setRebuildStatus(null);
    await rebuildRecommendations();
    setRebuilding(false);
    setRebuildStatus('ASCEND heeft opnieuw gekeken. Nieuwe aanbevelingen verschijnen zodra er iets is.');
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

      <div className="sticky top-0 z-10 -mx-4 px-4 pb-1 pt-1" style={{ background: 'var(--color-bg)' }}>
        <div className="flex gap-1 rounded-xl border p-1" role="tablist" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => selectTab(t.value)}
              className="flex-1 rounded-lg px-1 py-1.5 text-xs font-medium transition-all active:scale-[0.98]"
              style={tab === t.value ? { background: 'var(--color-card)', color: 'var(--color-gold)', boxShadow: 'inset 0 0 0 1px var(--color-card-border)' } : { color: 'var(--color-ink-dim)' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'algemeen' && (
        <>
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
            <Eyebrow>GELUID</Eyebrow>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Geluidseffecten</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Een paar dreunen bij het openen van de app en een chime bij een voltooide sessie of mijlpaal. Het
                  openingsgeluid speelt pas na je eerste tik; zo werken browsers.
                </p>
              </div>
              <Toggle checked={settings.introSoundEnabled} onChange={(v) => updateSettings({ introSoundEnabled: v })} label="Geluidseffecten" />
            </div>
          </Card>

          <Card className="flex flex-col gap-3 opacity-60">
            <Eyebrow>INTEGRATIES</Eyebrow>
            <IntegrationRow name="Garmin" note="Binnenkort" />
            <IntegrationRow name="Health Connect" note="Binnenkort" />
            <IntegrationRow name="MacroFactor" note="Binnenkort" />
          </Card>
        </>
      )}

      {tab === 'training' && (
        <>
          <Card className="flex flex-col gap-3">
            <Eyebrow>PROGRAMMA</Eyebrow>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
              {position
                ? `Je staat nu in week ${position.weekInProgram} van ${position.totalWeeksInProgram}, ${position.phase.name.toLowerCase()}.`
                : 'Deze week valt buiten het programma.'}
            </p>
            {!confirmingRestart ? (
              <SecondaryButton onClick={() => setConfirmingRestart(true)}>OPNIEUW BEGINNEN BIJ WEEK 1</SecondaryButton>
            ) : (
              <div className="flex flex-col gap-3">
                <OptionList
                  options={[
                    { value: 'this_week' as const, label: 'Deze week is week 1', note: 'De weektelling en opbouw beginnen deze week opnieuw.' },
                    { value: 'next_week' as const, label: 'Volgende week is week 1', note: 'Deze week telt nog niet mee, het programma begint aankomende maandag.' },
                  ]}
                  value={restartFrom}
                  onChange={setRestartFrom}
                />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                  Alleen de weektelling verschuift, en daarmee de opbouw per week. Wat er gepland staat en je geschiedenis blijven zoals ze zijn.
                </p>
                <div className="flex gap-3">
                  <SecondaryButton onClick={() => setConfirmingRestart(false)}>ANNULEREN</SecondaryButton>
                  <PrimaryButton
                    fullWidth={false}
                    onClick={async () => {
                      await restartProgram(restartFrom);
                      setConfirmingRestart(false);
                      note('program', restartFrom === 'this_week' ? 'Deze week is nu week 1.' : 'Volgende week wordt week 1.');
                    }}
                  >
                    BEVESTIGEN
                  </PrimaryButton>
                </div>
              </div>
            )}
            <SectionNote text={notes.program} />
          </Card>

          <Card className="flex flex-col gap-3">
            <Eyebrow>SPORTEN</Eyebrow>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Welke sporten mag ASCEND inplannen? Loggen kan altijd, ook voor een sport die uit staat.
            </p>
            {PLANNABLE_SPORTS.map((sport) => (
              <div key={sport} className="flex items-center justify-between gap-4">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{SPORT_LABEL[sport]}</p>
                <Toggle checked={enabledSports[sport]} onChange={(v) => void handleSportToggle(sport, v)} label={SPORT_LABEL[sport]} />
              </div>
            ))}
            <SectionNote text={notes.sports} />
          </Card>

          <Card className="flex flex-col gap-3">
            <Eyebrow>WIJZIGINGEN TOEPASSEN</Eyebrow>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Als ASCEND je planning wil aanpassen, na een training, een gemiste sessie of een andere instelling.
            </p>
            <OptionList
              options={(Object.keys(CHANGE_APPLY_MODE_LABEL) as ChangeApplyMode[]).map((m) => ({ value: m, ...CHANGE_APPLY_MODE_LABEL[m] }))}
              value={applyMode}
              onChange={(m) => void updateSettings({ changeApplyMode: m })}
            />
          </Card>

          <DailyBudgetEditor
            key={loading ? 'loading' : 'ready'}
            dailyTimeBudget={goalEngineConfig.availability.dailyTimeBudget}
            onSave={(nextBudget) => void handleBudgetSave(nextBudget)}
            note={notes.budget}
          />

          <Card className="flex flex-col gap-3">
            <Eyebrow>MEERDERE TRAININGEN OP ÉÉN DAG</Eyebrow>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Mag ASCEND twee sessies op dezelfde dag plannen als je tijd per dag dat toelaat?
            </p>
            <OptionList options={PAIRING_OPTIONS} value={goalEngineConfig.strategy.sameDayPairingPreference} onChange={(v) => void handlePairingChange(v)} />
            <SectionNote text={notes.pairing} />
          </Card>

          <Card className="flex flex-col gap-3">
            <Eyebrow>KRACHTTRAINING</Eyebrow>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Bijgehouden in MacroFactor</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Sets, reps en gewicht log je in MacroFactor. Zet dit aan om kracht-sessies in ASCEND in één tik af te
                  vinken, zonder invulformulier.
                </p>
              </div>
              <Toggle checked={settings.strengthTrackedExternally} onChange={(v) => updateSettings({ strengthTrackedExternally: v })} label="Kracht bijgehouden in MacroFactor" />
            </div>
          </Card>
        </>
      )}

      {tab === 'gegevens' && (
        <>
          <Card className="flex flex-col gap-3">
            <Eyebrow>BACK-UP</Eyebrow>
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
                Kies een vaste map waar EXPORTEER DATA automatisch naartoe schrijft, zonder elke keer een opslaanvenster.
              </p>
              <SecondaryButton onClick={handleChooseDirectory}>{hasPreferredDirectory ? 'MAP WIJZIGEN' : 'MAP KIEZEN'}</SecondaryButton>
            </Card>
          )}

          <Card className="flex flex-col gap-3">
            <Eyebrow>SCHEMA OPNIEUW LADEN</Eyebrow>
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              Zet je toekomstige planning terug naar het standaard weekschema. Geschiedenis, voltooide sessies, doelen en
              blessures blijven bewaard; dit raakt alleen wat er nog gepland staat.
            </p>
            {!confirmingReset ? (
              <SecondaryButton onClick={() => setConfirmingReset(true)}>SCHEMA OPNIEUW LADEN</SecondaryButton>
            ) : (
              <div className="flex flex-col gap-3">
                <OptionList
                  options={[
                    { value: 'this_week' as const, label: 'Vanaf nu, deze week', note: 'De rest van deze week krijgt meteen het standaard schema.' },
                    { value: 'next_week' as const, label: 'Vanaf volgende week', note: 'Deze week maak je af zoals gepland, het standaard schema begint aankomende maandag.' },
                  ]}
                  value={resetStartFrom}
                  onChange={setResetStartFrom}
                />
                <div className="flex gap-3">
                  <SecondaryButton onClick={() => setConfirmingReset(false)}>ANNULEREN</SecondaryButton>
                  <PrimaryButton fullWidth={false} onClick={() => { resetSchedule(resetStartFrom); setConfirmingReset(false); }}>BEVESTIG RESET</PrimaryButton>
                </div>
              </div>
            )}
          </Card>
          {showImportWizard && <ImportWizard onClose={() => setShowImportWizard(false)} />}
        </>
      )}

      {tab === 'geavanceerd' && (
        <>
          {!showBaselineEditor ? (
            <Card className="flex flex-col gap-1">
              <button onClick={() => setShowBaselineEditor(true)} className="flex items-center justify-between gap-3 text-left">
                <div>
                  <Eyebrow>BASELINE HANDMATIG INVULLEN</Eyebrow>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                    Meestal niet nodig: bij een doel vraagt ASCEND zelf wat nog ontbreekt. Gebruik dit alleen om los van een
                    doel iets vast te leggen.
                  </p>
                </div>
                <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>+</span>
              </button>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowBaselineEditor(false)} className="self-end text-xs" style={{ color: 'var(--color-ink-dim)' }}>− verbergen</button>
              <BaselineEvidenceCard />
            </div>
          )}

          <Card className="flex flex-col gap-3">
            <Eyebrow>OPNIEUW BEGINNEN</Eyebrow>
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Aanbevelingen opnieuw laten berekenen</p>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Krachtblok-review en aanpassingen voor de komende weken worden normaal ververst als je de app opent. Dit
                laat ASCEND nu meteen opnieuw kijken en verwijdert niets.
              </p>
              <SecondaryButton onClick={handleRebuildRecommendations} disabled={rebuilding}>{rebuilding ? 'BEZIG…' : 'HERBOUW AANBEVELINGEN'}</SecondaryButton>
              {rebuildStatus && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{rebuildStatus}</p>}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Alles verwijderen en opnieuw beginnen</p>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Wist al je geschiedenis, doelen, blessures en instellingen en start met het standaard programma. Dit kan niet
                ongedaan worden gemaakt.
              </p>
              {!confirmingFullReset ? (
                <button onClick={() => setConfirmingFullReset(true)} className="text-left text-xs" style={{ color: 'var(--color-danger)' }}>Alles verwijderen…</button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>Weet je het zeker? Al je gegevens gaan definitief verloren.</p>
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
        </>
      )}

      {pending && (
        <ImpactSheet
          eyebrow="PLANNING AANPASSEN?"
          title={pending.title}
          lines={pending.lines}
          why={pending.proposal.consequences}
          primaryLabel="NU TOEPASSEN"
          secondaryLabel="ALLEEN NIEUWE PLANNING"
          onPrimary={() => void applyPending()}
          onSecondary={keepForNewPlanning}
          onClose={keepForNewPlanning}
          busy={applying}
        />
      )}

      <p className="px-1 text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        ASCEND · Train. Progress. Explore. Ascend.
      </p>
    </div>
  );
}

function SectionNote({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs leading-relaxed" style={{ color: 'var(--color-gold)' }}>{text}</p>;
}

function OptionList<T extends string>({ options, value, onChange }: { options: { value: T; label: string; note: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
            style={{ borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: selected ? 'var(--color-gold)' : 'var(--color-ink)' }}>{option.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{option.note}</p>
          </button>
        );
      })}
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

type BudgetDraft = { preferred?: number; hardMax?: number };

// Rendered with a `key` that flips once real data replaces the initial
// default (SettingsPage's own `loading` -> 'ready' transition) so this
// initializes its drafts directly from props exactly once, via a fresh
// mount — no effect needed to re-sync local edit state.
function DailyBudgetEditor({
  dailyTimeBudget,
  onSave,
  note,
}: {
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>>;
  onSave: (next: Partial<Record<Weekday, DailyTimeBudget>>) => void;
  note?: string;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<Weekday, BudgetDraft>>>(() => {
    const initial: Partial<Record<Weekday, BudgetDraft>> = {};
    for (const day of WEEKDAY_ORDER) {
      const budget = dailyTimeBudget[day];
      initial[day] = { preferred: budget?.preferredMinutes, hardMax: budget?.hardMaximumMinutes };
    }
    return initial;
  });

  function handleSave() {
    const next: Partial<Record<Weekday, DailyTimeBudget>> = {};
    for (const day of WEEKDAY_ORDER) {
      const draft = drafts[day];
      const preferredMinutes = draft?.preferred;
      if (!preferredMinutes || preferredMinutes <= 0) continue; // an empty day simply has no budget — never a fabricated one
      next[day] = {
        preferredMinutes,
        softFlexMinutes: deriveSoftFlexMinutes(preferredMinutes),
        ...(draft?.hardMax ? { hardMaximumMinutes: draft.hardMax } : {}),
      };
    }
    onSave(next);
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>TRAININGSTIJD PER DAG</Eyebrow>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        Hoeveel tijd heb je normaal per dag? Daarmee bepaalt ASCEND of een tweede sessie op een dag past. Een lege dag
        telt als vol zodra er één sessie op staat.
      </p>
      <div className="flex flex-col gap-2">
        {WEEKDAY_ORDER.map((day) => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm" style={{ color: 'var(--color-ink)' }}>{WEEKDAY_LABELS_NL[day]}</span>
            <div className="flex-1">
              <NumberField
                compact
                unit="min"
                placeholder="niet ingesteld"
                value={drafts[day]?.preferred}
                onChange={(v) => setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], preferred: v } }))}
              />
            </div>
            {showAdvanced && (
              <div className="w-28">
                <NumberField
                  compact
                  unit="max"
                  value={drafts[day]?.hardMax}
                  onChange={(v) => setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], hardMax: v } }))}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setShowAdvanced((v) => !v)} className="self-start text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {showAdvanced ? '− verberg harde limiet' : '+ harde limiet per dag'}
      </button>
      <PrimaryButton onClick={handleSave}>OPSLAAN</PrimaryButton>
      <SectionNote text={note} />
    </Card>
  );
}
