import { describe, expect, it } from 'vitest';
import guideSheet from './TrainingGuideSheet.tsx?raw';
import watchSheet from './WatchSheet.tsx?raw';

// Info-blad, rest (Pathfinder en Warden, 14 november): wat de engine niet kan toetsen omdat het in de component zit.
// Het trainingsscherm zelf (weer alleen buiten, de knoppen) is gerenderd getest in exerciseLogger.render.test.ts.
describe('Waarom deze training en Je horloge: geen "Uitleg" meer', () => {
  it('de onderbladen van Waarom deze training heten zoals het blad', () => {
    expect(guideSheet).not.toContain('eyebrow="Uitleg"');
    expect(guideSheet.match(/eyebrow="Waarom deze training"/g)).toHaveLength(4);
  });

  it('het onderblad Zelf nabouwen in Je horloge draagt de naam van het blad (I-9)', () => {
    expect(watchSheet).not.toContain('eyebrow="Uitleg"');
    expect(watchSheet).toContain('<Sheet eyebrow={WATCH_SHEET_TEXT.title} title={WATCH_SHEET_TEXT.manual}');
  });
});
