import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WATCH_MODELS } from '../../data/watchModels';
import { WatchFace } from './WatchFace';

const model = WATCH_MODELS.fr255;

// De bestanden van de datavelden: componenten en de pagina. Ruwe tekst, zodat de scans niets hoeven te draaien.
const FILES = {
  ...import.meta.glob<string>('./*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../../pages/WatchFields.tsx', { query: '?raw', import: 'default', eager: true }),
};
// Vitest leest CSS als leeg (?raw geeft niets), dus de stijlen gaan via het bestandssysteem. De naam is
// samengesteld omdat het project geen Node-typen meldt.
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };
const CSS = nodeFs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

describe('de tekening van het horloge', () => {
  const html = (fields: string[], selected?: number) =>
    renderToStaticMarkup(createElement(WatchFace, { model, fields, page: 0, selected, onPick: () => {} }));

  it('elke plek heeft een echte knop met het label uit het ontwerp', () => {
    const out = html(['heartRate', 'distance', 'timer']);
    expect(out).toContain('aria-label="Pagina 1, veld 1, Hartslag. Tik om te veranderen."');
    expect(out).toContain('aria-label="Pagina 1, veld 2, Afstand. Tik om te veranderen."');
    expect(out.match(/<button/g)).toHaveLength(3);
    expect(out.match(/min-width:44px/g)).toHaveLength(3);
  });

  it('de mint rand staat alleen om het geselecteerde veld', () => {
    expect(html(['heartRate', 'distance']).includes('var(--color-action)')).toBe(false);
    expect(html(['heartRate', 'distance'], 1).match(/var\(--color-action\)/g)).toHaveLength(1);
  });

  it('een meter tekent staafjes in plaats van een getal', () => {
    const meter = model.fields.find((f) => !f.sample)!;
    expect(html([meter.id])).toContain('<rect');
  });

  it('de tekening heeft de maat en kleuren van het ontwerp', () => {
    const out = html(['heartRate']);
    expect(out).toContain('viewBox="0 0 288 288"');
    expect(out).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});

describe('de bestanden van de datavelden', () => {
  it('vindt de bestanden', () => {
    expect(Object.keys(FILES).length).toBeGreaterThanOrEqual(5);
  });

  it('geen hex of rgba: alleen tokens', () => {
    for (const [file, src] of Object.entries(FILES)) {
      expect(src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [], file).toEqual([]);
    }
  });

  it('geen gedachtestreepjes en geen PrimaryButton', () => {
    for (const [file, src] of Object.entries(FILES)) {
      expect(/[–—]/.test(src), file).toBe(false);
      expect(src.includes('PrimaryButton'), file).toBe(false);
    }
  });

  it('elke animatieklasse bestaat en heeft een regel onder Rustig en Uit', () => {
    for (const [file, src] of Object.entries(FILES)) {
      for (const m of src.matchAll(/\b(mx-(?!auto\b|\d)[a-z0-9-]+)\b/g)) {
        const name = m[1];
        expect(CSS.includes(`.${name}`), `${file} ${name}`).toBe(true);
        expect(CSS.includes(`html[data-motion='calm'] .${name}`), `${file} ${name} calm`).toBe(true);
      }
      // Geen eigen transitie of animatie in de componenten: alles loopt via de klassen van index.css.
      expect(/\btransition\s*:|\banimation\s*:/.test(src), file).toBe(false);
    }
  });

  it('de pagina zegt wat het ontwerp zegt', () => {
    const page = Object.entries(FILES).find(([f]) => f.endsWith('WatchFields.tsx'))![1];
    for (const text of [
      'Datavelden staan uit.',
      'Zet ze aan bij Instellingen.',
      'Naar Instellingen',
      'Voor deze training is er geen advies.',
      'Kies een soort die erop lijkt.',
      'Begin met een kopie van het advies',
      'Opslaan lukte niet. Probeer het opnieuw.',
      'Teruggezet.',
      'De cijfers zijn voorbeelden.',
      'Anders dan het advies',
    ]) {
      expect(page.includes(text), text).toBe(true);
    }
  });
});
