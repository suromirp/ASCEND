// ASCEND — the coach on the Ascend page: are you on course for your goal?
//
// Looks back at the last four finished weeks of the program, counted the
// same way as the weekly review (engine/weekReview.ts): rest days, sick
// days and sessions ASCEND itself took out don't count, skipped ones do.
// The long run and the mountain hike weigh extra: they carry the build-up
// toward a long day in the mountains. Fixed rules, no AI, and a line only
// says what is true.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { buildWeekReview, type WeekReview } from './weekReview';

export type CourseStatus = 'early' | 'on' | 'nearly' | 'behind';

export interface CourseAssessment {
  status: CourseStatus;
  headline: string;
  summary?: string; // "Laatste 4 weken: 18 van 20 trainingen, lange training 4 van 4"
  lines: string[];
}

interface CourseInputs {
  today: string;
  goalName: string;
  goalDate: string;
  program: Program | null | undefined;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  planChangeLog: PlanChangeProposal[];
  illnessEpisodes?: IllnessEpisode[];
}

export const LOOKBACK_WEEKS = 4;
const MIN_WEEKS = 2;

// What the current phase is for, in one sentence.
const PHASE_FOCUS: Record<string, string> = {
  phase_1: 'De basis: rustige kilometers en kracht, zodat je lijf de opbouw straks aankan.',
  phase_2: 'Opbouw: je lopen worden elk blok langer, en als het goed gaat stelt ASCEND een extra training voor. Elke vierde week rust.',
  phase_3: 'Bergcapaciteit: meer hoogtemeters in je lange training. Die telt nu het zwaarst.',
  phase_4: 'Expeditieklaar: twee lange dagen achter elkaar, zoals op een meerdaagse tocht.',
  phase_taper: 'Afbouwen: minder doen, fris aankomen. Extra trainen helpt nu niet meer.',
};

function percent(done: number, planned: number): number {
  return planned === 0 ? 1 : done / planned;
}

export function assessOnCourse(inputs: CourseInputs): CourseAssessment {
  const { today, goalName, goalDate, program, plannedSessions, logs, templates, planChangeLog, illnessEpisodes } = inputs;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const weeksLeft = Math.max(0, Math.ceil(daysBetween(today, goalDate) / 7));
  const phase = program ? resolveProgramWeek(program, today)?.phase : undefined;
  const focus = phase ? PHASE_FOCUS[phase.id] : undefined;

  // The last four finished weeks inside the program.
  const thisMonday = mondayOfWeek(today);
  const reviews: WeekReview[] = [];
  for (let i = 1; i <= LOOKBACK_WEEKS; i++) {
    const review = buildWeekReview({ weekStart: addDays(thisMonday, -7 * i), plannedSessions, logs, templates, program, planChangeLog, asOf: today, illnessEpisodes });
    if (review && review.planned > 0) reviews.push(review);
  }

  if (reviews.length < MIN_WEEKS) {
    return {
      status: 'early',
      headline: 'Net begonnen',
      lines: [
        `Na twee volle weken zegt de coach hier of je op koers ligt voor ${goalName}.`,
        ...(focus ? [focus] : []),
      ],
    };
  }

  const done = reviews.reduce((n, r) => n + r.done, 0);
  const planned = reviews.reduce((n, r) => n + r.planned, 0);
  const keyDone = reviews.reduce((n, r) => n + r.keyDone, 0);
  const keyPlanned = reviews.reduce((n, r) => n + r.keyPlanned, 0);
  const share = percent(done, planned);
  const keyShare = percent(keyDone, keyPlanned);

  const status: CourseStatus =
    share >= 0.8 && keyShare >= 0.75 ? 'on'
      : share >= 0.6 && keyShare >= 0.5 ? 'nearly'
        : 'behind';

  const weeksWord = reviews.length === 1 ? 'week' : 'weken';
  const summary = `Laatste ${reviews.length} ${weeksWord}: ${done} van ${planned} trainingen` +
    (keyPlanned > 0 ? `, lange training ${keyDone} van ${keyPlanned}` : '');

  const lines: string[] = [];
  if (status === 'on') {
    lines.push(`Je doet wat er staat. Zo kom je goed voorbereid aan de start van ${goalName}.`);
  } else if (status === 'nearly') {
    lines.push(keyShare < 0.75
      ? 'Bijna: de lange training viel een paar keer weg. Die telt het zwaarst, dus geef hem voorrang als je moet kiezen.'
      : 'Bijna: er vielen een paar trainingen weg. Eén keer missen is niet erg, het gaat om het ritme.');
  } else {
    lines.push('Er viel de laatste weken veel weg. Inhalen hoeft niet: pak deze week de draad weer op, te beginnen met de lange training.');
  }

  // The same training missing again and again: a pattern, not bad luck.
  const missCount = new Map<string, number>();
  for (const r of reviews) for (const id of new Set(r.missedTemplateIds)) missCount.set(id, (missCount.get(id) ?? 0) + 1);
  const [oftenId, often] = [...missCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (oftenId && often !== undefined && often >= 2) {
    lines.push(`${byId.get(oftenId)?.name ?? 'Eén training'} viel ${often} van de ${reviews.length} weken weg. Past een andere dag beter? Verplaats hem in Week.`);
  }

  // How much room is left.
  if (phase?.id === 'phase_taper') {
    lines.push(`Nog ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weken'}. Wat je nu nog kunt winnen, is rust.`);
  } else if (status !== 'on' && weeksLeft > 16) {
    lines.push(`Er zijn nog ${weeksLeft} weken. Tijd genoeg, als het ritme terugkomt.`);
  } else if (status !== 'on' && weeksLeft > 0) {
    lines.push(`Nog ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weken'}. De lange trainingen tellen nu het zwaarst.`);
  }
  if (focus && phase?.id !== 'phase_taper') lines.push(focus);

  const headline = status === 'on' ? 'Op koers' : status === 'nearly' ? 'Bijna op koers' : 'Achter op schema';
  return { status, headline, summary, lines: lines.slice(0, 3) };
}
