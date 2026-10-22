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

type PendingImpact = { title: string; proposal: PlanChangeProposal; lines: string[]; restore?: UndoRestore };

// Alles wat de planning verandert gaat langs hetzelfde pad als op de oude pagina
// (Fase 2, het patroon van de terugkoppeling): niets te veranderen, dan zegt het dat;
// een wijziging die jouw keuze bij "Wijzigingen" toelaat, past het toe met een melding en
// ongedaan maken; anders vraagt het eerst Akkoord of Liever niet. De zinnen die vroeger
// onder de kaarten stonden, komen nu als `note` bovenaan de pagina (en in het blad).
// Gedrag gelijk aan Settings.tsx: dezelfde engine-functies, dezelfde voorstellen.
export function usePlanSettingChange(): {
  applyMode: ChangeApplyMode;
  note: string | null;
  clearNote: () => void;
  impact: ReactNode;
  toggleSport: (sport: Sport, on: boolean) => Promise<void>;
  setFrequency: (sport: Sport, perWeek: number | undefined) => Promise<void>;
  setPairing: (value: TrainingStrategyProfile['sameDayPairingPreference']) => Promise<void>;
  saveBudget: (next: Partial<Record<Weekday, DailyTimeBudget>>) => Promise<void>;
} {
  const {
    settings, updateSettings, goalEngineConfig, updateGoalEngineConfig, plannedSessions, templates, sessionLogs, program,
    commitPlanChange, templateById,
  } = useAppData();
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
    setNote('Opgeslagen en toegepast. Onderin zie je wat er veranderde, met ongedaan maken.');
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

  async function toggleSport(sport: Sport, on: boolean) {
    const nextEnabled = { ...enabledSports, [sport]: on };
    const restore: UndoRestore = { settings: { enabledSports } };
    await updateSettings({ enabledSports: nextEnabled });
    if (on) {
      const fixed = frequency[sport];
      if (fixed) {
        await route(`${SPORT_LABEL[sport]} weer aangezet`, frequencyPlan(sport, fixed), restore);
        return;
      }
      const sportPattern = weeklyPatternTemplates(templates, { enabledSports: nextEnabled }).filter((t) => templateSport(t) === sport);
      if (sportPattern.length === 0) {
        setNote(`${SPORT_LABEL[sport]} staat aan op Automatisch. Er komt niets vast bij. Wil je het vast inplannen, kies dan hoe vaak per week.`);
        return;
      }
      const { proposal } = computeSportEnableProposal(
        sportPattern, SPORT_LABEL[sport], plannedSessions, templates, program,
        goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference, todayISO(),
      );
      await route(`${SPORT_LABEL[sport]} weer aangezet`, proposal, restore);
      return;
    }
    const proposal = computeSportDisableProposal(isSportSession(sport), SPORT_LABEL[sport], plannedSessions, sessionLogs, todayISO());
    await route(`${SPORT_LABEL[sport]} uitgezet`, proposal, restore);
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
    setNote('Opgeslagen en toegepast. Onderin zie je wat er veranderde, met ongedaan maken.');
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

  return { applyMode, note, clearNote: () => setNote(null), impact, toggleSport, setFrequency, setPairing, saveBudget };
}
