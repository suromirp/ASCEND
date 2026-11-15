import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { draftKey, saveDraft } from '../utils/loggerDraft';

// Het oude trainingsscherm (ExerciseLogger.tsx), echt gerenderd zonder DOM, in plaats van een bronscan (I-9, I-32).
// Weer, heuvels en kleding zijn hier merktekens: getest wordt alleen of het scherm ze toont. Alles nagemaakt.
vi.mock('./Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('./WeatherLine', () => ({ WeatherLine: () => createElement('i', null, 'merk-weer') }));
vi.mock('./HillsNearbyLine', () => ({ HillsNearbyLine: () => createElement('i', null, 'merk-heuvels') }));
vi.mock('./ClothingAdvice', () => ({ ClothingAdvice: () => createElement('i', null, 'merk-kleding') }));
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({ logSession: async () => true, reportStorageError: () => undefined, settings: {}, weather: {}, sessionLogs: [], strengthExternal: false, templates: [], plannedSessions: [] }),
}));

const { ExerciseLogger } = await import('./ExerciseLogger');
const { templates, program } = buildDefaultProgramData();
const bike = templates.find((t) => t.id === 'tpl_bike')!;
// Herstel: een gids (Waarom deze training) en geen workout voor je horloge.
const rest = templates.find((t) => t.id === 'tpl_herstel')!;
const TODAY = '2026-11-12';

const store = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  store.clear();
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const render = (extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ExerciseLogger, { template: bike, scheduledDate: TODAY, program, onClose: () => undefined, ...extra })));

describe('het oude trainingsscherm: weer, heuvels en kleding alleen buiten', () => {
  it('buiten (geen plek gekozen telt als buiten): alle drie', () => {
    const html = render();
    for (const mark of ['merk-weer', 'merk-heuvels', 'merk-kleding']) expect(html).toContain(mark);
  });

  it('binnen (op de fietstrainer): geen van de drie', () => {
    saveDraft(draftKey('tpl_bike', undefined, TODAY), { modalityKey: 'bike_indoor', guidanceMode: 'ascend_guided' });
    const html = render();
    for (const mark of ['merk-weer', 'merk-heuvels', 'merk-kleding']) expect(html).not.toContain(mark);
  });
});

describe('het oude trainingsscherm: de knoppen onderaan', () => {
  it('Waarom deze training naast Gedaan, invullen: de hoofdknop houdt zijn regel, de andere neemt de rest (I-9)', () => {
    const html = render({ template: rest });
    const why = html.match(/<button[^>]*>Waarom deze training<\/button>/)?.[0] ?? '';
    expect(why).not.toBe('');
    // Geen vaste breedte meer: hij deelt de ruimte en mag op 360 px in twee regels.
    expect(why).not.toContain('flex-none');
    expect(why).toContain('leading-tight');
    expect(html).toMatch(/<div class="flex min-w-max flex-1"><button[^>]*mx-primary[^>]*>.*Gedaan, invullen/);
    expect(html).not.toContain('>Uitleg<');
  });

  it('vooruitkijken: Waarom deze training en Sluiten, geen formulier', () => {
    const html = render({ template: rest, preview: true });
    expect(html).toMatch(/>Waarom deze training<\/button>/);
    expect(html).toContain('>Sluiten<');
    expect(html).not.toContain('Gedaan, invullen');
  });

  it('met een workout voor je horloge: de knop Horloge groeit het blad uit zich, de i heet Waarom deze training', () => {
    const html = render();
    expect(html).toMatch(/<div class="flex flex-none" data-sheet-from=""><button[^>]*>Horloge<\/button><\/div>/);
    expect(html).toContain('aria-label="Waarom deze training"');
    expect(html).not.toContain('>Info<');
    expect(html).not.toContain('>Waarom deze training</button>');
  });
});
