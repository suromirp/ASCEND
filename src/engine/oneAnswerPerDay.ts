// ASCEND: één antwoord per dag (I-157, I-155, docs/visie/Plek belangrijk advies.md hoofdstuk 4,
// docs/beslissingen/2026-11-26-belangrijk-advies-als-blad.md).
//
// Twee adviezen die dezelfde dag of dezelfde geplande training willen veranderen, sluiten elkaar uit; naast elkaar lezen
// ze verwarrend ("heel verwarrend als gebruiker"). Daarom blijft er per botsing één staan: eerst de volgorde van
// FIRST_SHEET_RULES, dan de hoogste prioriteit, dan het id. Het andere krijgt `blockedBy` en hangt aan het advies dat
// blijft (`waiting`); het staat nergens als kaart, en onder het ene advies staat de regel WAITING_LINE. Na Akkoord of
// Liever niet rekent de planner opnieuw: het andere komt terug of is vervallen.
//
// Een tweede stap na computeAdvice, op de samengestelde lijst van state/adviceAndWeek.ts (ook de planner, de golven en de
// ladder). Wat al botsingen oplost binnen computeAdvice (usedIds, holdCatchUp voor de terugkeer, oneVoicePerLog) blijft
// staan; dit is het vangnet erna. Niets wordt opgeslagen.
//
// Pure: no React, no IndexedDB.

import { withWaiting, type Advice } from './adviceShared';
import { firstSheetRank } from './adviceFirst';

export const WAITING_LINE = 'Een ander advies voor dezelfde dag wacht tot dit is beantwoord.';

// Wat een advies raakt: elke geplande training (`s:`) en elke dag (`d:`) uit zijn voorstel en opties, plus de trainingen
// van een rustiger instap (de eerste dag en de gemiste training op de rustdag) en wat hij voor het inhalen vasthoudt.
// De hele week van een instap telt niet: korter maken en verplaatsen sluiten elkaar niet uit.
export function touchedKeys(a: Advice): Set<string> {
  const keys = new Set<string>();
  const session = (id: string | undefined) => id && keys.add(`s:${id}`);
  const day = (date: string | undefined) => date && keys.add(`d:${date}`);
  for (const p of [a.proposal, ...(a.options ?? []).map((o) => o.proposal)]) {
    for (const c of p?.changes ?? []) {
      session(c.plannedSessionId);
      session(c.pairedWithSessionId);
      day(c.fromDate);
      day(c.toDate);
      day(c.newSessionDraft?.scheduledDate);
    }
  }
  if (a.reentryFirstDay) {
    session(a.reentryFirstDay.restId);
    session(a.reentryFirstDay.trainingId);
    day(a.reentryFirstDay.date);
    day(a.reentryFirstDay.trainingDate);
  }
  if (a.reentryCatchUp) {
    session(a.reentryCatchUp.sessionId);
    day(a.reentryCatchUp.toDate);
  }
  for (const id of a.heldCatchUpIds ?? []) session(id);
  return keys;
}

// Negatief: a gaat voor b.
export function answerOrder(a: Advice, b: Advice): number {
  return firstSheetRank(a.ruleId) - firstSheetRank(b.ruleId) || b.priority - a.priority || a.id.localeCompare(b.id);
}

export function oneAnswerPerDay(advice: readonly Advice[]): Advice[] {
  const keysOf = new Map(advice.map((a) => [a, touchedKeys(a)]));
  const kept: Advice[] = [];
  const blocked = new Map<Advice, Advice>();
  for (const a of [...advice].sort(answerOrder)) {
    const mine = keysOf.get(a)!;
    const winner = mine.size === 0 ? undefined : kept.find((k) => [...keysOf.get(k)!].some((key) => mine.has(key)));
    if (winner) blocked.set(a, winner);
    else kept.push(a);
  }
  if (blocked.size === 0) return [...advice];
  return advice.filter((a) => !blocked.has(a)).map((a) => {
    const waiting = [...blocked].filter(([, w]) => w === a).map(([b]) => ({ ...b, blockedBy: a.id }));
    return waiting.length > 0 ? { ...a, waiting: [...(a.waiting ?? []), ...waiting] } : a;
  });
}

// De geplande trainingen die een advies op Vandaag al raakt, ook wat erop wacht. Voor het voorstel na een zware sport
// (engine/sportRestOffer.ts#todaySportRest, `taken`): dat staat niet in de samengestelde lijst en wacht dan (I-155).
export function adviceTouchedSessions(advice: readonly Advice[]): Set<string> {
  const ids = new Set<string>();
  for (const a of withWaiting(advice)) {
    for (const key of touchedKeys(a)) if (key.startsWith('s:')) ids.add(key.slice(2));
  }
  return ids;
}
