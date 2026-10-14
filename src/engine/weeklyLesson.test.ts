import { describe, it, expect } from 'vitest';
import { pickLesson, eligibleTopics, weeksBeforeGoal } from './weeklyLesson';
import type { KnowledgeTopic } from '../data/knowledge';

const t = (id: string, window: [number, number]): KnowledgeTopic => ({ id, title: id, category: 'navigatie', summary: '', window });
const topics = [t('a', [40, 14]), t('b', [30, 6]), t('c', [22, 4]), t('d', [10, 0])];
const all = () => true;
const GOAL = '2027-08-01';

describe('the lesson of the week', () => {
  it('counts the weeks before the goal', () => {
    expect(weeksBeforeGoal('2026-10-14', GOAL)).toBe(42);
  });

  it('picks, among the topics whose window holds this week, the one that runs out first', () => {
    // 20 weeks before: a, b and c fit; a closes first (at 14 weeks), then b (6), then c (4).
    expect(eligibleTopics(topics, all, [], 20).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(pickLesson(topics, all, undefined, '2027-03-15', GOAL)).toBe('a');
  });

  it('skips read topics and topics without a text, and is empty when nothing fits', () => {
    expect(pickLesson(topics, all, { read: ['a'] }, '2027-03-15', GOAL)).toBe('b');
    expect(pickLesson(topics, (id) => id !== 'a', undefined, '2027-03-15', GOAL)).toBe('b');
    expect(pickLesson(topics, () => false, undefined, '2027-03-15', GOAL)).toBeUndefined();
    expect(pickLesson(topics, all, undefined, '2026-10-14', GOAL)).toBeUndefined(); // 42 weeks: nothing is open that early
  });

  it('keeps the pick for the whole week', () => {
    expect(pickLesson(topics, all, { week: { weekStart: '2027-03-15', topicId: 'b' }, read: ['b'] }, '2027-03-17', GOAL)).toBe('b');
    expect(pickLesson(topics, all, { week: { weekStart: '2027-03-08', topicId: 'b' } }, '2027-03-17', GOAL)).toBe('a');
  });
});
