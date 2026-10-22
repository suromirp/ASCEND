import { describe, it, expect } from 'vitest';
import { WEEK_QUESTIONS, type WeekQuestionPhase } from '../data/weeklyQuestions';
import type { Program } from '../models/program';
import type { WeeklyIntention } from '../models/checkIn';
import { addDays, mondayOfWeek } from '../utils/dates';
import { layoutPhasesForGoal } from './programLayout';
import { RACE_BLOCK_WEEKS } from './raceBlock';
import {
  MAX_ANSWER_LENGTH,
  answerIntention,
  cleanAnswer,
  intentionForWeek,
  isWeeklyIntention,
  mergeIntentions,
  pickWeekQuestion,
  postponeIntention,
  questionPool,
  shouldShowWeeklyQuestion,
  weekQuestionContext,
  type WeekQuestionContext,
} from './weeklyQuestion';

const GOAL = '2027-08-01'; // the GR5, a Sunday
const RACE_DATE = '2027-03-20'; // the 10 km, a Saturday
const RACE_WEEK = mondayOfWeek(RACE_DATE);
const RACES = [{ blockStart: addDays(RACE_WEEK, -7 * RACE_BLOCK_WEEKS), raceWeek: RACE_WEEK }];

function programFrom(startDate: string): Program {
  const phases = layoutPhasesForGoal(startDate, GOAL);
  if (!phases) throw new Error('no layout');
  return { id: 'p', name: 'Test', startDate, phases };
}

function ctxFor(program: Program, weekStart: string, races = RACES): WeekQuestionContext {
  return weekQuestionContext({ weekStart, program, races, goalDate: GOAL });
}

// Every Monday from `from` up to and including the week the goal falls in.
function weeksUntilGoal(from: string): string[] {
  const out: string[] = [];
  for (let w = mondayOfWeek(from); w <= GOAL; w = addDays(w, 7)) out.push(w);
  return out;
}

const q = (id: string) => WEEK_QUESTIONS.find((x) => x.id === id)!;

describe('the question list', () => {
  it('has at least 40 questions with unique ids and unique sources', () => {
    expect(WEEK_QUESTIONS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(WEEK_QUESTIONS.map((x) => x.id)).size).toBe(WEEK_QUESTIONS.length);
    const sources = WEEK_QUESTIONS.map((x) => `${x.bron.auteur}|${x.bron.werk}`);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('is an if-then question with a Stoic source and a place of finding in every entry', () => {
    for (const x of WEEK_QUESTIONS) {
      expect(x.vraag.startsWith('Als '), x.id).toBe(true);
      expect(x.vraag.endsWith('?'), x.id).toBe(true);
      expect(x.bron.tekst.length, x.id).toBeGreaterThan(20);
      expect(['Marcus Aurelius', 'Seneca', 'Epictetus']).toContain(x.bron.auteur);
      expect(x.bron.werk, x.id).toMatch(/\d/); // a place such as "Overpeinzingen 4.49"
    }
  });

  it('writes no dashes as punctuation in the new text', () => {
    for (const x of WEEK_QUESTIONS) {
      for (const text of [x.vraag, x.bron.tekst, x.bron.werk, x.bron.noot ?? '']) {
        expect(text, x.id).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
      }
    }
  });

  it('covers the themes of the period: setback, pain or illness, weather, alone, a missed training, fatigue, doubt', () => {
    const themes = new Set(WEEK_QUESTIONS.map((x) => x.theme));
    for (const t of ['tegenslag', 'pijn_ziekte', 'weer', 'alleen', 'gemist', 'vermoeidheid', 'twijfel']) expect(themes.has(t as never), t).toBe(true);
  });

  it('has questions for every phase', () => {
    const phases: WeekQuestionPhase[] = ['basis', 'opbouw', 'wedstrijd', 'na_wedstrijd', 'berg', 'expeditie', 'taper', 'gr5'];
    for (const p of phases) expect(WEEK_QUESTIONS.some((x) => x.phase === p), p).toBe(true);
  });
});

describe('which question this week', () => {
  it('is the same question for the same week, whenever and wherever you ask', () => {
    const program = programFrom('2026-10-19');
    const a = pickWeekQuestion(ctxFor(program, '2027-02-08'));
    const b = pickWeekQuestion(ctxFor(program, '2027-02-10')); // a Wednesday of the same week
    expect(b.id).toBe(a.id);
  });

  it('follows the phase: basis in the autumn, the race block in February, the mountain phase in May', () => {
    const program = programFrom('2026-10-19');
    expect(pickWeekQuestion(ctxFor(program, '2026-11-02')).phase).toBe('basis');
    expect(pickWeekQuestion(ctxFor(program, '2027-02-08')).phase).toBe('wedstrijd');
    expect(pickWeekQuestion(ctxFor(program, '2027-03-22')).phase).toBe('na_wedstrijd');
    expect(pickWeekQuestion(ctxFor(program, '2027-04-12')).phase).toBe('opbouw');
    expect(pickWeekQuestion(ctxFor(program, '2027-05-10')).phase).toBe('berg');
    expect(pickWeekQuestion(ctxFor(program, '2027-06-28')).phase).toBe('expeditie');
    expect(pickWeekQuestion(ctxFor(program, '2027-07-19')).phase).toBe('taper');
    expect(pickWeekQuestion(ctxFor(program, '2027-08-09')).phase).toBe('gr5');
  });

  it('counts the race block from its end: race week gets the last race question, the first block week the first', () => {
    const program = programFrom('2026-10-19');
    const race = WEEK_QUESTIONS.filter((x) => x.phase === 'wedstrijd');
    expect(pickWeekQuestion(ctxFor(program, RACE_WEEK)).id).toBe(race[race.length - 1].id);
    expect(pickWeekQuestion(ctxFor(program, RACES[0].blockStart)).id).toBe(race[0].id);
    expect(race.length).toBeGreaterThanOrEqual(RACE_BLOCK_WEEKS + 1);
  });

  it('counts taper and expeditie from the end: the last week gets the last question', () => {
    const program = programFrom('2026-10-19');
    const taper = WEEK_QUESTIONS.filter((x) => x.phase === 'taper');
    const expeditie = WEEK_QUESTIONS.filter((x) => x.phase === 'expeditie');
    expect(pickWeekQuestion(ctxFor(program, '2027-07-26')).id).toBe(taper[taper.length - 1].id);
    expect(pickWeekQuestion(ctxFor(program, '2027-07-12')).id).toBe(expeditie[expeditie.length - 1].id);
    expect(pickWeekQuestion(ctxFor(program, '2027-06-21')).id).toBe(expeditie[expeditie.length - 4].id);
  });

  it('never repeats a question between now and the GR5, whatever the program start', () => {
    for (const start of ['2026-10-19', '2026-09-07', '2026-08-03']) {
      const program = programFrom(start);
      const ids = weeksUntilGoal('2026-10-19').map((w) => pickWeekQuestion(ctxFor(program, w)).id);
      expect(ids.length).toBe(41);
      expect(new Set(ids).size, `start ${start}`).toBe(ids.length);
    }
  });

  it('does not repeat in consecutive weeks of the trek either', () => {
    const program = programFrom('2026-10-19');
    const ids = [1, 2, 3, 4].map((n) => pickWeekQuestion(ctxFor(program, addDays('2027-07-26', 7 * n))).id);
    expect(new Set(ids).size).toBe(4);
  });

  it('uses the general pool without a program or a goal', () => {
    const ctx = weekQuestionContext({ weekStart: '2027-02-08', program: null });
    expect(questionPool(ctx)).toBe('algemeen');
    expect(['basis', 'opbouw']).toContain(pickWeekQuestion(ctx).phase);
    const next = pickWeekQuestion(weekQuestionContext({ weekStart: '2027-02-15', program: null }));
    expect(next.id).not.toBe(pickWeekQuestion(ctx).id);
  });

  it('falls back to the whole list when a pool is empty, so a week always has a question', () => {
    const only = [q('WQ-basis-01')];
    const ctx = weekQuestionContext({ weekStart: '2027-05-10', program: programFrom('2026-10-19'), goalDate: GOAL });
    expect(pickWeekQuestion(ctx, only).id).toBe('WQ-basis-01');
  });
});

describe('your answer', () => {
  const question = q('WQ-basis-01');
  const week = '2026-10-19';

  it('is saved as one clean line, with the question as it was shown', () => {
    const list = answerIntention(undefined, question, week, '  Dan loop ik\n  op   zondag.  ', '2026-10-19T08:00:00.000Z');
    expect(list).toEqual([{ weekStart: week, questionId: question.id, question: question.vraag, answer: 'Dan loop ik op zondag.', answeredAt: '2026-10-19T08:00:00.000Z' }]);
    expect(cleanAnswer('x'.repeat(500)).length).toBe(MAX_ANSWER_LENGTH);
  });

  it('is append-only: a second answer for the same week does not rewrite the first', () => {
    const first = answerIntention(undefined, question, week, 'Eerste plan', '2026-10-19T08:00:00.000Z');
    const second = answerIntention(first, question, week, 'Ander plan', '2026-10-20T08:00:00.000Z');
    expect(second).toBe(first);
    expect(intentionForWeek(second, week)?.answer).toBe('Eerste plan');
  });

  it('ignores an empty line', () => {
    expect(answerIntention(undefined, question, week, '   ', 'x')).toEqual([]);
  });

  it('shows the card in its own week until you answered, and Later hides it for that day only', () => {
    expect(shouldShowWeeklyQuestion(undefined, week, '2026-10-19')).toBe(true);
    expect(shouldShowWeeklyQuestion(undefined, week, '2026-10-25')).toBe(true); // Sunday, still the same week
    expect(shouldShowWeeklyQuestion(undefined, week, '2026-10-26')).toBe(false); // next week: that week's question
    const later = postponeIntention(undefined, question, week, '2026-10-19');
    expect(shouldShowWeeklyQuestion(later, week, '2026-10-19')).toBe(false);
    expect(shouldShowWeeklyQuestion(later, week, '2026-10-20')).toBe(true);
    const answered = answerIntention(later, question, week, 'Mijn plan', '2026-10-20T08:00:00.000Z');
    expect(shouldShowWeeklyQuestion(answered, week, '2026-10-21')).toBe(false);
    expect(answered[0].laterOn).toBeUndefined(); // the answer replaces the postponed record
  });

  it('does not postpone a week that is already answered', () => {
    const answered = answerIntention(undefined, question, week, 'Mijn plan', 'x');
    expect(postponeIntention(answered, question, week, '2026-10-20')).toBe(answered);
  });

  it('keeps the list sorted by week', () => {
    let list = answerIntention(undefined, question, '2026-11-02', 'b', 'x');
    list = answerIntention(list, question, '2026-10-19', 'a', 'x');
    expect(list.map((e) => e.weekStart)).toEqual(['2026-10-19', '2026-11-02']);
  });
});

describe('restoring answers', () => {
  const e = (weekStart: string, extra: Partial<WeeklyIntention> = {}): WeeklyIntention => ({ weekStart, questionId: 'WQ-basis-01', question: 'Als ...?', ...extra });

  it('unions the weeks and lets the device win, but an answer beats a postponed week', () => {
    const incoming = [e('2026-10-19', { answer: 'uit de back-up' }), e('2026-10-26', { answer: 'alleen in de back-up' })];
    const current = [e('2026-10-19', { laterOn: '2026-10-20' }), e('2026-11-02', { answer: 'alleen op het toestel' })];
    expect(mergeIntentions(incoming, current)).toEqual([
      e('2026-10-19', { answer: 'uit de back-up' }),
      e('2026-10-26', { answer: 'alleen in de back-up' }),
      e('2026-11-02', { answer: 'alleen op het toestel' }),
    ]);
    const both = mergeIntentions([e('2026-10-19', { answer: 'oud' })], [e('2026-10-19', { answer: 'nieuw' })]);
    expect(both?.[0].answer).toBe('nieuw');
  });

  it('is undefined when neither side has any', () => {
    expect(mergeIntentions(undefined, undefined)).toBeUndefined();
  });

  it('accepts a good record and refuses a damaged one', () => {
    expect(isWeeklyIntention(e('2026-10-19', { answer: 'ok' }))).toBe(true);
    expect(isWeeklyIntention(e('2026-10-19'))).toBe(true);
    expect(isWeeklyIntention({ weekStart: 'maandag', questionId: 'a', question: 'b' })).toBe(false);
    expect(isWeeklyIntention({ weekStart: '2026-10-19', questionId: '', question: 'b' })).toBe(false);
    expect(isWeeklyIntention({ weekStart: '2026-10-19', questionId: 'a', question: 'b', answer: 42 })).toBe(false);
    expect(isWeeklyIntention(null)).toBe(false);
    expect(isWeeklyIntention([])).toBe(false);
  });
});
