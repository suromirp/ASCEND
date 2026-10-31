// ASCEND: een bestaand plan zonder doel gaat pas in neutrale golven na jouw Akkoord
// (docs/beslissingen/2026-10-31-zonder-doel-golven-na-akkoord.md). Wie al een plan had dat niet in
// golven loopt (het oude programma met een bergtocht in de bergfase) en nu geen doel heeft, houdt dat
// plan tot hij Akkoord geeft op één voorstel. Liever niet laat alles staan, en het voorstel komt niet
// terug (het antwoord staat bij de adviezen, zoals elk ander). Een nieuw plan dat al in golven begint,
// en een doel archiveren (dat voorstel laat het vooraf zien), werken zoals ze deden.
// Puur: geen React, geen IndexedDB.

import type { AppSettings } from '../storage/database';
import type { EngineEvent } from '../models/planChange';
import type { Program } from '../models/program';
import type { Advice } from './adviceEngine';
import { isWavePhase } from './programLayout';

export const NO_GOAL_WAVES_ID = 'nogoal-waves';
export const NO_GOAL_WAVES_TITLE = 'Plannen zonder doel: neutrale golven';

// Het Akkoord, zoals het in de instellingen komt.
export const wavesConsentPatch: Pick<AppSettings, 'noGoalWaves'> = { noGoalWaves: 'agreed' };

// Houdt de planningsronde het oude plan vast? Alleen als er een plan is dat nog niet in golven loopt
// en je nog geen Akkoord gaf. Of je een doel hebt, beslist planDirection daarna.
export function wavesHeld(settings: { noGoalWaves?: unknown }, program: Pick<Program, 'phases'> | null | undefined): boolean {
  if (!program) return false;
  if (settings.noGoalWaves === 'agreed') return false;
  return !program.phases.some((p) => isWavePhase(p.id));
}

// De voorstellen die het plan zonder doel al vooraf laten zien: een doel dat komt, verandert of
// verdwijnt, een richting kiezen en een keuze na een golf. Hun Akkoord is ook het Akkoord op de
// golven. storage/horizonPlan.ts haalt het er weer af als het plan daarna toch niet in golven loopt.
const SHOWS_WAVES: ReadonlySet<EngineEvent> = new Set<EngineEvent>(['goal_created', 'goal_changed', 'goal_removed', 'goal_paused', 'direction_changed', 'wave_review']);

export function withWavesConsent<T extends { trigger: EngineEvent; goals?: unknown; settings?: Partial<AppSettings> }>(input: T): T {
  if (!SHOWS_WAVES.has(input.trigger) && input.goals === undefined) return input;
  return { ...input, settings: { ...(input.settings ?? {}), ...wavesConsentPatch } };
}

// Wat er verandert, voor het voorstel.
export function noGoalWavesLines(): string[] {
  return [
    'Je weken gaan in golven van een paar weken, met elke laatste week wat lichter.',
    'Je geplande bergtochten worden weer de lange loop en je wandeldagen weer de heuvelloop.',
    'Er komt geen rugzak meer in je planning, tot je een tocht als doel kiest.',
  ];
}

// Het voorstel op Vandaag: alleen voor een plan dat de planningsronde vasthoudt terwijl je geen doel
// hebt, dus wat engine/direction.ts#planDirection als `held` teruggeeft.
export function noGoalWavesAdvice(plan: { held?: boolean }): Advice[] {
  if (!plan.held) return [];
  return [{
    id: NO_GOAL_WAVES_ID,
    trigger: 'plan_update',
    ruleId: 'NO-GOAL-WAVES',
    title: NO_GOAL_WAVES_TITLE,
    brief: 'Je hebt nu geen doel. Je plan blijft zoals het is tot je kiest.',
    effect: 'Je hebt geen doel, maar je plan bouwt nog op naar een bergtocht met rugzak. Voorstel: plan je weken voortaan in neutrale golven. Je bergtochten worden dan weer de lange loop. Met Liever niet blijft je plan zoals het is en vraagt ASCEND er niet meer naar; kies je later een richting op de Ascend-tab, dan kan het alsnog.',
    why: 'Zonder doel is er geen tocht om naartoe te bouwen. Golven houden je fit met een vaste week en af en toe een lichtere, zonder rugzak en zonder bergtocht. Omdat dit je planning inhoudelijk verandert, gebeurt het alleen na jouw Akkoord.',
    priority: 2,
    noGoalWaves: true,
  }];
}
