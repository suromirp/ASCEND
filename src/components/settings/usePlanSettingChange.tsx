import { useState, type ReactNode } from 'react';
import { useAppData, type UndoRestore } from '../../state/AppDataContext';
import { ImpactSheet } from '../ImpactSheet';
import type { Weekday, DailyTimeBudget, TrainingStrategyProfile } from '../../models/goalEngineConfig';
import type { PlanChangeProposal } from '../../models/planChange';
import { classifyChangeImpact, describeChanges, needsConfirmation, type ChangeApplyMode } from '../../engine/changeImpact';
import { computeScheduleFit, computeSportDisableProposal, computeSportEnableProposal } from '../../engine/scheduleFit';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, templateSport, weeklyPatternTemplates, type Sport } from '../../engine/sports';
import { computeSportFrequencyPlan } from '../../engine/sportFrequency';
import { todayISO } from '../../utils/dates';
import { useHorizonChange } from '../useHorizonChange';
import type { AppSettings } from '../../storage/database';

type PendingImpact = { title: string; proposal: PlanChangeProposal; lines: string[]; restore?: UndoRestore };

// Alles wat de planning verandert gaat langs hetzelfde pad (Fase 2, het patroon van de terugkoppeling): niets te veranderen, dan zegt het dat;
// een wijziging die jouw keuze bij "Wijzigingen" toelaat, past het toe met een melding en
// ongedaan maken; anders vraagt het eerst Akkoord of Liever niet. De zinnen die vroeger
// onder de kaarten stonden, komen nu als `note` bovenaan de pagina (en in het blad).
// De engine-functies zijn dezelfde als altijd (changeImpact, scheduleFit, sportFrequency).
//
// Een instelling die de planningsronde zelf anders laat lopen (een sport aan of uit,
// De lange zondag, de lengte van de fases, Ambitie, Rust na een bergtocht) wordt pas
// bewaard na Akkoord: anders zette de volgende ronde je planning alsnog stil om
// (Warden Logica punt 2). Het voorstel toont de hele ronde (components/useHorizonChange.tsx);
// Liever niet laat de instelling en je planning zoals ze waren.
export function usePlanSettingChange(): {
  applyMode: ChangeApplyMode;
  note: string | null;
  clearNote: () => void;
  impact: ReactNode;
  toggleSport: (sport: Sport, on: boolean) => Promise<void>;
  setFrequency: (sport: Sport, perWeek: number | undefined) => Promise<void>;
  setPairing: (value: TrainingStrategyProfile['sameDayPairingPreference']) => Promise<void>;
  saveBudget: (next: Partial<Record<Weekday, DailyTimeBudget>>) => Promise<void>;
  // A setting the planning run reads: a proposal first, stored only with Akkoord.
  changeSetting: (title: string, patch: Partial<AppSettings>, why: string) => Promise<void>;
  busy: boolean;
} {
  const {
    settings, updateSettings, goalEngineConfig, updateGoalEngineConfig, plannedSessions, templates, sessionLogs, program,
    commitPlanChange, templateById, planHorizonChange,
  } = useAppData();
  const horizon = useHorizonChange();
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImpact | null>(null);
  const [applying, setApplying] = useState(false);
  const applyMode: ChangeApplyMode = settings.changeApplyMode ?? 'auto_small';
  const enabledSports = { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports };
  const frequency = settings.sportFrequency ?? {};

  async function route(title: string, proposal: PlanChangeProposal, restore?: UndoRestore) {
    const asOf = todayISO();
    const level = classifyChangeImpact(proposal.changes, plannedSessions, asOf);
    if (level === 'hint') {
      setNote(`Opgeslagen. ${proposal.consequences}`);
      return;
    }
    const lines = describeChanges(proposal.changes, plannedSessions, templates);
    if (needsConfirmation(level, applyMode)) {
      setPending({ title, proposal, lines, restore });
      return;
    }
    await commitPlanChange(proposal, title, restore);
    setNote('Gelukt, het staat in je planning. Onderin zie je wat er veranderde en kun je het ongedaan maken.');
  }

  function scheduleFitFor(settingLabel: string, dailyTimeBudget: typeof goalEngineConfig.availability.dailyTimeBudget, pairing: TrainingStrategyProfile['sameDayPairingPreference']) {
    return computeScheduleFit({
      plannedSessions, templates, sessionLogs, program, dailyTimeBudget, sameDayPairingPreference: pairing, asOf: todayISO(), settingLabel,
    }).proposal;
  }

  async function setPairing(value: TrainingStrategyProfile['sameDayPairingPreference']) {
    if (value === goalEngineConfig.strategy.sameDayPairingPreference) return;
    await updateGoalEngineConfig({ strategy: { ...goalEngineConfig.strategy, sameDayPairingPreference: value } });
    const label = 'Meerdere trainingen op één dag';
    await route(label, scheduleFitFor(label, goalEngineConfig.availability.dailyTimeBudget, value), { config: { strategy: goalEngineConfig.strategy } });
  }

  async function saveBudget(nextBudget: Partial<Record<Weekday, DailyTimeBudget>>) {
    await updateGoalEngineConfig({ availability: { ...goalEngineConfig.availability, dailyTimeBudget: nextBudget } });
    const label = 'Trainingstijd per dag';
    await route(label, scheduleFitFor(label, nextBudget, goalEngineConfig.strategy.sameDayPairingPreference), { config: { availability: goalEngineConfig.availability } });
  }

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

  function changeSetting(title: string, patch: Partial<AppSettings>, why: string) {
    setNote(null);
    return horizon.propose(
      () => planHorizonChange({
        title, why, trigger: 'availability_changed', settings: patch,
        explanation: 'Deze instelling bepaalt hoe ASCEND je weken plant. Ze verandert je planning nooit ongemerkt: je ziet eerst wat er verschuift, omgaat of vervalt. Wat je al deed en wat je zelf vastzette blijft staan.',
      }),
      { eyebrow: 'Planning aanpassen', ask: 'setting', declined: 'Je instelling en je planning blijven zoals ze waren.' },
    );
  }

  // A sport on or off: its own proposal (the sessions of that sport), and on top
  // what the planning run then does (a long run that becomes a mountain hike and
  // back). Both together, stored only with Akkoord.
  async function toggleSport(sport: Sport, on: boolean) {
    const nextEnabled = { ...enabledSports, [sport]: on };
    let start: PlanChangeProposal | null = null;
    let onStored: (() => void) | undefined;
    if (on) {
      const fixed = frequency[sport];
      const sportPattern = weeklyPatternTemplates(templates, { enabledSports: nextEnabled, weekShape: settings.weekShape }).filter((t) => templateSport(t) === sport);
      if (fixed) start = frequencyPlan(sport, fixed);
      else if (sportPattern.length > 0) {
        start = computeSportEnableProposal(
          sportPattern, SPORT_LABEL[sport], plannedSessions, templates, program,
          goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference, todayISO(),
        ).proposal;
      } else {
        onStored = () => setNote(`${SPORT_LABEL[sport]} staat aan op Automatisch. Er komt niets vast bij. Wil je het vast inplannen, kies dan hoe vaak per week.`);
      }
    } else {
      start = computeSportDisableProposal(isSportSession(sport), SPORT_LABEL[sport], plannedSessions, sessionLogs, todayISO());
    }
    setNote(null);
    const title = `${SPORT_LABEL[sport]} ${on ? 'weer aangezet' : 'uitgezet'}`;
    await horizon.propose(
      () => planHorizonChange({
        title,
        why: start?.consequences ?? 'Volgt je sporten.',
        explanation: start?.explanation ?? 'Je sporten bepalen wat ASCEND plant. Een sport aan of uit verandert je planning nooit ongemerkt: je ziet eerst wat er verandert.',
        trigger: 'availability_changed',
        settings: { enabledSports: nextEnabled },
        ...(start && start.changes.length > 0 ? { startItems: start.changes } : {}),
      }),
      { eyebrow: 'Planning aanpassen', ask: 'setting', declined: `${SPORT_LABEL[sport]} blijft ${on ? 'uit' : 'aan'} en je planning blijft zoals hij was.`, onStored },
    );
  }

  async function setFrequency(sport: Sport, perWeek: number | undefined) {
    const restore: UndoRestore = { settings: { sportFrequency: frequency } };
    await updateSettings({ sportFrequency: { ...frequency, [sport]: perWeek } });
    if (perWeek === undefined) {
      setNote(`${SPORT_LABEL[sport]} staat op Automatisch. Je huidige planning blijft staan; voortaan bepaalt je weekschema hoe vaak.`);
      return;
    }
    await route(`${SPORT_LABEL[sport]}: ${perWeek}x per week`, frequencyPlan(sport, perWeek), restore);
  }

  async function applyPending() {
    if (!pending) return;
    setApplying(true);
    await commitPlanChange(pending.proposal, pending.title, pending.restore);
    setNote('Gelukt, het staat in je planning. Onderin zie je wat er veranderde en kun je het ongedaan maken.');
    setApplying(false);
    setPending(null);
  }

  function keepForNewPlanning() {
    if (!pending) return;
    setNote('Opgeslagen. Je bestaande planning blijft zoals hij is, nieuwe planning gebruikt de nieuwe instelling.');
    setPending(null);
  }

  const impact = pending ? (
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
  ) : null;

  return {
    applyMode,
    note: note ?? horizon.note,
    clearNote: () => { setNote(null); horizon.clearNote(); },
    impact: <>{impact}{horizon.sheet}</>,
    toggleSport, setFrequency, setPairing, saveBudget, changeSetting, busy: horizon.busy,
  };
}
