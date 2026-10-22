// ASCEND: the words and the bookkeeping of "Alles verwerken" on the card
// "Uit MacroFactor" (components/MacroFactorCard.tsx). Pure.
//
// The run itself lives in storage/macrofactorRun.ts. What is here: which rows
// the card still shows while the run (and the refresh after it) is going on,
// the line on the button while it works, and the outcome in plain Dutch.

import type { MacroFactorProposal } from './macrofactorLink';

export type ReadyProposal = Exclude<MacroFactorProposal, { kind: 'unmapped' }>;

export const isReady = (p: MacroFactorProposal): p is ReadyProposal => p.kind !== 'unmapped';

// The rows still to do: a row this run has already handled stays away, also
// while the app is still reading the new state back, so it can never be
// offered (and done) a second time.
export function openProposals(ready: ReadyProposal[], handled: readonly string[]): ReadyProposal[] {
  if (handled.length === 0) return ready;
  const done = new Set(handled);
  return ready.filter((p) => !done.has(p.workout.externalId));
}

export interface RunCounts {
  // New logs saved.
  created: number;
  // Logs that took over the numbers of MacroFactor, or were filled in.
  changed: number;
  // Logs that got the reps in reserve, the warm-up sets or the help added.
  enriched: number;
  // What was added to those, one line per kind ("de opwarmsets").
  enrichedWhat: string[];
  // Rows that turned out to be done already (by an earlier tap, or elsewhere).
  already: number;
  failed: number;
  // Rows the user ticked off and left.
  left: number;
}

export const emptyCounts = (left = 0): RunCounts => ({ created: 0, changed: 0, enriched: 0, enrichedWhat: [], already: 0, failed: 0, left });

// "3 van 10 verwerkt": on the button while the run works.
export function runProgressLabel(done: number, total: number): string {
  return `${done} van ${total} verwerkt`;
}

function enrichedPhrase(what: string[]): string {
  const unique = [...new Set(what)];
  return unique.length === 1 ? unique[0] : 'de herhalingen in reserve en de opwarmsets';
}

// "Verwerkt: 8 nieuw opgeslagen en 2 aangevuld met de opwarmsets. 1 lukte niet."
export function runSummary(counts: RunCounts, leads: boolean): string {
  const parts: string[] = [];
  if (counts.created > 0) parts.push(`${counts.created} nieuw opgeslagen`);
  if (counts.changed > 0) parts.push(`${counts.changed} ${leads ? 'bijgewerkt met MacroFactor' : 'aangevuld'}`);
  if (counts.enriched > 0) parts.push(`${counts.enriched} aangevuld met ${enrichedPhrase(counts.enrichedWhat)}`);
  let text = parts.length > 0 ? `Verwerkt: ${parts.join(' en ')}.` : counts.already > 0 ? 'Alles was al verwerkt.' : 'Er is niets verwerkt.';
  if (counts.already > 0 && parts.length > 0) text += ` ${counts.already} ${counts.already === 1 ? 'was' : 'waren'} al verwerkt.`;
  if (counts.failed > 0) text += ` ${counts.failed} lukte niet.`;
  if (counts.left > 0) text += ` ${counts.left} liet je liggen.`;
  return text;
}

// The run stopped before the end: honest about what happened and what to do.
export function runStoppedMessage(done: number, total: number, reason: 'timeout' | 'error'): string {
  const cause = reason === 'timeout' ? 'het opslaan gaf te lang geen antwoord' : 'het opslaan lukte niet';
  const kept = done > 0 ? ` Wat al verwerkt is (${done} van ${total}), blijft bewaard.` : ' Er is niets veranderd.';
  return `Gestopt: ${cause}.${kept} Tik nog een keer op de knop; wat al klaar is, wordt niet nog eens gedaan. Lukt het weer niet, sluit ASCEND dan helemaal af en open het opnieuw.`;
}

// Shown under the button when a step takes longer than normal.
export const RUN_SLOW_NOTE = 'Dit duurt langer dan normaal. ASCEND werkt nog; je kunt het scherm gewoon laten staan.';
