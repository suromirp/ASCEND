import { describe, expect, it } from 'vitest';
import line from './RouteProposalLine.tsx?raw';
import missionCard from './TodayMissionCard.tsx?raw';
import guideSheet from './TrainingGuideSheet.tsx?raw';
import logger from './ExerciseLogger.tsx?raw';
import evening from './useEveningBefore.ts?raw';

// Route alleen buiten en te voet, op elke plek (Pathfinder, 11 november): Loopband gekozen geeft geen route
// op Vandaag, in het blad achter de i, op het trainingsscherm of in De avond ervoor. Alle plekken lopen
// via RouteProposalLine of EveningInput en dus via engine/trainingPlace.ts#routeShownFor.
describe('de route volgt de keuze Waar train je? overal', () => {
  it('RouteProposalLine leest de bewaarde keuze en gebruikt de regel van de engine, nooit alleen de training', () => {
    expect(line).toContain('useTrainingPlaces()');
    expect(line).toContain('routeShownFor(');
    expect(line).not.toMatch(/wantsRoute\(/);
    // Zolang de keuzes niet gelezen zijn: geen route.
    expect(line).toContain('if (!places) return null;');
  });
  it('Vandaag en het blad achter de i tonen de route alleen via RouteProposalLine', () => {
    for (const src of [missionCard, guideSheet]) {
      expect(src).toContain('<RouteProposalLine');
      expect(src).not.toMatch(/wantsRoute(At)?\(/);
      expect(src).not.toContain('<RoutePanel');
    }
  });
  it('het trainingsscherm geeft zijn eigen keuze mee', () => {
    expect(logger).toMatch(/<RouteProposalLine[^>]*place=\{/);
  });
  it('het concept bewaart de keuze alleen als je hem zelf tikte (Warden)', () => {
    expect(logger).toContain('modalityKey: placeTouched.current ? modalityKey : undefined');
  });
  it('De avond ervoor krijgt de bewaarde keuzes', () => {
    expect(evening).toContain('trainingPlaces');
    expect(evening).toContain('useTrainingPlaces()');
  });
});
