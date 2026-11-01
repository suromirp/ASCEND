// ASCEND: de ochtendregel afmaken, een voorstel bij een zware sessie op een slechte ochtend
// (docs/onderzoek/Kansen met gegevens.md, kans C; docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// De ochtendregel "twee van drie" (engine/morningRule.ts) zegt per getal van je horloge een woord en
// vraagt bij twee afwijkende of je moe bent. Staat er die dag een tempoloop, intervallen, een test of
// een zware beendag, dan komt er daarbovenop één voorstel met Akkoord om hem later te doen, met welke
// getallen afwijken. Eén afwijkend getal blijft één woord op de ochtendkaart, geen voorstel.
//
// Niet als je op de vraag "Ben je moe?" Nee zei of je ochtendcheck "Alles normaal" was, niet bij een
// wedstrijd (die heeft een vaste datum), niet als je ziek bent gemeld, en niet naast een ander voorstel
// voor dezelfde sessie (de ochtendcheck of de kaart Benen). Lichter doen in plaats van verschuiven is
// een keuze bij het inlopen; die verandert de planning niet en staat als zin in het blad.
//
// Bijsturen op je ochtendgetallen gaf bij recreatieve lopers iets meer vooruitgang (Nuuttila e.a.
// 2022, matig bewijs); twee van drie is een vuistregel, geen meting.
//
// Puur: geen React, geen IndexedDB.

import type { MorningCheckIn } from '../models/checkIn';
import type { IllnessEpisode } from '../models/illness';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { laterMoveAdvice, legCardSessionOf, testMoveAdvice, type Advice, type AdviceInputs } from './adviceEngine';
import { activeIllness } from './illness';
import { checkInFor, morningSignals } from './wellbeing';
import type { MorningRule, MorningSignal } from './morningRule';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { hasRole } from './templateRoles';

export const MORNING_WATCH_RULE = 'MORNING-WATCH';

export interface MorningProposalCause {
  session: PlannedSession;
  template: SessionTemplate;
  // De getallen die afwijken, in de volgorde van de ochtendkaart.
  off: MorningSignal[];
  isTest: boolean;
}

export interface MorningCauseInput {
  today: string;
  rule: MorningRule | undefined;
  plannedSessions: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
  logs: readonly SessionLog[];
  checkIns?: readonly MorningCheckIn[];
  illnessEpisodes?: IllnessEpisode[];
  // De instelling "Voorstel bij een slechte ochtend" (AppSettings.morningProposal) en "Twee van drie".
  enabled: boolean;
}

export function morningProposalCause(input: MorningCauseInput): MorningProposalCause | undefined {
  const { today, rule } = input;
  if (!input.enabled || !rule || rule.date !== today || !rule.askTired) return undefined;
  if (activeIllness(input.illnessEpisodes)) return undefined;
  const checkIn = input.checkIns?.find((c) => c.date === today);
  if (checkIn?.allNormal || checkIn?.energy === 'gewoon') return undefined;
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  for (const session of input.plannedSessions) {
    if (session.scheduledDate !== today || session.status === 'skipped' || logged.has(session.id)) continue;
    const template = byId.get(session.templateId);
    if (!template || template.type === 'recovery' || hasRole(template, 'race')) continue;
    const isTest = hasRole(template, 'test');
    if (!isTest && !isHardRun(template) && !isLegHeavyTemplate(template)) continue;
    return { session, template, off: rule.signals.filter((s) => s.off), isTest };
  }
  return undefined;
}

export function morningProposalId(sessionId: string, today: string): string {
  return `morning-watch:${today}:${sessionId}`;
}

const offText = (off: MorningSignal[]) => off.map((s) => s.text).join(off.length === 2 ? ' en ' : ', ');

const WHY = 'Je rusthartslag, HRV en slaap samen zeggen meer dan één getal. Bij twee afwijkende kan het helpen om een zware training later in de week te doen; bijsturen op je ochtendgetallen gaf bij recreatieve lopers iets meer vooruitgang (Nuuttila e.a. 2022, matig bewijs). Twee van drie is een vuistregel, geen meting. Alleen jij beslist, dit is een voorstel.';

// Het voorstel, of niets: al beantwoord, er staat of stond al een ander voorstel voor deze sessie,
// of er is deze week geen goede latere dag. Hetzelfde mechanisme als MORNING-CHECK en
// HARD-THEN-SPACE: de kaart Benen (LEG-EASE) spreekt voor de training die `legCardSessionOf` kiest,
// dus geef `legEase` en `checkIns` mee in de inputs. Een beantwoord voorstel van de ochtendcheck
// (`morning:`) of van de kaart Benen (`leg-ease:`) voor dezelfde sessie telt ook, en `shownIds` zijn
// de ids van wat Vandaag nu toont.
export function morningProposal(inputs: AdviceInputs, cause: MorningProposalCause | undefined, shownIds: ReadonlySet<string>): Advice | undefined {
  if (!cause) return undefined;
  const today = inputs.asOf;
  const id = morningProposalId(cause.session.id, today);
  if (inputs.respondedIds.has(id)) return undefined;
  const other = [`morning:${today}:${cause.session.id}`, `leg-ease:${today}:${cause.session.id}`];
  if (other.some((o) => shownIds.has(o) || inputs.respondedIds.has(o))) return undefined;
  // Zoals MORNING-CHECK: bij spierpijn in je benen spreekt de kaart Benen voor de training die
  // legCardSessionOf kiest. Zonder spierpijn wordt die kaart door de beenindex of een harde loop
  // eerder op de dag gestuurd; dat vangt de kaart op Vandaag (useLegEase).
  const checkIn = checkInFor(today, inputs.checkIns);
  const sig = checkIn && !checkIn.allNormal ? morningSignals(checkIn, inputs.logs) : undefined;
  if (sig && sig.sore !== 'none' && !sig.rest && legCardSessionOf(inputs)?.id === cause.session.id) return undefined;
  const reason = `Twee van de drie getallen van je horloge wijken af (${offText(cause.off)})`;
  const found = cause.isTest
    ? testMoveAdvice(inputs, { sessionId: cause.session.id, id, title: `${cause.template.name} later`, why: WHY })
    : laterMoveAdvice(inputs, cause.session.id, { id, ruleId: MORNING_WATCH_RULE, why: WHY, reason }, 1);
  if (!found?.proposal) return undefined;
  return { ...found, ruleId: MORNING_WATCH_RULE, effect: `Vanochtend: ${offText(cause.off)}. ${found.effect}` };
}

// De zin op de kaart van Vandaag.
export function morningProposalLine(cause: MorningProposalCause, templateName: string = cause.template.name): string {
  return `Twee van de drie getallen van je horloge wijken vanochtend af, en vandaag staat ${templateName}. Er ligt een voorstel om hem later te doen.`;
}

// Onder de wijzigingen in het blad: lichter doen is ook een keuze, zonder iets te verschuiven.
export const MORNING_LIGHTER_NOTE = 'Liever vandaag? Doe hem dan korter en rustiger, en stop als het inlopen zwaar voelt. Daarvoor hoeft er niets te veranderen.';
