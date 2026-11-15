import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { JOURNEY_TASKS } from '../data/journeyTasks';
import { tasksForShelter } from '../engine/journey';

// De Reisplanner bij een late start (backlogpunt G): bovenaan Nu regelen met de taken die eerder aan de
// beurt waren, met "was aan de beurt tot". Nagemaakte stand, de klok vast op 16 november 2026.
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-11-16T07:30:00+01:00'));
const tasks = tasksForShelter(JOURNEY_TASKS, 'tent');
vi.mock('../components/reis/useJourney', () => ({
  useJourney: () => ({
    goalDate: '2027-03-15', state: undefined, derived: {}, pick: undefined, tasks, progress: { done: 0, total: tasks.length },
    tick: () => {}, untick: () => {}, boots: { kind: 'none' }, setBoots: () => {},
  }),
}));
vi.mock('../components/reis/usePackList', () => ({ usePackList: () => ({ items: [] }) }));
vi.mock('../components/reis/ShelterCheck', () => ({ ShelterCheck: () => null }));
vi.mock('../state/AppDataContext', () => ({ useAppData: () => ({ settings: {} }) }));

const { JourneyPage } = await import('./Journey');
const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(JourneyPage)));

describe('de Reisplanner bij een late start', () => {
  it('begint met Nu regelen, niet met een voorbije maand', () => {
    const first = html.indexOf('Nu regelen');
    expect(first).toBeGreaterThan(-1);
    expect(html).toContain('Deze taken waren eerder aan de beurt.');
    expect(html).toContain('was aan de beurt tot');
    expect(html).not.toContain('nog open');
    expect(html).not.toMatch(/juli 2026/i);
    // De eerste maandgroep na Nu regelen is november of later.
    expect(html.indexOf('Nu regelen')).toBeLessThan(html.search(/november 2026|december 2026/i));
  });
});
