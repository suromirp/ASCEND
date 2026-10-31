import type { ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { DirectionId } from '../../data/directions';
import { parseDirection, parseDirectionStart } from '../../engine/direction';
import type { AppSettings } from '../../storage/database';
import { directionChangeLines, directionChangeTitle } from '../../engine/directionChange';
import { beginnerStartLine, isBeginnerStart } from '../../engine/beginnerStart';
import { resolveWaveSettings } from '../../engine/waves';
import { mondayOfWeek, todayISO } from '../../utils/dates';
import { useHorizonChange } from '../useHorizonChange';

const KEEP = 'Prima, alles blijft zoals het was.';

// Een richting kiezen zonder doel (docs/visie/Zonder doel.md, 2.3 en 3.5): met een plan altijd een
// voorstel met Akkoord, dat de hele planningsronde laat zien. Akkoord bewaart de richting, de maandag
// waarop hij begint en de planning samen; ongedaan maken zet alle drie terug. Zonder plan (een lege
// installatie) is er niets te plannen en wordt alleen de keuze bewaard.
export function useDirectionChange(): {
  choose: (id: DirectionId) => Promise<void>;
  // Een ander weekbudget terwijl je plan een richting volgt: ook een voorstel.
  proposeBudget: (weekBudget: AppSettings['weekBudget']) => Promise<void>;
  note: string | null;
  clearNote: () => void;
  sheet: ReactNode;
  busy: boolean;
} {
  const { settings, updateSettings, planHorizonChange, program, sessionLogs } = useAppData();
  const horizon = useHorizonChange();

  async function choose(id: DirectionId) {
    // Dezelfde richting nog eens houdt zijn golf; een andere begint deze week.
    const start = (settings.direction === id && parseDirectionStart(settings.directionStart)) || mondayOfWeek(todayISO());
    const patch = { direction: id, directionStart: start };
    if (!program) {
      await updateSettings(patch);
      return;
    }
    await horizon.propose(
      () => planHorizonChange({
        title: directionChangeTitle(id),
        why: 'Volgt je richting.',
        explanation: 'Je richting bepaalt hoe ASCEND je weken plant als je geen doel hebt. Je ziet eerst wat er verandert; pas na jouw Akkoord gebeurt er iets. Wat je al deed en wat je zelf vastzette blijft staan.',
        trigger: 'direction_changed',
        settings: patch,
        notes: [
          ...directionChangeLines(id, settings),
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
    await horizon.propose(
      () => planHorizonChange({
        title: 'Je weekbudget',
        why: 'Volgt je weekbudget.',
        explanation: 'Je plan volgt je richting, dus je weekbudget bepaalt hoe lang je trainingen zijn. Je ziet eerst wat er verandert; pas na jouw Akkoord gebeurt er iets.',
        trigger: 'direction_changed',
        settings: { weekBudget },
        notes: directionChangeLines(id, { weekBudget }).slice(1, 2),
      }),
      { eyebrow: 'Je richting', ask: 'always', alwaysAsk: true, notesTitle: 'Je week', declined: 'Je weekbudget en je planning blijven zoals ze waren.' },
    );
  }

  return { choose, proposeBudget, note: horizon.note, clearNote: horizon.clearNote, sheet: horizon.sheet, busy: horizon.busy };
}
