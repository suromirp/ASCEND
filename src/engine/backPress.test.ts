import { describe, expect, it } from 'vitest';
import { backPressDecision, EXIT_WINDOW_MS } from './backPress';

const base = { layerOpen: false, atHome: false, canGoBack: true, lastPressAt: undefined, now: 10_000 };

describe('de terugknop van Android', () => {
  it('sluit eerst een open blad of overlay, ook op Vandaag', () => {
    expect(backPressDecision({ ...base, layerOpen: true })).toBe('back');
    expect(backPressDecision({ ...base, layerOpen: true, atHome: true })).toBe('back');
  });
  it('gaat op een andere pagina terug zoals de browser', () => {
    expect(backPressDecision(base)).toBe('back');
  });
  it('zonder stap terug gaat hij naar Vandaag in plaats van de app te sluiten', () => {
    expect(backPressDecision({ ...base, canGoBack: false })).toBe('home');
  });
  it('op Vandaag: eerst een melding, de tweede druk binnen twee seconden sluit de app', () => {
    expect(backPressDecision({ ...base, atHome: true })).toBe('warn');
    expect(backPressDecision({ ...base, atHome: true, lastPressAt: 10_000 - 1500 })).toBe('exit');
    expect(backPressDecision({ ...base, atHome: true, lastPressAt: 10_000 - EXIT_WINDOW_MS - 1 })).toBe('warn');
  });
});
