// ASCEND — wat is er van de weekprescriptie echt veranderd?
//
// De weekplanning (engine/weeklyPrescriptionEngine.ts) rekent bij elke
// opening alles opnieuw uit en geeft elke keer verse id's en tijdstempels
// terug (makeId, new Date()). Wie die uitkomst blind wegschrijft, schrijft
// bij elke opening dezelfde 39 weekvoorschriften en 9 trainingsvoorschriften
// opnieuw, toont "Weekplanning bijgewerkt" en zet een regel in het
// wijzigingslogboek, ook als er inhoudelijk niets veranderde (docs/visie/
// Techniek en kwaliteit.md, 2.3).
//
// Deze module vergelijkt de uitkomst op INHOUD met wat er al ligt en laat
// alleen over wat echt anders is. Puur, zonder opslag: de aanroeper schrijft.
//
// Wat niet meetelt als inhoud: id's, tijdstempels (createdAt, computedAt) en
// het aantal dagen tot het doel in goalSnapshot (dat tikt elke dag en is
// alleen voor de audit, de rekenlaag leest het doel zelf opnieuw).

import type { TrainingPrescription } from '../models/prescription';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession } from '../models/training';

// JSON met gesorteerde sleutels: twee objecten met dezelfde inhoud geven
// dezelfde tekst, ongeacht de volgorde waarin hun velden zijn aangemaakt of
// teruggelezen. Velden met waarde undefined verdwijnen vanzelf.
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

function weeklyPrescriptionContent(wp: WeeklyPrescription): string {
  return stableJson({
    ...wp,
    id: undefined,
    computedAt: undefined,
    lines: wp.lines.map((l) => ({ ...l, id: undefined })),
    goalSnapshot: wp.goalSnapshot.map((g) => g.goalId).sort(),
  });
}

function trainingPrescriptionContent(p: TrainingPrescription): string {
  return stableJson({ ...p, id: undefined, createdAt: undefined });
}

export interface WeeklyPrescriptionDelta {
  // De wijzigingen die overblijven: een 'replace' voor een training waarvan
  // het voorschrift inhoudelijk gelijk bleef, valt weg.
  changes: PlanChangeItem[];
  // Alleen de voorschriften die echt anders zijn dan wat er ligt.
  trainingToWrite: TrainingPrescription[];
  weeklyToWrite: WeeklyPrescription[];
}

export function diffWeeklyPrescriptionPlan(
  fresh: { prescriptions: WeeklyPrescription[]; newTrainingPrescriptions: TrainingPrescription[]; changes: PlanChangeItem[] },
  stored: { weekly: WeeklyPrescription[]; training: TrainingPrescription[] },
): WeeklyPrescriptionDelta {
  const storedWeekByStart = new Map(stored.weekly.map((w) => [w.weekStartDate, weeklyPrescriptionContent(w)]));
  const weeklyToWrite = fresh.prescriptions.filter((w) => storedWeekByStart.get(w.weekStartDate) !== weeklyPrescriptionContent(w));

  const storedTrainingBySession = new Map(stored.training.map((p) => [p.plannedSessionId, trainingPrescriptionContent(p)]));
  const unchangedTraining = new Set<string>();
  const trainingToWrite: TrainingPrescription[] = [];
  for (const p of fresh.newTrainingPrescriptions) {
    if (storedTrainingBySession.get(p.plannedSessionId) === trainingPrescriptionContent(p)) unchangedTraining.add(p.id);
    else trainingToWrite.push(p);
  }

  const changes = fresh.changes.filter((c) => !(c.newPrescriptionId && unchangedTraining.has(c.newPrescriptionId)));
  return { changes, trainingToWrite, weeklyToWrite };
}

// Alleen de wijzigingen die de planningsronde laat staan (melding van 9 november). Het voorschrift zette een
// Wandeldag in een week waarin de fase geen wandeldag wil; de ronde (storage/databaseHorizon.ts#syncProgramHorizon)
// zette hem om in Heuvelintervallen en de weekcontrole haalde hem weg omdat die er al stonden. Bij de volgende
// opening zette het voorschrift hem er weer in, en zo kwamen beide meldingen elke keer terug. De ronde wint: wat zij
// omzet, terugzet of weghaalt, houdt het voorschrift niet. Zo staat de fase-regel en de weekcontrole op één plek.
// `before`: de opgeslagen planning; `after`: de uitkomst van de ronde over de planning met deze wijzigingen erin.
// Een toevoeging blijft als de ronde een nieuwe rij met dezelfde training op dezelfde dag laat staan (elke rij telt
// één keer), een verplaatsing als de rij op de nieuwe dag met dezelfde training blijft. De rest (een nieuw
// voorschrift, een weghaling) verandert geen rij die de ronde kan omzetten en blijft zoals hij is.
export function changesTheRoundKeeps(changes: PlanChangeItem[], before: PlannedSession[], after: PlannedSession[]): PlanChangeItem[] {
  const beforeById = new Map(before.map((s) => [s.id, s]));
  const afterById = new Map(after.map((s) => [s.id, s]));
  const live = (s: PlannedSession | undefined): s is PlannedSession => !!s && s.status !== 'skipped';
  // Nieuwe rijen die de ronde liet staan, per training en dag; een toevoeging neemt er één.
  const fresh = new Map<string, number>();
  for (const s of after) {
    if (beforeById.has(s.id) || !live(s)) continue;
    const key = `${s.templateId}|${s.scheduledDate}`;
    fresh.set(key, (fresh.get(key) ?? 0) + 1);
  }
  const kept = changes.filter((c) => {
    if (c.action === 'add' && c.newSessionDraft) {
      const { templateId, scheduledDate } = c.newSessionDraft;
      // Een rij die terugkomt (een add met de id van een overgeslagen rij).
      if (c.plannedSessionId) {
        const now = afterById.get(c.plannedSessionId);
        return live(now) && now.templateId === templateId && now.scheduledDate === scheduledDate;
      }
      const key = `${templateId}|${scheduledDate}`;
      const left = fresh.get(key) ?? 0;
      if (left <= 0) return false;
      fresh.set(key, left - 1);
      return true;
    }
    if ((c.action === 'move' || c.action === 'swap') && c.plannedSessionId && c.toDate) {
      const was = beforeById.get(c.plannedSessionId);
      const now = afterById.get(c.plannedSessionId);
      return live(now) && now.scheduledDate === c.toDate && (!was || now.templateId === was.templateId);
    }
    // Een weghaling die de ronde terugdraait (een test die terugkomt) is geen weghaling: de rij staat er weer.
    if (c.action === 'remove' && c.plannedSessionId) return !live(afterById.get(c.plannedSessionId));
    return true;
  });
  // Een ruil is altijd een paar: valt de ene helft weg, dan de andere ook.
  const pairs = kept.filter((c) => c.action !== 'swap' || kept.some((o) => o.action === 'swap' && o.plannedSessionId === c.pairedWithSessionId));
  // Een weghaling hoort bij de toevoeging die haar plaats inneemt: valt die weg, dan blijft de rij staan; en andersom.
  return withoutOrphanedRemovals(withoutOrphanedAdds(pairs, changes), changes);
}

// Raakt deze wijziging een rij van de planning (en kan de ronde haar dus terugdraaien)?
const touchesRow = (c: PlanChangeItem) => c.action === 'add' || c.action === 'move' || c.action === 'swap' || c.action === 'remove';

// Natellen tot de ronde niets meer weghaalt (melding van 12 november: twaalf keer op een dag hetzelfde aangenomen
// voorstel voor een Wandeldag die er daarna niet stond). `round` rekent de planningsronde over de planning met deze
// wijzigingen erin en geeft terug wat ze laat staan. Valt er iets weg, dan telt de rest opnieuw: een training kan
// alleen blijven staan dankzij een andere die net wegviel. Alleen een uitkomst die de ronde zelf bevestigde komt
// terug; lukt dat niet binnen `checks` keer, dan blijft alleen over wat geen rij raakt (een nieuw voorschrift voor
// een training die er al staat). Eerder kwam na de derde keer een rest terug die niemand had nageteld.
export async function settleWithRound(
  changes: PlanChangeItem[],
  round: (current: PlanChangeItem[]) => Promise<PlanChangeItem[]>,
  checks: number,
): Promise<PlanChangeItem[]> {
  let current = changes;
  for (let i = 0; i < checks; i++) {
    if (!current.some(touchesRow)) return current;
    const kept = await round(current);
    if (kept.length === current.length) return current;
    current = kept;
  }
  // Niet bevestigd: er komt geen rij bij, er gaat er geen weg en er schuift er geen. Wat overblijft raakt geen rij en
  // wordt gewoon gemeld zoals altijd; er valt dus niets stil.
  return current.filter((c) => !touchesRow(c));
}

// De andere kant van hetzelfde paar: valt de weghaling weg (de rij staat er weer of blijft staan), dan valt de
// toevoeging die haar plaats zou innemen mee. Anders krijgt een week zonder vrije dag er een training bij in plaats
// van een vervanging (review van 12 november).
export function withoutOrphanedAdds(kept: PlanChangeItem[], all: PlanChangeItem[]): PlanChangeItem[] {
  const stays = new Set(kept);
  const letGo = new Set(all.filter((c) => c.action === 'remove' && c.plannedSessionId && !stays.has(c)).map((c) => c.plannedSessionId));
  if (letGo.size === 0) return kept;
  return kept.filter((c) => !(c.action === 'add' && c.replacesSessionId && letGo.has(c.replacesSessionId)));
}

// Een week zonder vrije dag: de weekindeling (engine/weekReconciliation.ts) haalt dan een training weg en zet de
// nieuwe op die dag, in die week (`replacesSessionId` op de toevoeging). De twee horen bij elkaar. Valt de
// toevoeging weg (de planningsronde laat hem niet staan, of de dag is een vakantiedag), dan valt de weghaling mee;
// anders verliest de week een training zonder vervanging (review van Melding bij elke opening, 9 november).
// `kept`: wat overblijft na een filter over `all`. Een weghaling zonder koppeling (een training die niet meer bij
// de samenstelling hoort) blijft gewoon staan, ook als er op die dag een andere toevoeging wegvalt.
export function withoutOrphanedRemovals(kept: PlanChangeItem[], all: PlanChangeItem[]): PlanChangeItem[] {
  const stays = new Set(kept);
  // Per weggevallen toevoeging: de rij die ze zou vervangen en haar dag (die ligt in de week van de toevoeging).
  const letGo = new Map<string, string>();
  for (const c of all) {
    if (c.action !== 'add' || !c.replacesSessionId || !c.newSessionDraft || stays.has(c)) continue;
    letGo.set(c.replacesSessionId, c.newSessionDraft.scheduledDate);
  }
  if (letGo.size === 0) return kept;
  return kept.filter((c) => {
    if (c.action !== 'remove' || !c.plannedSessionId) return true;
    // Dezelfde rij, op dezelfde dag.
    const day = letGo.get(c.plannedSessionId);
    return !(day && (c.fromDate ?? c.toDate) === day);
  });
}

// Geen toevoeging of verplaatsing op een dag die niet mag (de dag van het hoofddoel en later, een wedstrijddag, een
// vakantie of tocht); een weghaling die bij zo'n toevoeging hoort valt mee (`withoutOrphanedRemovals`).
export function changesOnAllowedDays(changes: PlanChangeItem[], blockedDay: (date: string) => boolean): PlanChangeItem[] {
  const allowed = changes.filter((c) => {
    const day = c.action === 'add' ? c.newSessionDraft?.scheduledDate : c.action === 'move' ? c.toDate : undefined;
    return !day || !blockedDay(day);
  });
  return withoutOrphanedRemovals(allowed, changes);
}

export const samePlannedSession = (a: PlannedSession, b: PlannedSession) => JSON.stringify(a) === JSON.stringify(b);

// De wijzigingen die als wijziging van de planning tellen (melding, vraag,
// regel in het logboek). 'keep' nooit. Bij de eerste opbouw (nog geen enkel
// voorschrift opgeslagen: een verse installatie of net een teruggezette
// back-up) telt een 'replace' of 'reduce' alleen niet als de rij van die
// training na toepassen precies gelijk is aan de opgeslagen rij: dan had het
// toestel die inhoud al. Wordt de rij anders, dan is het een gewone wijziging,
// met de vraag of melding die daarbij hoort; nooit stil.
export function realPlanChanges(
  changes: PlanChangeItem[],
  opts: { initialBuild: boolean; before: PlannedSession[]; after: PlannedSession[] },
): PlanChangeItem[] {
  const beforeById = new Map(opts.before.map((s) => [s.id, s]));
  const afterById = new Map(opts.after.map((s) => [s.id, s]));
  return changes.filter((c) => {
    if (c.action === 'keep') return false;
    if (!opts.initialBuild || (c.action !== 'replace' && c.action !== 'reduce')) return true;
    const before = c.plannedSessionId ? beforeById.get(c.plannedSessionId) : undefined;
    const after = c.plannedSessionId ? afterById.get(c.plannedSessionId) : undefined;
    return !(before && after && samePlannedSession(before, after));
  });
}
