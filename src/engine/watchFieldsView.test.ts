import { describe, expect, it } from 'vitest';
import { WATCH_MODELS } from '../data/watchModels';
import {
  WATCH_LABEL_SIZE,
  cellAriaLabel,
  cellDrawing,
  fieldHint,
  labelLines,
  pageDotLabel,
  pageScrollBehavior,
  replacedLine,
  resolveVersion,
  textWidth,
  watchPageState,
} from './watchFields';

const model = WATCH_MODELS.fr255;

describe('de pagina: welke stand', () => {
  it('instelling uit: de kaart "staan uit", ook bij een soort met advies', () => {
    expect(watchPageState({ watchFieldsShown: false }, 'zone2', model)).toBe('off');
  });
  it('een soort zonder advies of een onbekende soort: de lege stand', () => {
    expect(watchPageState({}, undefined, model)).toBe('noAdvice');
    expect(watchPageState({}, 'kracht', model)).toBe('noAdvice');
  });
  it('anders staat het horloge er', () => {
    expect(watchPageState({}, 'zone2', model)).toBe('ready');
    expect(watchPageState({ watchFieldsShown: true }, 'packHike', model)).toBe('ready');
  });
});

describe('vervangen velden', () => {
  it('geen regel bij nul, enkelvoud en meervoud', () => {
    expect(replacedLine(0)).toBeUndefined();
    expect(replacedLine(1)).toBe('1 veld bestaat niet op dit horloge en is vervangen.');
    expect(replacedLine(2)).toBe('2 velden bestaan niet op dit horloge en zijn vervangen.');
  });
  it('een bewaard veld dat het model niet kent geeft de regel', () => {
    const store = { zone2: { v2: { pages: [['heartRate', 'bestaatNiet'], ['distance']] } } };
    const resolved = resolveVersion(store, 'zone2', 'v2', model)!;
    expect(replacedLine(resolved.replaced)).toBe('1 veld bestaat niet op dit horloge en is vervangen.');
  });
});

describe('teksten', () => {
  it('het label van een tikknop en een puntje', () => {
    expect(cellAriaLabel(0, 1, 'Afstand')).toBe('Pagina 1, veld 2, Afstand. Tik om te veranderen.');
    expect(pageDotLabel(1, 3)).toBe('Pagina 2 van 3');
  });
  it('de regel bij een veld: uitleg, borstband, alleen bij lopen of workout', () => {
    expect(fieldHint({ id: 'a', group: 'other', label: 'A' })).toBeUndefined();
    expect(fieldHint({ id: 'a', group: 'other', label: 'A', note: 'Uitleg.', needs: 'dynamics-accessory' })).toBe('Uitleg. Vraagt een borstband met loopdynamiek of een pod.');
    expect(fieldHint({ id: 'a', group: 'other', label: 'A', only: 'run' })).toBe('Alleen bij hardlopen.');
    expect(fieldHint({ id: 'a', group: 'other', label: 'A', only: 'workout' })).toBe('Alleen in een gestuurde workout.');
  });
});

describe('beweging bij het wisselen van pagina', () => {
  it('vloeiend alleen op Normaal; Rustig en Uit springen naar de eindstand', () => {
    expect(pageScrollBehavior('full')).toBe('smooth');
    expect(pageScrollBehavior('calm')).toBe('auto');
    expect(pageScrollBehavior('off')).toBe('auto');
  });
});

describe('de tekening van een plek', () => {
  it('de langste labels breken in de smalste plek en lopen er niet uit', () => {
    for (const label of ['L. ronde hartslag %max', 'Gem. vert. oscillatie']) {
      const lines = labelLines(label, 126);
      expect(lines.length).toBe(2);
      for (const l of lines) expect(textWidth(l, WATCH_LABEL_SIZE)).toBeLessThanOrEqual(126 - 16);
    }
  });

  it('een kort label blijft op één regel', () => {
    expect(labelLines('Afstand', 126)).toEqual(['Afstand']);
  });

  it('elk veld in elke plek van elke indeling: tekst past in de plek, op minstens 14 eenheden', () => {
    for (const [count, layout] of Object.entries(model.layouts)) {
      for (const cell of layout.cells) {
        for (const field of model.fields) {
          const d = cellDrawing(cell, field);
          const where = `${count} velden, ${field.id}, plek ${cell.w} breed`;
          expect(d.labelLines.length, where).toBeLessThanOrEqual(2);
          d.labelLines.forEach((l, i) => {
            const est = textWidth(l, WATCH_LABEL_SIZE);
            const fit = d.labelFit[i];
            if (fit === undefined) expect(est, where).toBeLessThanOrEqual(cell.w - 16);
            // Een woord dat niet breekt wordt ingekort, maar nooit tot minder dan drie kwart.
            else expect(fit / est, where).toBeGreaterThanOrEqual(0.75);
          });
          if (d.value) {
            expect(d.valueSize, where).toBeGreaterThanOrEqual(20);
            const unit = d.unit ? 4 + textWidth(d.unit, WATCH_LABEL_SIZE) : 0;
            expect(textWidth(d.value, d.valueSize, 0.64) + unit, where).toBeLessThanOrEqual(cell.w - 16);
          } else {
            expect(d.bars, where).toHaveLength(3);
          }
          // Alles blijft binnen de plek, boven en onder.
          expect(d.labelY[0] - 12, where).toBeGreaterThanOrEqual(cell.y);
          expect(d.valueY, where).toBeLessThanOrEqual(cell.y + cell.h);
        }
      }
    }
  });

  it('een veld met een voorbeeld tekent een getal, een meter drie staafjes', () => {
    const cell = model.layouts[1].cells[0];
    const withSample = model.fields.find((f) => f.sample)!;
    const without = model.fields.find((f) => !f.sample)!;
    expect(without).toBeDefined();
    expect(cellDrawing(cell, withSample).bars).toBeUndefined();
    expect(cellDrawing(cell, without).bars).toHaveLength(3);
  });
});
