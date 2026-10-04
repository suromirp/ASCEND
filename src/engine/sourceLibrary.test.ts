import { describe, it, expect } from 'vitest';
import { buildSourceLibrary, searchSources } from './sourceLibrary';

describe('buildSourceLibrary', () => {
  const library = buildSourceLibrary((id) => ({ tpl_easy_run: 'Easy Run', tpl_long_run: 'Lange Duurloop' } as Record<string, string>)[id] ?? id);

  it('collects every cited source once, by URL, with where it is used', () => {
    const urls = library.map((s) => s.url).filter(Boolean);
    expect(new Set(urls.map((u) => u!.replace(/\/+$/, '').toLowerCase())).size).toBe(urls.length);
    const easy = library.find((s) => s.usedIn.includes('Trainingsgids: Easy Run'));
    expect(easy).toBeDefined();
  });

  it('merges a guide source with its evidence registry entry (study type, year, rule)', () => {
    const spike = library.find((s) => s.url?.includes('40623829'));
    expect(spike?.meta).toMatch(/Cohortstudie · 2025/);
    expect(spike?.usedIn).toContain('Planningsregel: geen loop veel langer dan je langste van de laatste maand');
  });

  it('never lists a bare site front page as a source', () => {
    expect(library.some((s) => s.url?.replace(/\/+$/, '') === 'https://pubmed.ncbi.nlm.nih.gov')).toBe(false);
  });

  it('searches titles, publishers and where a source is used', () => {
    expect(searchSources(library, 'easy run').length).toBeGreaterThan(0);
    expect(searchSources(library, '', 'garmin').every((s) => s.category === 'garmin')).toBe(true);
  });
});
