import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Vandaag zonder tocht als doel: geen Reis-regel en geen blad over de GR5, ook niet bij een
// hoofddoel met een datum (een loopwedstrijd). Met een tocht blijft de regel.
let trek = false;
vi.mock('./useHasTrekGoal', () => ({ useHasTrekGoal: () => trek }));
vi.mock('../../state/AppDataContext', () => ({
  useAppData: () => ({
    settings: { journeyOnToday: 'every-week' }, sessionLogs: [], goalMilestones: [{ goalId: 'g1' }],
    trainingGoals: [{ id: 'g1', name: 'Voorbeeld', status: 'active', priority: 'primary', targetDate: new Date(Date.now() + 20 * 7 * 864e5).toISOString().slice(0, 10), requirements: [] }],
  }),
}));
vi.mock('./usePackList', () => ({ usePackList: () => ({ items: [] }) }));

const { JourneyWeekCard } = await import('../JourneyWeekCard');
const html = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(JourneyWeekCard)));

describe('de Reis-regel op Vandaag', () => {
  it('zonder tocht als doel: niets', () => {
    trek = false;
    expect(html()).toBe('');
  });

  it('met een tocht: de regel staat er', () => {
    trek = true;
    expect(html()).toContain('Reis');
  });
});
