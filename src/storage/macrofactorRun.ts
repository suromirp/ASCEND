// ASCEND: "Alles verwerken" on the card "Uit MacroFactor", as one run that
// always ends.
//
// What went wrong before: the card waited for the full app refresh (the
// planning sync in the shared queue, then everything read again) before it let
// go of "Bezig…", with no limit and nothing to show in between. Here:
// - each row is one step with a time limit; a step that does not answer stops
//   the run with an honest message, the button is free again;
// - the button shows how far it is ("3 van 10 verwerkt");
// - a row that is done is remembered (`handled`), so the card no longer shows
//   it while the app reads the new state back, and a second tap never does it
//   twice (the writes themselves read the stored log again as well);
// - the run lives here, outside the card: when the card is redrawn or the page
//   changes halfway, the run goes on and the card shows where it is;
// - the refresh after rows that were written directly (aanvullen) is started
//   once at the end and not waited for.
// A new log and a takeover go through the app as before (logSession and
// takeOverFromMacroFactor), which keep their own refresh.

import type { SessionLogDraft } from '../engine/activityImport';
import { describeEnrichment } from '../engine/macrofactorEnrich';
import { emptyCounts, runStoppedMessage, runSummary, type ReadyProposal, type RunCounts } from '../engine/macrofactorRun';
import type { SavedMoment } from '../engine/savedMoments';
import { SessionLogsRepo } from './database';
import { enrichLog, fillInLog } from './macrofactor';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import type { TakeoverRequest } from './macrofactorLead';

export interface RunDeps {
  logSession: (draft: SessionLogDraft, opts: { batch: SavedMoment[] }) => Promise<boolean>;
  takeOver: (requests: TakeoverRequest[], batch: SavedMoment[]) => Promise<number>;
  announceSaved: (batch: SavedMoment[]) => void;
  refresh: () => Promise<void>;
  // "MacroFactor is leidend voor kracht", for the words of the outcome.
  leads: boolean;
  // Rows the user ticked off and left.
  left: number;
  // A step that takes longer than this stops the run.
  stepTimeoutMs?: number;
  // After this long without progress, the card says it takes longer than normal.
  slowAfterMs?: number;
}

export interface RunState {
  status: 'idle' | 'running' | 'done' | 'stopped';
  done: number;
  total: number;
  // Longer than normal without progress.
  slow: boolean;
  // The outcome, or why it stopped.
  message?: string;
  // externalIds of the rows that are done (saved, or found done already).
  handled: string[];
}

const IDLE: RunState = { status: 'idle', done: 0, total: 0, slow: false, handled: [] };
let state: RunState = IDLE;
const listeners = new Set<() => void>();

function set(next: Partial<RunState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function getRunState(): RunState {
  return state;
}

export function subscribeRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The card is gone and the run is over: the outcome need not be shown again.
// What was handled stays known, so a stale row never comes back.
export function clearRunMessage(): void {
  if (state.status === 'running' || state.status === 'idle') return;
  set({ status: 'idle', message: undefined, done: 0, total: 0, slow: false });
}

// For tests.
export function resetRunForTests(): void {
  state = IDLE;
  lingering = null;
  listeners.forEach((l) => l());
}

// A step that went over its time keeps running; until it has finished no new
// run starts, so a new log is never saved twice.
let lingering: Promise<unknown> | null = null;

type Step = { ids: string[]; run: () => Promise<Partial<RunCounts> & { ok: number; direct?: boolean }> };

let current: Promise<RunState> | null = null;

// Runs the chosen rows, oldest first, takeovers in one go where they follow
// each other (one refresh for those). Only one run at a time: a second call
// while one runs gets the same run back.
export function runMacroFactor(rows: ReadyProposal[], deps: RunDeps): Promise<RunState> {
  if (current) return current;
  if (lingering) {
    set({ status: 'stopped', message: 'De vorige stap is nog bezig met opslaan. Probeer het over een minuut nog eens.' });
    return Promise.resolve(state);
  }
  const todo = rows.filter((p) => !state.handled.includes(p.workout.externalId));
  current = execute(todo, deps).finally(() => {
    current = null;
  });
  return current;
}

async function execute(rows: ReadyProposal[], deps: RunDeps): Promise<RunState> {
  const stepTimeoutMs = deps.stepTimeoutMs ?? 45_000;
  const slowAfterMs = deps.slowAfterMs ?? 8_000;
  const counts = emptyCounts(deps.left);
  const batch: SavedMoment[] = [];
  const total = rows.length;
  let done = 0;
  let wroteDirectly = false;
  set({ status: 'running', done: 0, total, slow: false, message: undefined });

  // The steps: consecutive takeovers together, everything else one by one.
  const steps: Step[] = [];
  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    if (p.kind === 'takeover') {
      const group: Extract<ReadyProposal, { kind: 'takeover' }>[] = [p];
      while (i + 1 < rows.length && rows[i + 1].kind === 'takeover') group.push(rows[++i] as Extract<ReadyProposal, { kind: 'takeover' }>);
      steps.push({
        ids: group.map((g) => g.workout.externalId),
        run: async () => {
          const n = await deps.takeOver(group.map((g) => ({ logId: g.log.id, workout: g.workout, templateId: g.template.id })), batch);
          // Only a group that fully went through leaves the card; a failed row
          // stays, so it can be tried again.
          return { changed: n, failed: group.length - n, ok: n === group.length ? group.length : 0 };
        },
      });
    } else if (p.kind === 'new') {
      steps.push({
        ids: [p.workout.externalId],
        run: async () => {
          // Saved by an earlier tap that took too long: done, not twice.
          if ((await SessionLogsRepo.getAll()).some((l) => l.externalId === p.workout.externalId)) return { already: 1, ok: 1 };
          return (await deps.logSession(p.draft, { batch })) ? { created: 1, ok: 1 } : { failed: 1, ok: 0 };
        },
      });
    } else if (p.kind === 'enrich') {
      steps.push({
        ids: [p.workout.externalId],
        run: async () => {
          const what = describeEnrichment(p.log, p.strengthData);
          const outcome = await enrichLog(p.log.id, p.workout);
          if (outcome === 'added') return { enriched: 1, enrichedWhat: [what], ok: 1, direct: true };
          return outcome === 'already' ? { already: 1, ok: 1 } : { failed: 1, ok: 0 };
        },
      });
    } else {
      steps.push({
        ids: [p.workout.externalId],
        run: async () => {
          if (await fillInLog(p.log.id, p.workout, p.template)) return { changed: 1, ok: 1, direct: true };
          // Nothing left to fill: done already, unless the log is gone.
          return (await SessionLogsRepo.getAll()).some((l) => l.id === p.log.id) ? { already: 1, ok: 1 } : { failed: 1, ok: 0 };
        },
      });
    }
  }

  let stopped: 'timeout' | 'error' | undefined;
  for (const step of steps) {
    const slowTimer = setTimeout(() => set({ slow: true }), slowAfterMs);
    try {
      const running = step.run();
      let r: Awaited<typeof running>;
      try {
        r = await withTimeout(running, stepTimeoutMs);
      } catch (err) {
        if (err instanceof TimeoutError) {
          const mark: Promise<unknown> = running.catch(() => undefined).finally(() => {
            if (lingering === mark) lingering = null;
          });
          lingering = mark;
        }
        throw err;
      }
      counts.created += r.created ?? 0;
      counts.changed += r.changed ?? 0;
      counts.enriched += r.enriched ?? 0;
      counts.enrichedWhat.push(...(r.enrichedWhat ?? []));
      counts.already += r.already ?? 0;
      counts.failed += r.failed ?? 0;
      if (r.direct) wroteDirectly = true;
      done += step.ids.length;
      set({ done, slow: false, handled: r.ok > 0 ? [...state.handled, ...step.ids] : state.handled });
    } catch (err) {
      stopped = err instanceof TimeoutError ? 'timeout' : 'error';
      if (!(err instanceof TimeoutError)) console.error('MacroFactor verwerken', err);
      break;
    } finally {
      clearTimeout(slowTimer);
    }
  }

  // The moments of new logs, once; and the app reads the aanvullingen back in
  // the background. The card does not wait for that.
  try {
    deps.announceSaved(batch);
  } catch (err) {
    console.error('MacroFactor verwerken: moment', err);
  }
  if (wroteDirectly) void deps.refresh().catch((err) => console.error('MacroFactor verwerken: verversen', err));

  if (stopped) set({ status: 'stopped', slow: false, message: runStoppedMessage(done, total, stopped) });
  else set({ status: 'done', slow: false, message: runSummary(counts, deps.leads) });
  return state;
}
