// De avond ervoor bij Beweging Rustig en Uit: de kaart heeft geen eigen beweging, dus hij staat er meteen
// op zijn eindstand, wat Beweging ook is (docs/beslissingen/2026-11-11-avond-ervoor.md). Ook de vaste
// regels: alleen tokens, geen uppercase, geen gedachtestreepjes, geen tweede accent.
import { describe, expect, it } from 'vitest';
import card from './EveningBeforeCard.tsx?raw';
import engine from '../engine/eveningBefore.ts?raw';

describe('De avond ervoor, de kaart', () => {
  it('beweegt niet: in Rustig en Uit dus netjes op de eindstand', () => {
    expect(card).not.toMatch(/animate-|transition|@keyframes|requestAnimationFrame/);
  });
  it('alleen tokens, geen hex of rgba, geen mint of uppercase', () => {
    expect(card).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(card).not.toMatch(/--color-action|--color-mint|uppercase/);
  });
  it('geen gedachtestreepjes in de teksten', () => {
    expect(card + engine).not.toMatch(/[–—]/);
  });
});
