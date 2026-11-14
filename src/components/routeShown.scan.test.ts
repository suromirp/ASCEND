import { describe, expect, it } from 'vitest';
import line from './RouteProposalLine.tsx?raw';
import missionCard from './TodayMissionCard.tsx?raw';
import guideSheet from './TrainingGuideSheet.tsx?raw';
import logger from './ExerciseLogger.tsx?raw';
// De toestand en het concept van het formulier staan sinds Hoe ging het? in een gedeelde hook.
import logForm from './logForm/useLogForm.ts?raw';
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
  it('Vandaag toont de route alleen via RouteProposalLine', () => {
    expect(missionCard).toContain('<RouteProposalLine');
    expect(missionCard).not.toMatch(/wantsRoute(At)?\(/);
    expect(missionCard).not.toContain('<RoutePanel');
  });
  // Bewust mee (14 november, docs/beslissingen/2026-11-14-info-blad-a.md): het blad achter de i (Waarom deze
  // training) toont geen route meer; die staat op het trainingsscherm en in de Briefing.
  it('het blad achter de i toont geen route', () => {
    expect(guideSheet).not.toContain('<RouteProposalLine');
    expect(guideSheet).not.toMatch(/wantsRoute(At)?\(/);
    expect(guideSheet).not.toContain('<RoutePanel');
  });
  it('het trainingsscherm geeft zijn eigen keuze mee', () => {
    expect(logger).toMatch(/<RouteProposalLine[^>]*place=\{/);
  });
  it('het concept bewaart de keuze alleen als je hem zelf tikte (Warden)', () => {
    expect(logForm).toContain('modalityKey: placeTouched.current ? modalityKey : undefined');
  });
  it('De avond ervoor krijgt de bewaarde keuzes', () => {
    expect(evening).toContain('trainingPlaces');
    expect(evening).toContain('useTrainingPlaces()');
  });
});
