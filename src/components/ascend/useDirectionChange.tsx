import type { ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { DirectionId } from '../../data/directions';
import { parseDirection, parseDirectionStart } from '../../engine/direction';
import type { AppSettings } from '../../storage/database';
import { directionChangeLines, directionChangeTitle } from '../../engine/directionChange';
import { beginnerStartLine, isBeginnerStart } from '../../engine/beginnerStart';
import { resolveWaveSettings } from '../../engine/waves';
import { noGoalWavesLines, wavesHeld } from '../../engine/noGoalWaves';
import { waveReviewPatch, type WaveReviewCard, type WaveReviewChoice } from '../../engine/waveReviewCard';
import { mondayOfWeek, todayISO } from '../../utils/dates';
import { reshapeStrength, strengthNotes, strengthPlanItems, strengthTargetFor } from '../../engine/directionStrength';
import { resolveWeekBudget } from '../../engine/weekBudget';
import { listedGoals } from '../../engine/goalList';
import { activeStrengthStrategy } from '../../engine/strengthProgram';
import { readPointer } from '../../utils/forgeSessionStore';
import { useHorizonChange } from '../useHorizonChange';

const KEEP = 'Alles blijft zoals het was.';

// Een richting kiezen zonder doel (docs/visie/Zonder doel.md, 2.3 en 3.5): met een plan altijd een
// voorstel met Akkoord, dat de hele planningsronde laat zien. Akkoord bewaart de richting, de maandag
// waarop hij begint en de planning samen; ongedaan maken zet alle drie terug. Zonder plan (een lege
// installatie) is er niets te plannen en wordt alleen de keuze bewaard.
export function useDirectionChange(): {
  choose: (id: DirectionId) => Promise<void>;
  // Een ander weekbudget terwijl je plan een richting volgt: ook een voorstel.
  proposeBudget: (weekBudget: AppSettings['weekBudget']) => Promise<void>;
  // Een keuze na een golf (engine/waveReviewCard.ts): wat de planning verandert is een voorstel.
  reviewChoice: (card: WaveReviewCard, choice: WaveReviewChoice) => Promise<void>;
  note: string | null;
  clearNote: () => void;
  sheet: ReactNode;
  busy: boolean;
} {
  const { settings, updateSettings, planHorizonChange, program, sessionLogs, templates, plannedSessions, goalEngineConfig, trainingGoals, goalMilestones, strengthProgramStrategies } = useAppData();
  const horizon = useHorizonChange();

  // Past de richting het aantal keer kracht aan? Dan gaat de nieuwe weekvorm mee in hetzelfde voorstel, met
  // de regels die zeggen wat erbij komt, wat vervalt en wat niet lukte (engine/directionStrength.ts).
  // Met een doel in de lijst doet dit niets: dan bepaalt het doel je week.
  function strengthChange(id: DirectionId, weekBudget: unknown) {
    const none = { settings: {}, block: {}, lines: [] as string[] };
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    if (listedGoals(trainingGoals, ladder, todayISO()).length > 0) return none;
    const reshape = reshapeStrength({
      templates, weekShape: settings.weekShape, restDay: settings.restDay,
      target: strengthTargetFor(id, resolveWeekBudget(weekBudget)),
    });
    if (!reshape) return none;
    const planned = strengthPlanItems(reshape, {
      templates, plannedSessions, logs: sessionLogs, program, today: todayISO(), restDay: settings.restDay,
      leave: settings.leavePeriods, illnessEpisodes: settings.illnessEpisodes, openPlannedId: readPointer()?.plannedSessionId,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, pairing: goalEngineConfig.strategy.sameDayPairingPreference,
    });
    const blockFollows = !!activeStrengthStrategy(strengthProgramStrategies);
    return {
      settings: { weekShape: reshape.shape },
      block: { ...(blockFollows ? { strengthBlock: reshape.strategy } : {}), ...(planned.items.length > 0 ? { startItems: planned.items } : {}) },
      lines: strengthNotes(reshape, planned, blockFollows),
    };
  }

  async function choose(id: DirectionId) {
    // Dezelfde richting nog eens houdt zijn golf; een andere begint deze week.
    const start = (settings.direction === id && parseDirectionStart(settings.directionStart)) || mondayOfWeek(todayISO());
    const patch = { direction: id, directionStart: start };
    if (!program) {
      await updateSettings(patch);
      return;
    }
    const kracht = strengthChange(id, settings.weekBudget);
    await horizon.propose(
      () => planHorizonChange({
        title: directionChangeTitle(id),
        why: 'Volgt je richting.',
        explanation: 'Je richting bepaalt hoe ASCEND je weken plant als je geen doel hebt. Eerst een voorstel, pas na Akkoord verandert er iets. Wat je al deed en wat je zelf vastzette blijft staan.',
        trigger: 'direction_changed',
        settings: { ...patch, ...kracht.settings },
        ...kracht.block,
        notes: [
          ...directionChangeLines(id, settings),
          ...kracht.lines,
          ...(wavesHeld(settings, program) ? noGoalWavesLines() : []),
          ...(id !== 'easy' && isBeginnerStart(settings.beginnerStart, sessionLogs, start) ? [beginnerStartLine(start, todayISO(), resolveWaveSettings(settings.waves).length) ?? ''].filter(Boolean) : []),
        ],
      }),
      { eyebrow: 'Je richting', ask: 'always', alwaysAsk: true, notesTitle: 'Je richting', declined: KEEP },
    );
  }

  async function proposeBudget(weekBudget: AppSettings['weekBudget']) {
    const id = parseDirection(settings.direction);
    if (!id || !program) {
      await updateSettings({ weekBudget });
      return;
    }
    const kracht = strengthChange(id, weekBudget);
    await horizon.propose(
      () => planHorizonChange({
        title: 'Je weekbudget',
        why: 'Volgt je weekbudget.',
        explanation: 'Je plan volgt je richting, dus je weekbudget bepaalt hoe lang je trainingen zijn. Eerst een voorstel, pas na Akkoord verandert er iets.',
        trigger: 'direction_changed',
        settings: { weekBudget, ...kracht.settings },
        ...kracht.block,
        notes: [...directionChangeLines(id, { weekBudget }).slice(1, 2), ...kracht.lines, ...(wavesHeld(settings, program) ? noGoalWavesLines() : [])],
      }),
      { eyebrow: 'Je richting', ask: 'always', alwaysAsk: true, notesTitle: 'Je week', declined: 'Je weekbudget en je planning blijven zoals ze waren.' },
    );
  }

  async function reviewChoice(card: WaveReviewCard, choice: WaveReviewChoice) {
    const { plan, patch } = waveReviewPatch(card, choice, settings);
    if (!plan || !program) {
      await updateSettings(patch);
      return;
    }
    const id = patch.direction ?? card.directionId;
    const kracht = strengthChange(id, patch.weekBudget ?? settings.weekBudget);
    await horizon.propose(
      () => planHorizonChange({
        title: choice === 'easier' ? 'Rustiger aan na je golf' : 'Nog een golf, een stap hoger',
        why: 'Volgt je keuze na je golf.',
        explanation: 'Je koos wat er na je golf komt. Eerst een voorstel, pas na Akkoord verandert er iets.',
        trigger: 'wave_review',
        settings: { ...patch, ...kracht.settings },
        ...kracht.block,
        notes: [...directionChangeLines(id, { weekBudget: patch.weekBudget }).slice(0, 2), ...kracht.lines],
      }),
      { eyebrow: 'Na je golf', ask: 'always', alwaysAsk: true, notesTitle: 'Je volgende golf', declined: 'Alles blijft zoals het was. De kaart blijft nog even staan.' },
    );
  }

  return { choose, proposeBudget, reviewChoice, note: horizon.note, clearNote: horizon.clearNote, sheet: horizon.sheet, busy: horizon.busy };
}
