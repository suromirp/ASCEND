import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData, type UndoRestore } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Toggle } from '../components/ui';
import { BackupStatusLine, StorageProtectionCard, SnapshotsCard } from '../components/DataSafetyCards';
import { ImportWizard } from '../components/ImportWizard';
import { BaselineEvidenceCard } from '../components/BaselineEvidenceCard';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import { NumberField } from '../components/NumberField';
import { WeightSettingsCard } from '../components/WeightCard';
import { ImpactSheet } from '../components/ImpactSheet';
import type { Weekday, DailyTimeBudget, TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { PlanChangeProposal } from '../models/planChange';
import { classifyChangeImpact, describeChanges, needsConfirmation, CHANGE_APPLY_MODE_LABEL, type ChangeApplyMode } from '../engine/changeImpact';
import { computeScheduleFit, computeSportDisableProposal, computeSportEnableProposal } from '../engine/scheduleFit';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, templateSport, weeklyPatternTemplates, type Sport } from '../engine/sports';
import { computeSportFrequencyPlan } from '../engine/sportFrequency';
import { todayISO, resolveProgramWeek, formatDateNL, addDays, mondayOfWeek } from '../utils/dates';
import { ProposalSheet } from '../components/ProposalSheet';
import type { RestDayPlan } from '../engine/restDayProposal';
import { programAnchorDate } from '../engine/programLayout';
import { HeartRateSettings } from '../components/HeartRateSettings';
import { AmbitionSettings } from '../components/AmbitionSettings';
import { REST_DAY_OPTIONS } from '../engine/restDay';
import { StrengthDurationSettings } from '../components/StrengthDurationSettings';
import { PhaseEditor } from '../components/PhaseEditor';
import { checkForUpdate, APP_VERSION, BUILD_TIME } from '../utils/appUpdate';
import { getConnection } from '../storage/externalActivities';
import { SETTINGS_GROUPS, SETTINGS_INDEX, settingsAnchor, type SettingsGroupId, type SettingsIndexItem } from '../data/settingsIndex';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { searchSettings, settingAvailability, type SettingsVisibility } from '../engine/settingsSearch';
import { ForgeSettings } from '../components/ForgeSettings';
import { resolveOverviews, type OverviewSettings, type ReviewDay } from '../engine/overviewSettings';
import { clothingAdjustSummary, hasClothingAdjust } from '../engine/clothingFeedback';
import type { ReactNode } from 'react';

const WEEKDAYS_NL = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];

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
  { value: 'automatic', label: 'Automatisch', note: 'ASCEND beslist zelf op basis van je tijdbudget per dag.' },
  { value: 'always', label: 'Ja', note: 'Plaats zo veel mogelijk sessies samen als de tijd het toelaat.' },
  { value: 'only_if_useful', label: 'Alleen als het moet', note: 'Alleen samenvoegen als er anders écht geen plek is.' },
  { value: 'never', label: 'Nee', note: 'Nooit meer dan één training per dag.' },
];

const PLANNABLE_SPORTS: Sport[] = ['running', 'hiking', 'cycling'];

type PendingImpact = { section: string; title: string; proposal: PlanChangeProposal; lines: string[]; restore?: UndoRestore };

// The build time in the user's own time zone, e.g. "4 oktober 18:59".
function buildTimeLocal(): string {
  const d = new Date(BUILD_TIME);
  if (Number.isNaN(d.getTime())) return '';
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${formatDateNL(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const jumpTo = (useLocation().state as { jumpTo?: string } | null)?.jumpTo;
  const {
    loading, exportData, settings, updateSettings, goalEngineConfig, updateGoalEngineConfig, injuryNotes,
    rebuildRecommendations, resetDemoData, plannedSessions, templates, sessionLogs, program, commitPlanChange, templateById, restartProgram,
    refresh, trainingGoals, goalMilestones, strengthExternal, setStrengthExternal, planRestDay, applyRestDay, planPreviewPass,
  } = useAppData();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, todayISO());
  // The long-Sunday choice only matters when the main goal is not a
  // mountain trek: for a trek the hike is the only sensible answer, so
  // the choice is hidden (unless the long run was chosen before, so it
  // can be switched back).
  const ladderGoalIds = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoal = trainingGoals.find((g) => g.status === 'active' && ladderGoalIds.has(g.id));
  const mainIsTrek = !!mainGoal?.requirements.some((r) => r.discipline === 'hiking' || r.kind === 'elevationGain' || r.kind === 'elevationLoss');
  const showLongSundayChoice = !mainIsTrek || settings.longSundaySession === 'run';
  const activeInjuryCount = injuryNotes.filter((n) => !n.resolvedDate).length;
  const [garminLinked, setGarminLinked] = useState(false);
  useEffect(() => {
    void getConnection().then((c) => setGarminLinked(!!c)).catch(() => undefined);
  }, []);
  const [status, setStatus] = useState<string | null>(null);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [confirmingFullReset, setConfirmingFullReset] = useState(false);
  const [fullResetting, setFullResetting] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showBaselineEditor, setShowBaselineEditor] = useState(false);
  const [hasPreferredDirectory, setHasPreferredDirectory] = useState(false);
  const [pending, setPending] = useState<PendingImpact | null>(null);
  const [restPlan, setRestPlan] = useState<RestDayPlan | null>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [restartFrom, setRestartFrom] = useState<'this_week' | 'next_week'>('this_week');
  const [restartMode, setRestartMode] = useState<'clean' | 'count_only'>('clean');
  const [restarting, setRestarting] = useState(false);
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

  function note(section: string, text: string) {
    setNotes((prev) => ({ ...prev, [section]: text }));
  }

  // Zoeken en springen. Een resultaat zonder pagina scrolt naar het anker op
  // deze pagina; met een pagina navigeert het erheen.
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  function flash(el: HTMLElement) {
    el.animate(
      [{ outline: '1px solid var(--color-bronze)', outlineOffset: '4px' }, { outline: '1px solid transparent', outlineOffset: '4px' }],
      { duration: 1800, easing: 'ease-out' },
    );
  }

  function scrollToId(id: string) {
    // Pas na het opnieuw tekenen bestaat het element.
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      flash(el);
    }, 60);
  }

  // Welke voorwaardelijke instellingen er nu op de pagina staan (zoeken).
  const visibility: SettingsVisibility = {
    longSundayChoice: showLongSundayChoice,
    backupFolder: supportsPreferredDirectory,
    weekReview: resolveOverviews(settings.overviews).weekReview,
    forgeOn: resolveStrengthSettings(settings.strengthModel).enabled,
  };

  function openSetting(item: SettingsIndexItem) {
    if (item.route) {
      navigate(item.route);
      return;
    }
    setQuery('');
    // Staat de instelling er nu niet, dan naar de groep (de regel in het
    // zoekresultaat zei al waarom).
    scrollToId(settingAvailability(item.id, visibility).available ? settingsAnchor(item.id) : `groep-${item.group}`);
  }

  // Een andere pagina kan hier een instelling openen (Forge: "Naar de instellingen").
  useEffect(() => {
    if (jumpTo) scrollToId(jumpTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  function jumpToGroup(id: SettingsGroupId) {
    scrollToId(`groep-${id}`);
  }

  // The one path every schedule-affecting setting goes through (Fase 2
  // feedback pattern): nothing to change -> say so; a change the user's
  // "Wijzigingen toepassen" choice lets through -> apply with a notice and
  // undo; otherwise -> ask "nu toepassen / alleen nieuwe planning" first.
  async function route(section: string, title: string, proposal: PlanChangeProposal, restore?: UndoRestore) {
    const asOf = todayISO();
    const level = classifyChangeImpact(proposal.changes, plannedSessions, asOf);
    if (level === 'hint') {
      note(section, `Opgeslagen. ${proposal.consequences}`);
      return;
    }
    const lines = describeChanges(proposal.changes, plannedSessions, templates);
    if (needsConfirmation(level, applyMode)) {
      setPending({ section, title, proposal, lines, restore });
      return;
    }
    await commitPlanChange(proposal, title, restore);
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
    await route('pairing', label, scheduleFitFor(label, goalEngineConfig.availability.dailyTimeBudget, value), { config: { strategy: goalEngineConfig.strategy } });
  }

  async function handleBudgetSave(nextBudget: typeof goalEngineConfig.availability.dailyTimeBudget) {
    await updateGoalEngineConfig({ availability: { ...goalEngineConfig.availability, dailyTimeBudget: nextBudget } });
    const label = 'Trainingstijd per dag';
    await route('budget', label, scheduleFitFor(label, nextBudget, goalEngineConfig.strategy.sameDayPairingPreference), { config: { availability: goalEngineConfig.availability } });
  }

  const frequency = settings.sportFrequency ?? {};

  function isSportSession(sport: Sport) {
    return (x: { templateId: string }) => { const t = templateById.get(x.templateId); return t ? templateSport(t) === sport : false; };
  }

  function frequencyPlan(sport: Sport, perWeek: number) {
    return computeSportFrequencyPlan({
      sport, perWeek, plannedSessions, templates, sessionLogs, program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      asOf: todayISO(),
    }).proposal;
  }

  async function handleSportToggle(sport: Sport, on: boolean) {
    const nextEnabled = { ...enabledSports, [sport]: on };
    const restore: UndoRestore = { settings: { enabledSports } };
    await updateSettings({ enabledSports: nextEnabled });
    if (on) {
      const fixed = frequency[sport];
      if (fixed) {
        await route('sports', `${SPORT_LABEL[sport]} weer aangezet`, frequencyPlan(sport, fixed), restore);
        return;
      }
      const sportPattern = weeklyPatternTemplates(templates, { enabledSports: nextEnabled }).filter((t) => templateSport(t) === sport);
      if (sportPattern.length === 0) {
        note('sports', `${SPORT_LABEL[sport]} staat aan op Automatisch. Er komt niets vast bij; bij sessies waar het kan zie je dat het ook mag. Wil je het vast inplannen, kies dan hieronder hoe vaak per week.`);
        return;
      }
      const { proposal } = computeSportEnableProposal(
        sportPattern, SPORT_LABEL[sport], plannedSessions, templates, program,
        goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference, todayISO(),
      );
      await route('sports', `${SPORT_LABEL[sport]} weer aangezet`, proposal, restore);
      return;
    }
    const proposal = computeSportDisableProposal(isSportSession(sport), SPORT_LABEL[sport], plannedSessions, sessionLogs, todayISO());
    await route('sports', `${SPORT_LABEL[sport]} uitgezet`, proposal, restore);
  }

  async function handleFrequency(sport: Sport, perWeek: number | undefined) {
    const restore: UndoRestore = { settings: { sportFrequency: frequency } };
    await updateSettings({ sportFrequency: { ...frequency, [sport]: perWeek } });
    if (perWeek === undefined) {
      note('sports', `${SPORT_LABEL[sport]} staat op Automatisch. Je huidige planning blijft staan; voortaan bepalen je weekschema en de weekplanning hoe vaak.`);
      return;
    }
    await route('sports', `${SPORT_LABEL[sport]}: ${perWeek}x per week`, frequencyPlan(sport, perWeek), restore);
  }

  // Another rest day is always a proposal with Akkoord (engine/restDayProposal.ts).
  function chooseRestDay(day: number) {
    if ((settings.restDay ?? 1) === day) return;
    const plan = planRestDay(day);
    if (plan.proposal.changes.length === 0) {
      void applyRestDay(plan).then(() => note('restDay', 'Opgeslagen. Je planning hoefde niet te veranderen.'));
      return;
    }
    setRestPlan(plan);
  }

  async function applyPending() {
    if (!pending) return;
    setApplying(true);
    await commitPlanChange(pending.proposal, pending.title, pending.restore);
    note(pending.section, 'Opgeslagen en toegepast. Onderaan zie je wat er veranderde, met ongedaan maken.');
    setApplying(false);
    setPending(null);
  }

  function keepForNewPlanning() {
    if (!pending) return;
    note(pending.section, 'Opgeslagen. Je bestaande planning blijft zoals hij is, nieuwe planning gebruikt de nieuwe instelling.');
    setPending(null);
  }

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  async function handleCheckUpdate() {
    setCheckingUpdate(true);
    const result = await checkForUpdate();
    setCheckingUpdate(false);
    note('update', result === 'update'
      ? 'Er is een nieuwe versie. Zodra die binnen is verschijnt onderin Bijwerken.'
      : result === 'offline'
        ? 'Je bent offline. Zoeken naar een update kan zodra je verbinding hebt.'
      : result === 'latest'
        ? 'Je hebt de nieuwste versie.'
        : 'Controleren lukt hier niet (bijvoorbeeld in de ontwikkelversie). Herlaad de pagina om de nieuwste versie te krijgen.');
  }

  async function handleExport() {
    const result = await exportData();
    setStatus(result === 'saved'
      ? 'Back-up opgeslagen.'
      : result === 'downloaded'
        ? 'Back-up gedownload. Controleer of het bestand in je Downloads staat en bewaar het op een veilige plek.'
        : null);
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

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 px-4 pb-2 pt-1" style={{ background: 'var(--color-bg)' }}>
        <label htmlFor="settings-search" className="sr-only">Zoek in de instellingen</label>
        <input
          id="settings-search"
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Zoek een instelling, bijvoorbeeld horloge"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm"
          style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        />
        {!searching && (
          <nav aria-label="Groepen" className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {SETTINGS_GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => jumpToGroup(g.id)}
                className="min-h-[44px] shrink-0 rounded-full border px-3 text-xs"
                style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)', background: 'var(--color-charcoal)' }}
              >
                {g.title}
              </button>
            ))}
          </nav>
        )}
      </div>

      {searching && <SearchResults query={query} visibility={visibility} onPick={openSetting} />}

      {!searching && (
        <>
          <GroupSection id="training">
            <Anchor id="sporten">
              <Card className="flex flex-col gap-3">
                <Eyebrow>SPORTEN</Eyebrow>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Welke sporten mag ASCEND inplannen? Uit betekent: geen nieuwe sessies van die sport, ook niet bij een schone start. Loggen kan altijd.
                </p>
                {PLANNABLE_SPORTS.map((sport) => (
                  <div key={sport} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{SPORT_LABEL[sport]}</p>
                      <Toggle checked={enabledSports[sport]} onChange={(v) => void handleSportToggle(sport, v)} label={SPORT_LABEL[sport]} />
                    </div>
                    {enabledSports[sport] && (
                      <div className="flex gap-1" role="group" aria-label={`${SPORT_LABEL[sport]} per week`}>
                        {([undefined, 1, 2, 3, 4, 5] as const).map((n) => {
                          const selected = frequency[sport] === n;
                          return (
                            <button
                              key={n ?? 'auto'}
                              onClick={() => void handleFrequency(sport, n)}
                              className="min-h-[44px] flex-1 rounded-lg border py-1 text-xs"
                              style={{ borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)', color: selected ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
                            >
                              {n === undefined ? 'Auto' : `${n}×`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  Automatisch: je weekschema en de weekplanning bepalen hoe vaak. Een aantal per week: ASCEND houdt dat aan en kiest zelf de dagen. Past het niet, dan zegt ASCEND waarom.
                </p>
                <SectionNote text={notes.sports} />
              </Card>
            </Anchor>
            <Anchor id="wijzigingen">
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
            </Anchor>
            <Anchor id="trainingstijd">
              <DailyBudgetEditor
                key={loading ? 'loading' : 'ready'}
                dailyTimeBudget={goalEngineConfig.availability.dailyTimeBudget}
                onSave={(nextBudget) => void handleBudgetSave(nextBudget)}
                note={notes.budget}
              />
            </Anchor>
            <Anchor id="rustdag">
              <Card className="flex flex-col gap-3">
                <Eyebrow>RUSTDAG</Eyebrow>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Op welke dag wil je rust? ASCEND verdeelt de andere trainingen opnieuw over de week, met genoeg afstand tussen
                  zware trainingen. Het weekend blijft voor de lange trainingen.
                </p>
                <div className="flex gap-2" role="radiogroup" aria-label="Rustdag">
                  {REST_DAY_OPTIONS.map((d) => {
                    const on = (settings.restDay ?? 1) === d;
                    return (
                      <button
                        key={d}
                        role="radio"
                        aria-checked={on}
                        aria-label={WEEKDAYS_NL[d - 1]}
                        onClick={() => chooseRestDay(d)}
                        className="min-h-[44px] flex-1 rounded-lg border text-xs font-semibold"
                        style={{ borderColor: on ? 'var(--color-bronze)' : 'var(--color-card-border)', color: on ? 'var(--color-gold)' : 'var(--color-ink-dim)', background: 'var(--color-charcoal)' }}
                      >
                        {WEEKDAYS_NL[d - 1].slice(0, 2).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Je ziet eerst wat er verschuift, ook deze week, en het geldt pas na Akkoord. Trainingen die je zelf verplaatste of al afvinkte blijven staan.
                </p>
                <SectionNote text={notes.restDay} />
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat doe je op die dag?</p>
                <OptionList
                  options={[
                    { value: 'rest', label: 'Rust', note: 'Wandelen mag, er valt niets af te vinken.' },
                    { value: 'active', label: 'Lichte hersteldag', note: '20 tot 30 minuten heel rustig wandelen of fietsen, met één tik afgevinkt. Telt niet als training.' },
                  ]}
                  value={settings.restDayMode ?? 'rest'}
                  onChange={(v) => void updateSettings({ restDayMode: v }).then(() => refresh())}
                />
              </Card>
            </Anchor>
            <Anchor id="meerdere">
              <Card className="flex flex-col gap-3">
                <Eyebrow>MEERDERE TRAININGEN OP ÉÉN DAG</Eyebrow>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Mag ASCEND twee sessies op dezelfde dag plannen als je tijd per dag dat toelaat?
                </p>
                <OptionList options={PAIRING_OPTIONS} value={goalEngineConfig.strategy.sameDayPairingPreference} onChange={(v) => void handlePairingChange(v)} />
                <SectionNote text={notes.pairing} />
                <div className="flex items-center justify-between gap-4 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Zware dingen op één dag</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                      Benen en een zware loop, zoals heuvels, mogen op dezelfde dag: eerst de loop, liefst 6 uur later kracht. Minstens 3 uur, en eerder als je je weer fit voelt.
                      De dagen eromheen blijven dan rustig. Alleen als je tijd per dag het toelaat.
                    </p>
                  </div>
                  <Toggle checked={!!settings.hardSameDay} onChange={(v) => void updateSettings({ hardSameDay: v }).then(() => refresh())} label="Zware dingen op één dag" />
                </div>
              </Card>
            </Anchor>
            <Anchor id="kracht">
              <Card className="flex flex-col gap-3">
                <Eyebrow>KRACHTTRAINING</Eyebrow>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Bijgehouden in MacroFactor</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                      Sets, reps en gewicht log je in MacroFactor. Dan vink je een krachttraining in ASCEND in één tik af,
                      zonder invulformulier. Dit is dezelfde keuze als de bron van je krachtblok.
                    </p>
                  </div>
                  <Toggle checked={strengthExternal} onChange={(v) => void setStrengthExternal(v)} label="Kracht bijgehouden in MacroFactor" />
                </div>
                <StrengthDurationSettings />
              </Card>
            </Anchor>
            <ForgeSettings />
            <Anchor id="ambitie">
              <AmbitionSettings />
            </Anchor>
            <Anchor id="hartslag">
              <HeartRateSettings />
            </Anchor>
            <Card className="flex flex-col gap-1">
              <Eyebrow>Gezondheid</Eyebrow>
              <NavRow
                label="Blessures"
                note={activeInjuryCount > 0 ? `${activeInjuryCount} actief. ASCEND houdt er rekening mee.` : 'Geen actieve blessures. Meld hier waar je last van hebt.'}
                onClick={() => navigate('/blessures')}
              />
            </Card>
            <Anchor id="lichaamsgewicht">
              <WeightSettingsCard />
            </Anchor>
          </GroupSection>

          <GroupSection id="doelen">
            <Card className="flex flex-col gap-1">
              <Eyebrow>Snel naar</Eyebrow>
              <NavRow label="Doelen en tussendoelen" note="Je hoofddoel, je tochten en de stappen ertussen" onClick={() => navigate('/ascend/doelen')} />
              <NavRow label="Vrije dagen en vakanties" note="Dagen zonder training of een tocht, op de pagina Week" onClick={() => navigate('/week')} />
              <NavRow label="Reisplanner" note="Wat je nog moet regelen voor de grote tocht" onClick={() => navigate('/reis')} />
              <NavRow label="Paklijst" note="Wat in je rugzak gaat en wat dat weegt" onClick={() => navigate('/reis/paklijst')} />
            </Card>
            <Card className="flex flex-col gap-2">
              <Eyebrow>Tochten</Eyebrow>
              <SwitchRow
                id="volgende-tocht"
                title="Eerstvolgende tocht op Vandaag"
                note="Een rustige regel met je volgende tocht, zolang die eerder is dan je hoofddoel."
                checked={settings.showNextTrek !== false}
                onChange={(on) => void updateSettings({ showNextTrek: on })}
              />
              <SwitchRow
                id="rust-na-tocht"
                title="Soepele rust na een bergtocht"
                note="Aan: een zware beendag mag in de korte versie al 48 uur na je tocht, uit: ASCEND houdt 72 uur. Dit geldt voor nieuwe en gewijzigde tochten; een tocht die al staat, houdt zijn planning tot je hem wijzigt."
                checked={settings.trekLegRest !== 'strict'}
                onChange={(on) => void updateSettings({ trekLegRest: on ? 'soft' : 'strict' })}
              />
            </Card>
            <Anchor id="programma">
              <Card className="flex flex-col gap-3">
                <Eyebrow>PROGRAMMA</Eyebrow>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  {position
                    ? `Je staat nu in week ${position.weekInProgram} van ${position.totalWeeksInProgram}, ${position.phase.name.toLowerCase()}.`
                    : 'Deze week valt buiten het programma.'}
                </p>
                <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  {goalDate
                    ? `De fases zijn teruggerekend vanaf je hoofddoel op ${formatDateNL(goalDate)}. Vlak voor de start bouw je af, zodat je fris aan de start staat.`
                    : 'Er is geen datum voor je hoofddoel. Geef je doel een datum bij ASCEND, dan rekent ASCEND de fases terug tot die dag.'}
                </p>
                <PhaseEditor goalDate={goalDate} />
                <button onClick={() => navigate('/ascend/doelen')} className="min-h-[44px] self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }}>
                  Doelen en tussendoelen beheren
                </button>
                {showLongSundayChoice && <div id={settingsAnchor('lange-zondag')} className="flex flex-col gap-2">
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>De lange zondag vanaf Bergcapaciteit</p>
                  <OptionList
                    options={[
                      { value: 'hike' as const, label: 'Bergtocht', note: 'Een lange wandeling met hoogtemeters en een rugzak die stap voor stap zwaarder wordt. In Expeditieklaar ook op zaterdag wandelen.' },
                      { value: 'run' as const, label: 'Lange duurloop', note: 'Je blijft elke zondag hardlopen, bijvoorbeeld voor een marathon. Bergwandelen train je dan zelf.' },
                    ]}
                    value={settings.longSundaySession ?? 'hike'}
                    onChange={async (v) => {
                      await updateSettings({ longSundaySession: v });
                      await refresh();
                      note('program', v === 'hike' ? 'Vanaf Bergcapaciteit staat er op zondag een bergtocht.' : 'Je houdt elke zondag de lange duurloop.');
                    }}
                  />
                </div>}
                <div id={settingsAnchor('na-hoofddoel')} className="flex flex-col gap-2">
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Na je hoofddoel</p>
                  <OptionList
                    options={[
                      { value: 'stop' as const, label: 'Niets meer plannen', note: 'Advies. Tijdens de tocht en daarna staat er geen training, tot je een nieuw doel kiest of dit doel op behaald zet.' },
                      { value: 'maintain' as const, label: 'Onderhoudsweken', note: 'Na de laatste dag van de tocht plant ASCEND gewone onderhoudsweken. Tijdens de tocht zelf nooit.' },
                    ]}
                    value={settings.afterMainGoal ?? 'stop'}
                    onChange={async (v) => {
                      await updateSettings({ afterMainGoal: v });
                      await refresh();
                      note('program', v === 'stop' ? 'Na je hoofddoel plant ASCEND niets meer.' : 'Na je hoofddoel plant ASCEND onderhoudsweken. Tot die dag verandert er niets.');
                    }}
                  />
                </div>
                {!confirmingRestart ? (
                  <SecondaryButton onClick={() => setConfirmingRestart(true)}>Opnieuw beginnen bij week 1</SecondaryButton>
                ) : (
                  <div className="flex flex-col gap-3">
                    <OptionList
                      options={[
                        { value: 'clean' as const, label: 'Schone start', note: 'De planning wordt vanaf week 1 opnieuw opgebouwd met je huidige instellingen: sporten aan/uit en je krachtblok. Eigen verplaatsingen vanaf dat moment vervallen. Je geschiedenis blijft.' },
                        { value: 'count_only' as const, label: 'Alleen de weektelling', note: 'Alleen het weeknummer en de opbouw per week schuiven. Wat er gepland staat blijft precies zoals het is.' },
                      ]}
                      value={restartMode}
                      onChange={setRestartMode}
                    />
                    <OptionList
                      options={[
                        { value: 'this_week' as const, label: 'Deze week is week 1', note: 'Vanaf vandaag.' },
                        { value: 'next_week' as const, label: 'Volgende week is week 1', note: 'Deze week blijft zoals hij is, het programma begint aankomende maandag.' },
                      ]}
                      value={restartFrom}
                      onChange={setRestartFrom}
                    />
                    <div className="flex gap-3">
                      <SecondaryButton onClick={() => setConfirmingRestart(false)} disabled={restarting}>Annuleren</SecondaryButton>
                      <SecondaryButton
                        disabled={restarting}
                        onClick={async () => {
                          setRestarting(true);
                          const summary = await restartProgram(restartFrom, restartMode);
                          setRestarting(false);
                          setConfirmingRestart(false);
                          note('program', summary);
                        }}
                      >
                        {restarting ? 'Bezig…' : 'Bevestigen'}
                      </SecondaryButton>
                    </div>
                  </div>
                )}
                <SectionNote text={notes.program} />
              </Card>
            </Anchor>
          </GroupSection>

          <GroupSection id="overzichten">
            <OverviewSettingsCard />
            <Anchor id="geluid">
              <Card className="flex flex-col gap-3">
                <Eyebrow>GELUID</Eyebrow>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Geluidseffecten</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                      Een paar lage tonen bij het openen van de app en een klank bij een voltooide sessie of mijlpaal. Het
                      openingsgeluid speelt pas na je eerste tik; zo werken browsers.
                    </p>
                  </div>
                  <Toggle checked={settings.introSoundEnabled} onChange={(v) => updateSettings({ introSoundEnabled: v })} label="Geluidseffecten" />
                </div>
              </Card>
            </Anchor>
          </GroupSection>

          <GroupSection id="koppelingen">
            <Anchor id="health-connect">
              <Card className="flex flex-col gap-3">
                <Eyebrow>Horloge en voeding</Eyebrow>
                <NavRow
                  label="Garmin koppelen via intervals.icu"
                  note={garminLinked ? 'Verbonden: trainingen van je horloge komen als voorstel op Vandaag' : 'Trainingen van je horloge zonder overtypen'}
                  onClick={() => navigate('/koppelen/garmin')}
                />
                <NavRow
                  label="Wat ASCEND van je horloge gebruikt"
                  note="Per soort gegeven aan of uit: trainingen, slaap, rusthartslag en HRV"
                  onClick={() => navigate('/koppelen/garmin')}
                />
                <NavRow
                  label="MacroFactor inlezen"
                  note="Krachttrainingen en gewicht uit je export, met echte duur en herhalingen in reserve"
                  onClick={() => navigate('/koppelen/macrofactor')}
                />
                <NavRow
                  label="Gewicht uit MacroFactor gebruiken"
                  note="Aan of uit, bij het inlezen van je export"
                  onClick={() => navigate('/koppelen/macrofactor')}
                />
                <div className="flex flex-col gap-3 opacity-60">
                  <IntegrationRow name="Health Connect" note="Komt later" />
                </div>
              </Card>
            </Anchor>
          </GroupSection>

          <GroupSection id="gegevens">
            <Anchor id="backup">
              <Card className="flex flex-col gap-3">
                <Eyebrow>Back-up</Eyebrow>
                <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                  Alles staat op deze telefoon. Bewaar regelmatig een back-up in een bestand.
                </p>
                <BackupStatusLine />
                <PrimaryButton onClick={handleExport}>Exporteer data</PrimaryButton>
                <SecondaryButton onClick={() => setShowImportWizard(true)}>Importeer data</SecondaryButton>
                {status && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{status}</p>}
              </Card>
            </Anchor>
            {supportsPreferredDirectory && (
              <Anchor id="backupmap">
                <Card className="flex flex-col gap-3">
                  <Eyebrow>Back-upmap</Eyebrow>
                  <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                    Kies een vaste map waar “Exporteer data” automatisch naartoe schrijft, zonder elke keer een opslaanvenster.
                  </p>
                  <SecondaryButton onClick={handleChooseDirectory}>{hasPreferredDirectory ? 'Map wijzigen' : 'Map kiezen'}</SecondaryButton>
                </Card>
              </Anchor>
            )}
            <Anchor id="opslag">
              <StorageProtectionCard />
            </Anchor>
            <Anchor id="momentopnamen">
              <SnapshotsCard />
            </Anchor>
            <Anchor id="versie">
              <Card className="flex flex-col gap-3">
                <Eyebrow>APP</Eyebrow>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  Versie {APP_VERSION} · {buildTimeLocal()}
                </p>
                <SecondaryButton onClick={() => void handleCheckUpdate()} disabled={checkingUpdate}>
                  {checkingUpdate ? 'Zoeken…' : 'Zoeken naar update'}
                </SecondaryButton>
                <SectionNote text={notes.update} />
              </Card>
            </Anchor>
            <Anchor id="startniveau">
              {!showBaselineEditor ? (
                <Card className="flex flex-col gap-1">
                  <button onClick={() => setShowBaselineEditor(true)} className="flex items-center justify-between gap-3 text-left">
                    <div>
                      <Eyebrow>STARTNIVEAU ZELF INVULLEN</Eyebrow>
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
                  <button onClick={() => setShowBaselineEditor(false)} className="min-h-[44px] self-end text-xs" style={{ color: 'var(--color-ink-dim)' }}>Verbergen</button>
                  <BaselineEvidenceCard />
                </div>
              )}
            </Anchor>
            <Card className="flex flex-col gap-3">
              <Eyebrow>OPNIEUW BEGINNEN</Eyebrow>
              <div id={settingsAnchor('herbouwen')} className="flex flex-col gap-2">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Aanbevelingen opnieuw laten berekenen</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Krachtblok-review en aanpassingen voor de komende weken worden normaal ververst als je de app opent. Dit
                  laat ASCEND nu meteen opnieuw kijken en verwijdert niets.
                </p>
                <SecondaryButton onClick={handleRebuildRecommendations} disabled={rebuilding}>{rebuilding ? 'Bezig…' : 'Herbouw aanbevelingen'}</SecondaryButton>
                {rebuildStatus && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{rebuildStatus}</p>}
              </div>

              <div id={settingsAnchor('wissen')} className="mt-3 flex flex-col gap-2">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Alles verwijderen en opnieuw beginnen</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Wist al je geschiedenis, doelen, blessures en instellingen en start met het standaardprogramma. Dit kan niet
                  ongedaan worden gemaakt. Exporteer eerst een back-up als je iets wilt bewaren.
                </p>
                {!confirmingFullReset ? (
                  <button onClick={() => setConfirmingFullReset(true)} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-danger-text)' }}>Alles verwijderen…</button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-danger-text)' }}>Weet je het zeker? Al je gegevens gaan definitief verloren.</p>
                    <button onClick={handleExport} className="inline-flex min-h-[44px] items-center text-left text-xs underline" style={{ color: 'var(--color-gold)' }}>Eerst een back-up exporteren</button>
                    <div className="flex gap-3">
                      <SecondaryButton onClick={() => setConfirmingFullReset(false)} disabled={fullResetting}>Annuleren</SecondaryButton>
                      <button
                        onClick={handleFullReset}
                        disabled={fullResetting}
                        className="min-h-[44px] flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                        style={{ background: 'var(--color-danger)', color: '#fff' }}
                      >
                        {fullResetting ? 'Bezig…' : 'Ja, alles verwijderen'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            {showImportWizard && <ImportWizard onClose={() => setShowImportWizard(false)} />}
          </GroupSection>

          <GroupSection id="gidsen">
            <Card className="flex flex-col gap-1">
              <Eyebrow>Uitleg en kennis</Eyebrow>
              <NavRow label="Kennisbank" note="Navigeren, weer, sneeuw, slapen en meer: alles voor onderweg" onClick={() => navigate('/kennis')} />
              <NavRow label="Trainingsgids" note="Doel, uitvoering en waar op letten per trainingsdag" onClick={() => navigate('/gids')} />
              <NavRow label="Garmin" note="Zones, dataschermen en hoe je de metrics leest" onClick={() => navigate('/garmin')} />
              <NavRow label="Trainingsplekken" note="Waar je in Nederland bergop en bergaf traint" onClick={() => navigate('/plekken')} />
              <NavRow label="Weer" note="Hoe ASCEND het weer beoordeelt en waar het vandaan komt" onClick={() => navigate('/weer')} />
              <NavRow label="Bronnen" note="Alle onderzoeken en bronnen achter de adviezen" onClick={() => navigate('/bronnen')} />
            </Card>
          </GroupSection>
        </>
      )}

      {restPlan && (
        <ProposalSheet
          advice={{
            id: `restday:${restPlan.restDay}`,
            trigger: 'plan_update',
            ruleId: 'REST-DAY',
            title: 'Zo ziet je planning eruit',
            effect: restPlan.proposal.consequences,
            why: restPlan.proposal.explanation,
            priority: 0,
            proposal: restPlan.proposal,
          }}
          eyebrow={`Rustdag · ${WEEKDAYS_NL[restPlan.restDay - 1]}`}
          previewPass={(sessions) => planPreviewPass(sessions, undefined, restPlan.restDay)}
          leave={settings.leavePeriods}
          notes={['Wat je zelf verplaatste of al afvinkte, je tochten en een test of wedstrijd die je vastzette.']}
          listUntil={addDays(mondayOfWeek(todayISO()), 13)}
          onRespond={async (response) => {
            if (response === 'accepted') {
              await applyRestDay(restPlan);
              note('restDay', 'Opgeslagen en toegepast. Onderaan zie je wat er veranderde, met ongedaan maken.');
            } else note('restDay', 'Je rustdag en je planning blijven zoals ze waren.');
          }}
          onClose={() => setRestPlan(null)}
        />
      )}

      {pending && (
        <ImpactSheet
          eyebrow="PLANNING AANPASSEN?"
          title={pending.title}
          lines={pending.lines}
          why={pending.proposal.consequences}
          primaryLabel="Akkoord"
          secondaryLabel="Liever niet"
          note="Met Liever niet blijft je bestaande planning zoals hij is. Alleen nieuwe planning gebruikt de nieuwe instelling."
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
    <button onClick={onClick} className="flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left">
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{label}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
      </div>
      <span className="shrink-0 text-sm" style={{ color: 'var(--color-ink-dim)' }}>›</span>
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
        Hoeveel tijd heb je normaal per dag? ASCEND gebruikt dit om te zien of er nog een tweede training bij past.
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
      <button onClick={() => setShowAdvanced((v) => !v)} className="min-h-[44px] self-start text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {showAdvanced ? '− verberg harde limiet' : '+ harde limiet per dag'}
      </button>
      <SecondaryButton onClick={handleSave}>Opslaan</SecondaryButton>
      <SectionNote text={note} />
    </Card>
  );
}

// --- zoeken en groepen ---------------------------------------------------------

function Anchor({ id, children }: { id: string; children: ReactNode }) {
  return <div id={settingsAnchor(id)} className="scroll-mt-40 rounded-2xl">{children}</div>;
}

function GroupSection({ id, children }: { id: SettingsGroupId; children: ReactNode }) {
  const group = SETTINGS_GROUPS.find((g) => g.id === id)!;
  return (
    <section id={`groep-${id}`} aria-labelledby={`groep-titel-${id}`} className="flex scroll-mt-40 flex-col gap-4">
      <div className="border-t pt-5" style={{ borderColor: 'var(--color-card-border)' }}>
        <h2 id={`groep-titel-${id}`} className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{group.title}</h2>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{group.note}</p>
      </div>
      {children}
    </section>
  );
}

function SearchResults({ query, visibility, onPick }: { query: string; visibility: SettingsVisibility; onPick: (item: SettingsIndexItem) => void }) {
  const results = searchSettings(query, SETTINGS_INDEX);
  if (results.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Niets gevonden voor “{query.trim()}”.</p>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Probeer een ander woord, bijvoorbeeld horloge, gewicht of back-up.</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col">
      <Eyebrow>{results.length === 1 ? '1 resultaat' : `${results.length} resultaten`}</Eyebrow>
      <ul className="mt-1 flex flex-col">
        {results.map(({ item }) => {
          const availability = settingAvailability(item.id, visibility);
          return (
          <li key={item.id}>
            <button onClick={() => onPick(item)} className="flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.title}</p>
                <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{item.note}</p>
                {!availability.available && <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{availability.reason}</p>}
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-bronze)' }}>{SETTINGS_GROUPS.find((g) => g.id === item.group)?.title}</p>
              </div>
              <span className="shrink-0 text-sm" style={{ color: 'var(--color-ink-dim)' }}>›</span>
            </button>
          </li>
          );
        })}
      </ul>
    </Card>
  );
}

// --- Overzichten en vragen -------------------------------------------------------

function SwitchRow({ id, title, note, checked, onChange, children }: { id: string; title: string; note: string; checked: boolean; onChange: (on: boolean) => void; children?: ReactNode }) {
  return (
    <div id={settingsAnchor(id)} className="scroll-mt-40 flex flex-col gap-2 rounded-xl py-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
        </div>
        <Toggle checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}

const REVIEW_DAY_OPTIONS: { value: ReviewDay; label: string; note: string }[] = [
  { value: 'both', label: 'Zondag en maandag', note: 'Zondag over de lopende week, maandag over de week die net voorbij is. Zo was het altijd.' },
  { value: 'sunday', label: 'Alleen zondag', note: 'Over de week die nog loopt.' },
  { value: 'monday', label: 'Alleen maandag', note: 'Over de week die net voorbij is.' },
];

function OverviewSettingsCard() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const o = resolveOverviews(settings.overviews);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte blijft ontbreken
  // en betekent dus de standaard.
  const set = (patch: Partial<OverviewSettings>) => void updateSettings({ overviews: { ...settings.overviews, ...patch } });
  const place = settings.homeLocation;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Aan of uit</Eyebrow>
      <SwitchRow
        id="weekterugblik"
        title="Weekterugblik"
        note="Een korte terugblik op Vandaag, zodat je ziet wat je deed. In het logboek blijven eerdere weken staan."
        checked={o.weekReview}
        onChange={(on) => set({ weekReview: on })}
      >
        {o.weekReview && (
          <div id={settingsAnchor('weekterugblik-dag')} className="scroll-mt-40 flex flex-col gap-2">
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Op welke dag hij verschijnt</p>
            <OptionList options={REVIEW_DAY_OPTIONS} value={o.weekReviewDay} onChange={(v) => set({ weekReviewDay: v })} />
          </div>
        )}
      </SwitchRow>
      <SwitchRow
        id="weekvraag"
        title="Vraag van de week"
        note="Elke week één korte vraag, om je plan voor die week scherp te houden."
        checked={o.weeklyQuestion}
        onChange={(on) => set({ weeklyQuestion: on })}
      />
      <SwitchRow
        id="ochtendcheck"
        title="Ochtendcheck"
        note="Een korte vraag over je benen, energie en slaap, zodat ASCEND een rustiger dag kan voorstellen als je moe bent. Een pijnplek van de laatste twee weken blijft altijd gevolgd, ook als je dit uitzet."
        checked={o.morningCheckIn}
        onChange={(on) => set({ morningCheckIn: on })}
      >
        <button onClick={() => navigate('/koppelen/garmin')} className="min-h-[44px] self-start text-left text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }}>
          Slaap en hartslag van je horloge erin: instellen bij Koppelingen
        </button>
      </SwitchRow>
      <SwitchRow
        id="weerregel"
        title="Weer bij je training"
        note={place ? `Een regel met het weer bij je buitentraining, voor ${place.name}.` : 'Een regel met het weer bij je buitentraining. Kies hieronder eerst een plaats.'}
        checked={o.weatherLine}
        onChange={(on) => set({ weatherLine: on })}
      />
      <SwitchRow
        id="weerruil"
        title="Ruilvoorstellen bij slecht weer"
        note="ASCEND stelt voor een buitentraining naar een betere dag te zetten, altijd met jouw akkoord."
        checked={o.weatherSwap}
        onChange={(on) => set({ weatherSwap: on })}
      />
      <SwitchRow
        id="kledingadvies"
        title="Kledingadvies bij het weer"
        note="Bij een buitentraining een paar korte regels over wat je aantrekt, op basis van het weer en hoe hard je gaat."
        checked={o.clothingAdvice}
        onChange={(on) => set({ clothingAdvice: on })}
      />
      {o.clothingAdvice && (
        <div id={settingsAnchor('kleding-voorkeur')} className="scroll-mt-40 flex flex-col gap-2">
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Na een buitentraining kun je tikken of je kleding goed zat. ASCEND schuift je voorkeur dan een halve graad op, hooguit vier graden per sport. {clothingAdjustSummary(settings.clothingAdjust)}
          </p>
          {hasClothingAdjust(settings.clothingAdjust) && (
            <SecondaryButton className="self-start px-4" onClick={() => void updateSettings({ clothingAdjust: undefined })}>
              Terug naar de standaard
            </SecondaryButton>
          )}
        </div>
      )}
      <div id={settingsAnchor('weerplaats')} className="scroll-mt-40">
        <NavRow label="Plaats voor het weer" note={place ? `${place.name}. Naar de weerdienst gaat alleen een plek afgerond op ongeveer een kilometer.` : 'Nog geen plaats gekozen'} onClick={() => navigate('/weer')} />
      </div>
      <SwitchRow
        id="weervolgt"
        title="Weer volgt je locatie"
        note="Heb je Mijn locatie gekozen, dan werkt ASCEND die plek bij als je de app opent (hoogstens eens per uur), zodat het weer klopt onderweg. Zonder toestemming gebeurt er niets."
        checked={o.weatherFollowsLocation}
        onChange={(on) => set({ weatherFollowsLocation: on })}
      />
      <SwitchRow
        id="citaten"
        title="Citaten na een training"
        note="Een citaat onder het rustige scherm na een training. Uit zetten haalt alleen het citaat weg, de rest van het scherm blijft. Een behaalde mijlpaal krijgt altijd een citaat."
        checked={o.completionMoment}
        onChange={(on) => set({ completionMoment: on })}
      />
    </Card>
  );
}
