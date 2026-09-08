// ASCEND — Groep C: plaatsingskwaliteit (candidate scoring i.p.v. first-fit).
// Plan: "Groep C: plaatsingskwaliteit" — Fase 5-9.
//
// Generaliseert het bestaande cross-day 48u-beenregel-precedent
// (engine/scheduler.ts#requiredSpacingDays) naar alle belastingsassen
// tegelijk, en vervangt first-fit (`array.find()`) plaatsing door een
// kleine, begrensde beam search over COMPLETE weekkandidaten.
//
// Ontwerpprincipe: beschikbaarheid (dayHasRoomFor / expliciete
// gebruikersgrenzen) blijft een harde poort, elders bepaald
// (engine/scheduler.ts). Trainingsbelasting (alle assen, inclusief
// beenbelasting) is een zachte factor die dit bestand berekent en
// vergelijkt — nooit vermengd met de harde beschikbaarheidscheck zelf.
// Vrije capaciteit (resterende minuten) zit nooit in de belasting-score,
// alleen als allerlaatste deterministische tie-break in de caller.

import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { PlanChangeAlternative, PlanChangeItem } from '../models/planChange';
import { resolveEffectiveStressProfile } from './stressProfile';

export type LoadOverlapAxis = 'lowerBodyLoad' | 'cardioLoad' | 'upperBodyLoad' | 'eccentricLoad' | 'impact';

export interface LoadOverlapFinding {
  axis: LoadOverlapAxis;
  sessionAId: string;
  sessionBId: string;
  daysApart: number;
  penalty: number;
  // Nooit verwijderd door een override/hint — alleen op true gezet, met
  // penalty: 0. De bevinding zelf blijft bestaan voor audit/uitleg/een
  // eventuele derde sessie die dezelfde belasting evalueert.
  suppressedForPlacement?: boolean;
}

// ASCEND_HEURISTIC(LOAD-AXIS-CONFIG): per-as configureerbaar, GEEN gedeelde
// universele curve. Elke as heeft zijn eigen basisgewicht en eigen
// dag-afstand-vervalfunctie. De startwaarden hieronder zijn bewust
// simpel/vergelijkbaar tussen assen — geen fysiologische claim, puur een
// startpunt dat later per as kan worden bijgesteld zonder de rest van dit
// bestand te raken.
export interface LoadAxisConfig {
  baseWeight: number;
  // dagafstand -> penalty-multiplier; index 0 = zelfde dag. Categorisch,
  // geen verzonnen precisie. Vanaf temporalDecay.length dagen apart telt
  // de as niet meer mee IN DIT MODEL — een discrete vereenvoudiging van een
  // in werkelijkheid continue hersteldecay, niet als fysiologische
  // waarheid lezen.
  temporalDecay: number[];
}

export const LOAD_AXIS_CONFIG: Record<LoadOverlapAxis, LoadAxisConfig> = {
  lowerBodyLoad: { baseWeight: 1, temporalDecay: [1, 0.5, 0.2] },
  upperBodyLoad: { baseWeight: 1, temporalDecay: [1, 0.5, 0.2] },
  cardioLoad: { baseWeight: 1, temporalDecay: [1, 0.5, 0.2] },
  eccentricLoad: { baseWeight: 1, temporalDecay: [1, 0.5, 0.2] },
  impact: { baseWeight: 1, temporalDecay: [1, 0.5, 0.2] },
};

const LOAD_OVERLAP_AXES: LoadOverlapAxis[] = ['lowerBodyLoad', 'cardioLoad', 'upperBodyLoad', 'eccentricLoad', 'impact'];

export interface PlanningTimePairingHint {
  sessionAId: string;
  sessionBId: string;
  dateA: string;
  dateB: string;
  // Verplicht, geen optioneel veld: een ontbrekend `axis` mag NOOIT
  // impliciet "onderdruk alles" betekenen — dat is te makkelijk per
  // ongeluk te misbruiken. 'ALL' moet expliciet aangevraagd worden.
  axis: LoadOverlapAxis | 'ALL';
  reason: string;
  requestedBy: string;
}

interface WeekSession {
  id: string;
  templateId: string;
  date: string;
}

function daysBetweenDates(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
}

// Zelfde precisie-eis als engine/scheduler.ts#isIntentionalBackToBack: een
// pairingOverride('prefer') geldt van beide kanten, en onderdrukt hier ALLE
// assen tussen dit ene paar (net als de bestaande 48u-regel dat vandaag al
// doet) — een lokale kopie i.p.v. een import om een scheduler.ts <->
// candidatePlacement.ts cirkelvormige afhankelijkheid te vermijden
// (scheduler.ts roept straks searchWeeklyPlacement hieruit aan).
function hasPreferOverride(templateA: SessionTemplate, templateB: SessionTemplate): boolean {
  return (
    !!templateA.pairingOverride?.some((o) => o.withTemplateId === templateB.id && o.verdict === 'prefer') ||
    !!templateB.pairingOverride?.some((o) => o.withTemplateId === templateA.id && o.verdict === 'prefer')
  );
}

function matchingHintAxes(
  sessionA: WeekSession,
  sessionB: WeekSession,
  pairingHints: PlanningTimePairingHint[],
): Set<LoadOverlapAxis | 'ALL'> {
  const matches = new Set<LoadOverlapAxis | 'ALL'>();
  for (const hint of pairingHints) {
    const forward = hint.sessionAId === sessionA.id && hint.sessionBId === sessionB.id && hint.dateA === sessionA.date && hint.dateB === sessionB.date;
    const backward = hint.sessionAId === sessionB.id && hint.sessionBId === sessionA.id && hint.dateA === sessionB.date && hint.dateB === sessionA.date;
    if (forward || backward) matches.add(hint.axis);
  }
  return matches;
}

// Paarsgewijze belastingsbevindingen tussen precies twee sessies — de
// primitief die zowel findLoadOverlaps (Fase 5, één kandidaat tegen
// context) als evaluateWeekCandidate (Fase 7, hele week) op teruggrijpen,
// zodat de as-logica exact één keer gedefinieerd staat.
function computePairFindings(
  sessionA: WeekSession,
  sessionB: WeekSession,
  templateById: Map<string, SessionTemplate>,
  pairingHints: PlanningTimePairingHint[],
): LoadOverlapFinding[] {
  if (sessionA.id === sessionB.id) return [];
  const templateA = templateById.get(sessionA.templateId);
  const templateB = templateById.get(sessionB.templateId);
  if (!templateA || !templateB) return [];

  const daysApart = daysBetweenDates(sessionA.date, sessionB.date);
  const suppressAllAxes = hasPreferOverride(templateA, templateB);
  const hintAxes = matchingHintAxes(sessionA, sessionB, pairingHints);
  const suppressAllViaHint = hintAxes.has('ALL');

  // Altijd via resolveEffectiveStressProfile (de enige toegestane resolver,
  // CLAUDE.md) — nooit baseStressProfile rechtstreeks lezen. Dat geeft ook
  // templates zonder eigen baseStressProfile de legacyIsLegHeavyToStressProfile-
  // fallback voor lowerBodyLoad/impact/eccentricLoad; upperBodyLoad/cardioLoad
  // blijven daarbij gewoon afwezig wanneer niet ingevuld (geen verzonnen 'none').
  const profileA = resolveEffectiveStressProfile(templateA);
  const profileB = resolveEffectiveStressProfile(templateB);

  const findings: LoadOverlapFinding[] = [];
  for (const axis of LOAD_OVERLAP_AXES) {
    const config = LOAD_AXIS_CONFIG[axis];
    if (daysApart >= config.temporalDecay.length) continue; // buiten het rollende venster voor deze as — telt niet mee

    const levelA = profileA[axis];
    const levelB = profileB[axis];
    if (levelA !== 'heavy' || levelB !== 'heavy') continue;

    const penalty = config.baseWeight * config.temporalDecay[daysApart];
    const suppressed = suppressAllAxes || suppressAllViaHint || hintAxes.has(axis);
    findings.push({
      axis,
      sessionAId: sessionA.id,
      sessionBId: sessionB.id,
      daysApart,
      penalty: suppressed ? 0 : penalty,
      suppressedForPlacement: suppressed || undefined,
    });
  }
  return findings;
}

// Fase 5 — één kandidaat (nog niet per se gepland) tegen zijn nabijheids-
// context. `nearbySessions` MOET al door de caller over kalenderweekgrenzen
// heen gefilterd zijn (de bestaande weekgrens-bug die deze pas meefixt) —
// dit bestand kent zelf geen kalenderweekbegrip.
export function findLoadOverlaps(
  candidateDate: string,
  candidateTemplate: SessionTemplate,
  candidateSessionId: string,
  nearbySessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  _recentLogs: SessionLog[],
  pairingHints: PlanningTimePairingHint[] = [],
): LoadOverlapFinding[] {
  const candidate: WeekSession = { id: candidateSessionId, templateId: candidateTemplate.id, date: candidateDate };
  const others: WeekSession[] = nearbySessions
    .filter((s) => s.status !== 'skipped' && s.id !== candidateSessionId)
    .map((s) => ({ id: s.id, templateId: s.templateId, date: s.scheduledDate }));

  const localTemplateById = new Map(templateById);
  if (!localTemplateById.has(candidateTemplate.id)) localTemplateById.set(candidateTemplate.id, candidateTemplate);

  const findings: LoadOverlapFinding[] = [];
  for (const other of others) {
    findings.push(...computePairFindings(candidate, other, localTemplateById, pairingHints));
  }
  return findings;
}

// Fase 6 — score-primitief voor één kandidaatdatum. Bewust een primitief:
// GEEN Goal Focus, GEEN capaciteit — het beslispunt zit in Fase 7's
// zoekstrategie. `daySessions` wordt meegenomen in de nearby-set (daysApart
// 0 valt binnen elk as se venster), zodat same-day stacking automatisch
// meetelt zonder een tweede, aparte as-check.
export interface CandidateDateScore {
  date: string;
  cost: number; // 0 = ideaal, hoger = slechter
  loadFindings: LoadOverlapFinding[];
}

export function scoreCandidateDate(
  date: string,
  candidateTemplate: SessionTemplate,
  candidateSessionId: string,
  nearbySessions: PlannedSession[],
  daySessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  recentLogs: SessionLog[],
  pairingHints: PlanningTimePairingHint[] = [],
): CandidateDateScore {
  const byId = new Map<string, PlannedSession>();
  for (const s of [...nearbySessions, ...daySessions]) byId.set(s.id, s);
  const loadFindings = findLoadOverlaps(date, candidateTemplate, candidateSessionId, [...byId.values()], templateById, recentLogs, pairingHints);
  const cost = loadFindings.reduce((sum, f) => sum + f.penalty, 0);
  return { date, cost, loadFindings };
}

// ============================================================
// Fase 7 — begrensde weekkandidaat-zoekstrategie
// ============================================================

export interface PlacementRequest {
  template: SessionTemplate;
  source: 'strength-missing' | 'cascade';
  // Aanwezig wanneer dit een REEDS BESTAANDE sessie is die verplaatst
  // wordt (bv. proposeMove's cascade-sessie) — de caller moet deze sessie
  // uit fixedExistingSessions/nearby-context filteren vóórdat er iets
  // wordt geëvalueerd (correctheidseis: nooit tegelijk oud én nieuw).
  sessionId?: string;
}

export interface WeekPlacementCandidate {
  placements: { sessionOrDraft: string; date: string }[];
  totalCost: number; // 0 = ideaal, hoger = slechter — laagste totalCost wint
  worstFinding: LoadOverlapFinding | null;
}

// Vier onderscheiden uitkomsten. "clean"/"compromised" zijn allebei een
// VOLLEDIGE plaatsing van alle sessies in toPlace. "unplaceable" betekent
// dat is VASTGESTELD (niet gegokt) dat geen enkele volledige plaatsing
// bestaat binnen de harde grenzen — confirmedBy noemt hoe dat vastgesteld
// is. "search-limited" betekent: de (verbrede) zoektocht vond zelf geen
// volledige plaatsing, maar hasFeasibleHardPlacement bevestigt dat er wél
// een hard-geldige plaatsing bestaat — de optimizer heeft hem niet
// gevonden. Nooit search-limited als unplaceable presenteren.
export type WeeklyPlacementResult =
  | { status: 'clean'; bestFound: WeekPlacementCandidate; alternatives: WeekPlacementCandidate[]; searchWasTruncated: boolean }
  | { status: 'compromised'; bestFound: WeekPlacementCandidate; alternatives: WeekPlacementCandidate[]; compromisedReason: string; searchWasTruncated: boolean }
  | { status: 'unplaceable'; reason: string; confirmedBy: 'exhaustive-search' | 'feasibility-check'; partialCandidates?: WeekPlacementCandidate[] }
  | { status: 'search-limited'; reason: string; partialCandidates?: WeekPlacementCandidate[] };

// ASCEND_HEURISTIC(PLACEMENT-QUALITY-THRESHOLDS): drempels die "goed
// genoeg"/"ernstig"/"gecompromitteerd" definiëren. Geen bewezen optima —
// startpunten die later per as/gebruik bijgesteld mogen worden.
const GOOD_ENOUGH_DATE_COST_THRESHOLD = 0.3;
const SEVERE_FINDING_THRESHOLD = 1.5;
const COMPROMISED_WEEK_THRESHOLD = 2.5;

// Geëxporteerd zodat een caller (bv. strengthScheduling.ts) vooraf een
// key -> SessionTemplate map kan opbouwen voor zijn eigen
// hardValidDatesProvider — nodig om tentativePlacements (die alleen keys +
// datums bevatten) terug te vertalen naar sjablonen voor de eigen
// dayHasRoomFor-berekening.
export function keyForPlacementRequest(request: PlacementRequest, index: number): string {
  return request.sessionId ?? `draft:${index}:${request.template.id}`;
}
function sessionOrDraftKey(request: PlacementRequest, index: number): string {
  return keyForPlacementRequest(request, index);
}

// Paarsgewijze Goal Focus-weging: pairPriorityWeight = max(gewicht A,
// gewicht B); weightedPairCost = penalty * pairPriorityWeight. Telt een
// bevinding tussen twee sessies precies één keer, nooit dubbel vanuit
// beide kanten, en maakt een hoog-Goal-Focus-sessie nooit "goedkoop" om te
// compromitteren omdat de andere sessie in het paar laag scoort.
function weightForSession(sessionId: string, weightById: Map<string, number>): number {
  return weightById.get(sessionId) ?? 1;
}

// Order-onafhankelijke, pure evaluatie van een COMPLETE (of gedeeltelijke)
// week: fixedExistingSessions + alle huidige placements. Nooit incrementeel
// bijgehouden tijdens het zoeken — altijd opnieuw berekend vanaf de
// volledige toewijzing, met canonieke, ongeordende dedup per as+paar zodat
// hetzelfde conflict nooit twee keer meetelt. Invariant: zelfde
// resulterende schema => zelfde totalCost, ongeacht invoegvolgorde.
export function evaluateWeekCandidate(
  evaluatedSessions: WeekSession[],
  templateById: Map<string, SessionTemplate>,
  // Nog niet gebruikt binnen deze pure functie zelf — behouden in de
  // signature omdat een latere, RPE/spike-bewuste decay (net als
  // scheduler.ts#requiredSpacingDays) hier ooit doorheen moet kunnen zonder
  // elke aanroeper opnieuw aan te passen.
  _recentLogs: SessionLog[],
  sessionPriorityWeightById: Map<string, number>,
  pairingHints: PlanningTimePairingHint[] = [],
): { totalCost: number; findings: LoadOverlapFinding[] } {
  const seen = new Map<string, LoadOverlapFinding>();
  for (let i = 0; i < evaluatedSessions.length; i++) {
    for (let j = i + 1; j < evaluatedSessions.length; j++) {
      const findings = computePairFindings(evaluatedSessions[i], evaluatedSessions[j], templateById, pairingHints);
      for (const finding of findings) {
        const [idA, idB] = [finding.sessionAId, finding.sessionBId].sort();
        const key = `${idA}|${idB}|${finding.axis}`;
        // Canonieke sleutel dedupliceert per as+paar — data hoort er
        // bewust niet in: eenzelfde paar krijgt op deze manier hooguit één
        // bevinding per as binnen één weekevaluatie, wat consistent is met
        // "elke sessionId komt maximaal één keer voor" (geen dubbele
        // datum-context per paar binnen dezelfde geëvalueerde week).
        if (!seen.has(key)) seen.set(key, finding);
      }
    }
  }

  let totalCost = 0;
  const findings = [...seen.values()];
  for (const finding of findings) {
    const weight = Math.max(weightForSession(finding.sessionAId, sessionPriorityWeightById), weightForSession(finding.sessionBId, sessionPriorityWeightById));
    totalCost += finding.penalty * weight;
  }
  return { totalCost, findings };
}

// ASCEND_HEURISTIC: geen — dit is een zuivere harde-grenzen-check, geen
// scoring. Kleine backtracking-pas die uitsluitend beantwoordt: "bestaat
// er een volledige toewijzing die aan alle harde grenzen voldoet?" Nooit
// gebruikt om te kiezen WELKE toewijzing wint — alleen om een
// 'unplaceable'-claim te bevestigen of te weerleggen. `hardValidDatesProvider`
// sluit over fixedExistingSessions/beschikbaarheidsregels van de caller
// (scheduler.ts/strengthScheduling.ts) en krijgt de tentatieve toewijzingen
// tot dusver mee, zodat harde beschikbaarheid ook hier per partial-poging
// correct wordt gecontroleerd (nooit alleen tegen de kale kalender).
export function hasFeasibleHardPlacement(
  toPlace: PlacementRequest[],
  hardValidDatesProvider: (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => string[],
): boolean {
  function backtrack(index: number, tentative: { sessionOrDraft: string; date: string }[]): boolean {
    if (index >= toPlace.length) return true;
    const key = sessionOrDraftKey(toPlace[index], index);
    const dates = hardValidDatesProvider(toPlace[index].template, tentative);
    for (const date of dates) {
      if (backtrack(index + 1, [...tentative, { sessionOrDraft: key, date }])) return true;
    }
    return false;
  }
  return backtrack(0, []);
}

interface PartialCandidate {
  placements: { sessionOrDraft: string; date: string }[];
  placedIndices: Set<number>;
}

function partialToEvaluatedSessions(
  fixedExistingSessions: PlannedSession[],
  toPlace: PlacementRequest[],
  partial: PartialCandidate,
): WeekSession[] {
  const fixed: WeekSession[] = fixedExistingSessions.map((s) => ({ id: s.id, templateId: s.templateId, date: s.scheduledDate }));
  const placed: WeekSession[] = partial.placements.map((p, i) => {
    const request = toPlace[[...partial.placedIndices][i]];
    return { id: p.sessionOrDraft, templateId: request.template.id, date: p.date };
  });
  return [...fixed, ...placed];
}

function pickMostConstrained(
  remainingIndices: number[],
  toPlace: PlacementRequest[],
  partial: PartialCandidate,
  fixedExistingSessions: PlannedSession[],
  hardValidDatesProvider: (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => string[],
  templateById: Map<string, SessionTemplate>,
  _recentLogs: SessionLog[],
  pairingHints: PlanningTimePairingHint[],
): number {
  const evaluatedSoFar = partialToEvaluatedSessions(fixedExistingSessions, toPlace, partial);

  let best = remainingIndices[0];
  let bestGoodCount = Infinity;
  let bestRegret = -Infinity;

  for (const idx of remainingIndices) {
    const request = toPlace[idx];
    const dates = hardValidDatesProvider(request.template, partial.placements);
    const costs = dates
      .map((date) => {
        const key = sessionOrDraftKey(request, idx);
        const virtual: WeekSession = { id: key, templateId: request.template.id, date };
        let cost = 0;
        for (const other of evaluatedSoFar) cost += computePairFindings(virtual, other, templateById, pairingHints).reduce((s, f) => s + f.penalty, 0);
        return cost;
      })
      .sort((a, b) => a - b);

    const goodCount = costs.filter((c) => c <= GOOD_ENOUGH_DATE_COST_THRESHOLD).length;
    const regret = costs.length >= 2 ? costs[1] - costs[0] : 0;

    if (goodCount < bestGoodCount || (goodCount === bestGoodCount && regret > bestRegret)) {
      best = idx;
      bestGoodCount = goodCount;
      bestRegret = regret;
    }
  }
  return best;
}

interface BeamRunResult {
  complete: PartialCandidate[];
  branchCandidatesPruned: boolean;
  beamCandidatesPruned: boolean;
}

function runBeamSearch(
  toPlace: PlacementRequest[],
  fixedExistingSessions: PlannedSession[],
  hardValidDatesProvider: (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => string[],
  templateById: Map<string, SessionTemplate>,
  recentLogs: SessionLog[],
  sessionPriorityWeightById: Map<string, number>,
  pairingHints: PlanningTimePairingHint[],
  beamWidth: number,
  branchFactor: number,
): BeamRunResult {
  let beam: PartialCandidate[] = [{ placements: [], placedIndices: new Set() }];
  let branchCandidatesPruned = false;
  let beamCandidatesPruned = false;

  const total = toPlace.length;
  for (let step = 0; step < total; step++) {
    const nextBeam: PartialCandidate[] = [];

    for (const partial of beam) {
      const remaining = toPlace.map((_, i) => i).filter((i) => !partial.placedIndices.has(i));
      if (remaining.length === 0) continue;

      const chosenIdx = pickMostConstrained(remaining, toPlace, partial, fixedExistingSessions, hardValidDatesProvider, templateById, recentLogs, pairingHints);
      const request = toPlace[chosenIdx];
      const key = sessionOrDraftKey(request, chosenIdx);

      const evaluatedSoFar = partialToEvaluatedSessions(fixedExistingSessions, toPlace, partial);
      const dates = hardValidDatesProvider(request.template, partial.placements);
      const scored = dates
        .map((date) => {
          const virtual: WeekSession = { id: key, templateId: request.template.id, date };
          let cost = 0;
          for (const other of evaluatedSoFar) cost += computePairFindings(virtual, other, templateById, pairingHints).reduce((s, f) => s + f.penalty, 0);
          return { date, cost };
        })
        .sort((a, b) => a.cost - b.cost);

      if (scored.length > branchFactor) branchCandidatesPruned = true;
      const branched = scored.slice(0, branchFactor);

      for (const { date } of branched) {
        nextBeam.push({
          placements: [...partial.placements, { sessionOrDraft: key, date }],
          placedIndices: new Set([...partial.placedIndices, chosenIdx]),
        });
      }
    }

    if (nextBeam.length === 0) {
      beam = [];
      break;
    }

    const withCost = nextBeam.map((candidate) => ({
      candidate,
      totalCost: evaluateWeekCandidate(partialToEvaluatedSessions(fixedExistingSessions, toPlace, candidate), templateById, recentLogs, sessionPriorityWeightById, pairingHints).totalCost,
    }));
    withCost.sort((a, b) => a.totalCost - b.totalCost);

    if (withCost.length > beamWidth) beamCandidatesPruned = true;
    beam = withCost.slice(0, beamWidth).map((w) => w.candidate);
  }

  const complete = beam.filter((c) => c.placedIndices.size === total);
  return { complete, branchCandidatesPruned, beamCandidatesPruned };
}

function toWeekPlacementCandidate(
  partial: PartialCandidate,
  toPlace: PlacementRequest[],
  fixedExistingSessions: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  recentLogs: SessionLog[],
  sessionPriorityWeightById: Map<string, number>,
  pairingHints: PlanningTimePairingHint[],
): WeekPlacementCandidate {
  const { totalCost, findings } = evaluateWeekCandidate(
    partialToEvaluatedSessions(fixedExistingSessions, toPlace, partial),
    templateById,
    recentLogs,
    sessionPriorityWeightById,
    pairingHints,
  );
  const worstFinding = findings
    .filter((f) => !f.suppressedForPlacement)
    .sort((a, b) => b.penalty - a.penalty)[0] ?? null;
  return { placements: partial.placements, totalCost, worstFinding };
}

// ASCEND_HEURISTIC(PLACEMENT-BEAM-WIDTH/BRANCH): klein en begrensd, geen
// generieke solver. beamWidth=3, branchFactor=3 — ruim voldoende voor een
// beter-dan-greedy week zonder merkbare rekentijd; beide getallen expliciet
// als heuristiek gemarkeerd, niet als bewezen optimum.
//
// `bestFound` betekent altijd "beste kandidaat binnen de onderzochte
// ruimte", nooit "bewezen globaal optimum" — zie WeeklyPlacementResult.
//
// `fixedExistingSessions` moet door de caller al gefilterd zijn op
// toPlace-ids (correctheidseis): een sessie die wordt verplaatst mag nooit
// tegelijk op zijn oude datum in fixedExistingSessions staan.
// `hardValidDatesProvider(template, tentativePlacements)` geeft de datums
// terug die `dayHasRoomFor` overleven gegeven fixedExistingSessions PLUS de
// tentatieve plaatsingen van déze ene partial candidate — nooit gedeeld
// tussen sibling candidates (elke partial candidate heeft eigen,
// onafhankelijke tentative-state).
export function searchWeeklyPlacement(
  toPlace: PlacementRequest[],
  fixedExistingSessions: PlannedSession[],
  hardValidDatesProvider: (template: SessionTemplate, tentativePlacements: { sessionOrDraft: string; date: string }[]) => string[],
  templateById: Map<string, SessionTemplate>,
  recentLogs: SessionLog[],
  sessionPriorityWeightById: Map<string, number>,
  pairingHints: PlanningTimePairingHint[] = [],
  beamWidth = 3,
  branchFactor = 3,
): WeeklyPlacementResult {
  if (toPlace.length === 0) {
    return { status: 'clean', bestFound: { placements: [], totalCost: 0, worstFinding: null }, alternatives: [], searchWasTruncated: false };
  }

  const run = (bw: number, bf: number) => runBeamSearch(toPlace, fixedExistingSessions, hardValidDatesProvider, templateById, recentLogs, sessionPriorityWeightById, pairingHints, bw, bf);

  let result = run(beamWidth, branchFactor);
  let searchWasTruncated = result.branchCandidatesPruned || result.beamCandidatesPruned;

  const buildOutcome = (r: BeamRunResult, truncated: boolean): { candidates: WeekPlacementCandidate[]; truncated: boolean } => {
    const candidates = r.complete
      .map((p) => toWeekPlacementCandidate(p, toPlace, fixedExistingSessions, templateById, recentLogs, sessionPriorityWeightById, pairingHints))
      .sort((a, b) => a.totalCost - b.totalCost);
    return { candidates, truncated };
  };

  let { candidates, truncated } = buildOutcome(result, searchWasTruncated);

  const isCompromised = (best: WeekPlacementCandidate) =>
    (best.worstFinding !== null && best.worstFinding.penalty >= SEVERE_FINDING_THRESHOLD) || best.totalCost >= COMPROMISED_WEEK_THRESHOLD;

  if (candidates.length === 0) {
    // Geen enkele complete plaatsing gevonden deze ronde.
    if (!truncated) {
      return { status: 'unplaceable', reason: 'Geen enkele combinatie van dagen plaatst alle sessies binnen de harde beschikbaarheidsgrenzen.', confirmedBy: 'exhaustive-search' };
    }
    // Afgekapt — geen conclusie trekken, verbreed eerst.
    const wider = run(beamWidth * 2, branchFactor * 2);
    const widerOutcome = buildOutcome(wider, wider.branchCandidatesPruned || wider.beamCandidatesPruned);
    if (widerOutcome.candidates.length > 0) {
      candidates = widerOutcome.candidates;
      truncated = widerOutcome.truncated;
    } else if (!widerOutcome.truncated) {
      return { status: 'unplaceable', reason: 'Geen enkele combinatie van dagen plaatst alle sessies binnen de harde beschikbaarheidsgrenzen (bevestigd na verbrede zoekopdracht).', confirmedBy: 'exhaustive-search' };
    } else {
      const feasible = hasFeasibleHardPlacement(toPlace, hardValidDatesProvider);
      if (!feasible) {
        return { status: 'unplaceable', reason: 'Geen enkele combinatie van dagen plaatst alle sessies binnen de harde beschikbaarheidsgrenzen (bevestigd door een zuivere haalbaarheidscheck).', confirmedBy: 'feasibility-check' };
      }
      return { status: 'search-limited', reason: 'Er bestaat een hard-geldige plaatsing, maar ASCEND kon binnen de zoekopdracht geen bruikbare complete plaatsing vinden.' };
    }
  }

  let best = candidates[0];
  let alternatives = candidates.slice(1);

  if (isCompromised(best) && truncated) {
    const wider = run(beamWidth * 2, branchFactor * 2);
    const widerOutcome = buildOutcome(wider, wider.branchCandidatesPruned || wider.beamCandidatesPruned);
    if (widerOutcome.candidates.length > 0 && widerOutcome.candidates[0].totalCost < best.totalCost) {
      best = widerOutcome.candidates[0];
      alternatives = widerOutcome.candidates.slice(1);
      truncated = widerOutcome.truncated;
    }
  }

  if (isCompromised(best)) {
    const reason = best.worstFinding
      ? `Kon een stapeling van zware belasting niet volledig vermijden (${best.worstFinding.axis}, ${best.worstFinding.daysApart} dag(en) apart). ASCEND vond geen betere verdeling binnen de onderzochte opties.`
      : 'De cumulatieve belasting van deze week bleef boven de gewenste drempel. ASCEND vond geen betere verdeling binnen de onderzochte opties.';
    return { status: 'compromised', bestFound: best, alternatives, compromisedReason: reason, searchWasTruncated: truncated };
  }

  return { status: 'clean', bestFound: best, alternatives, searchWasTruncated: truncated };
}

// Fase 8 — gedeelde helper: zet Fase 7's overlevende, niet-gekozen complete
// weekkandidaten om naar PlanChangeAlternative[], zodat
// PlanChangeProposal.alternatives daadwerkelijk gevuld wordt vanuit de
// beam search in plaats van hardcoded [] (scheduler.ts#proposeMove,
// strengthScheduling.ts#buildPlan, proposalEngine.ts#wrapAsPlanChangeProposal
// riepen dit voorheen alle drie niet aan).
export function weekCandidatesToAlternatives(
  alternatives: WeekPlacementCandidate[],
  templateFor: (sessionOrDraft: string) => SessionTemplate | undefined,
  weekStartDate: string,
): PlanChangeAlternative[] {
  return alternatives.map((candidate, i) => {
    const changes: PlanChangeItem[] = candidate.placements.map((p) => {
      const template = templateFor(p.sessionOrDraft);
      return {
        action: 'add',
        newSessionDraft: template ? { templateId: template.id, scheduledDate: p.date, weekStartDate } : undefined,
        reason: 'Alternatieve plaatsing uit de zoekstrategie — niet gekozen als beste optie.',
      };
    });
    const consequences = candidate.worstFinding
      ? `Bevat een belastingsbevinding op ${candidate.worstFinding.axis} (${candidate.worstFinding.daysApart} dag(en) apart) — totale cost ${candidate.totalCost.toFixed(2)}.`
      : `Totale cost ${candidate.totalCost.toFixed(2)}.`;
    return { label: `Alternatief ${i + 1}`, changes, consequences };
  });
}
