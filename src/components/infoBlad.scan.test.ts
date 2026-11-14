import { describe, expect, it } from 'vitest';
import logger from './ExerciseLogger.tsx?raw';
import guideSheet from './TrainingGuideSheet.tsx?raw';

// Info-blad, rest (Pathfinder en Warden, 14 november): wat de engine niet kan toetsen omdat het in de component zit.
describe('Waarom deze training op het trainingsscherm', () => {
  it('de weerregels staan alleen buiten: achter placeIsOutdoor, zoals de Briefing', () => {
    expect(logger).toContain('const outdoor = placeIsOutdoor(template.id, chosenPlace);');
    // Het blok met weer, heuvels en kleding opent met de voorwaarde; geen van de drie staat erbuiten.
    const block = logger.slice(logger.indexOf('{outdoor && ('));
    expect(logger.indexOf('{outdoor && (')).toBeGreaterThan(0);
    const end = block.indexOf(')}');
    for (const line of ['<WeatherLine ', '<HillsNearbyLine ', '<ClothingAdvice ']) {
      expect(logger.split(line)).toHaveLength(2);
      expect(block.indexOf(line)).toBeGreaterThan(0);
      expect(block.indexOf(line)).toBeLessThan(end);
    }
  });

  it('knop, i en onderbladen heten zoals het blad: geen "Uitleg" meer', () => {
    expect(logger).not.toMatch(/>Uitleg</);
    expect(logger.match(/>Waarom deze training<\/SecondaryButton>/g)).toHaveLength(2);
    expect(guideSheet).not.toContain('eyebrow="Uitleg"');
    expect(guideSheet.match(/eyebrow="Waarom deze training"/g)).toHaveLength(4);
  });
});
