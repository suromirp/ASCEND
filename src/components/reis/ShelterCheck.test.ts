// Warden (15 november): de kaart "Je tocht staat op hutten. Klopt dat?" start bij Tent en Beide alleen een
// voorstel en verandert het doel nooit zelf; elk antwoord legt uiteindelijk vast dat het gevraagd is, maar bij
// Tent en Beide pas als de uitkomst er is (Akkoord of Liever niet). Nagemaakte stand.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import cardSrc from './ShelterCheck.tsx?raw';
import answerSrc from './shelterCheckAnswer.ts?raw';
import { describe, expect, it, vi } from 'vitest';
import { answerShelterCheck } from './shelterCheckAnswer';

describe('een antwoord op de vraag over hutten', () => {
  it('Klopt legt het meteen vast en start geen voorstel', () => {
    const recordAsked = vi.fn();
    const choose = vi.fn();
    answerShelterCheck('klopt', { recordAsked, choose });
    expect(recordAsked).toHaveBeenCalledTimes(1);
    expect(choose).not.toHaveBeenCalled();
  });

  for (const shelter of ['tent', 'both'] as const) {
    it(`${shelter}: alleen een voorstel, vastgelegd pas bij Akkoord of Liever niet`, () => {
      const recordAsked = vi.fn();
      let outcome: { onStored: () => void; onDeclined: () => void } | undefined;
      const choose = vi.fn((_s: string, o: { onStored: () => void; onDeclined: () => void }) => { outcome = o; });
      answerShelterCheck(shelter, { recordAsked, choose });
      expect(choose).toHaveBeenCalledWith(shelter, expect.anything());
      // Bij het tikken nog niets vastgelegd: mislukt het voorstel, dan blijft de vraag staan.
      expect(recordAsked).not.toHaveBeenCalled();
      outcome!.onStored();
      expect(recordAsked).toHaveBeenCalledTimes(1);
      outcome!.onDeclined();
      expect(recordAsked).toHaveBeenCalledTimes(2);
    });
  }
});

// De kaart zelf: de knoppen gaan naar het antwoord hierboven en raken het doel nooit rechtstreeks.
const updateGoal = vi.fn();
const updateSettings = vi.fn(() => Promise.resolve());
vi.mock('../../state/AppDataContext', () => ({
  useAppData: () => ({
    trainingGoals: [{ id: 'g1', name: 'Lange tocht', status: 'active', targetDate: '2027-03-15', kind: 'trek_hut', details: { shelter: 'hut' }, requirements: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-01T08:00:00Z' }],
    goalMilestones: [{ goalId: 'g1' }], settings: {}, updateSettings, updateGoal,
  }),
}));
vi.mock('../settings/useShelterChange', () => ({ useShelterChange: () => ({ choose: vi.fn(), note: null, busy: false, sheet: null }) }));

describe('de kaart', () => {
  it('staat er bij een tocht op hutten zonder eigen keuze, met de drie knoppen', async () => {
    const { ShelterCheck } = await import('./ShelterCheck');
    const html = renderToStaticMarkup(createElement(ShelterCheck));
    expect(html).toContain('Je tocht staat op hutten. Klopt dat?');
    for (const b of ['Klopt', 'Tent', 'Beide']) expect(html).toContain(`>${b}<`);
  });

  it('roept het doel nooit zelf aan: geen updateGoal, geen withShelter, geen opslag van doelen', () => {
    const src = cardSrc + answerSrc;
    expect(src).not.toMatch(/\bupdateGoal\b|\bwithShelter\b|TrainingGoalsRepo|putGoal|saveGoal/);
    // Tent en Beide gaan naar het voorstel (change.choose) via het antwoord.
    expect(cardSrc).toMatch(/choose: change\.choose/);
    expect(updateGoal).not.toHaveBeenCalled();
  });
});
