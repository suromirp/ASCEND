import { describe, expect, it } from 'vitest';
import reset from './useAdviceReset.tsx?raw';
import overview from '../../pages/settings/SettingsOverview.tsx?raw';
import sports from '../../pages/settings/SportsPage.tsx?raw';

// Backlog Q: de schermen gebruiken het pad met Akkoord en de eigen waarde (de logica zelf is getest in
// engine/settingsDiff.test.ts, engine/settingsSummary.test.ts en storage/adviceResetPlan.test.ts).
describe('instellingen: terugzetten, zoeken en kracht', () => {
  it('terugzetten vraagt altijd eerst (alwaysAsk), ook bij Kleine wijzigingen automatisch', () => {
    expect(reset).toMatch(/changeSetting\([\s\S]*alwaysAsk: true/);
    expect(reset).not.toMatch(/updateSettings\(planPatch/);
  });

  it('het zoekveld leest de waarde van de instelling zelf, niet die van de rij eromheen', () => {
    expect(overview).toContain('searchResultValue(item.id, facts)');
    expect(overview).not.toMatch(/searchValue\(placement\.row/);
  });

  it('kracht aan of uit gaat via het voorstel, nooit rechtstreeks in de instellingen', () => {
    expect(sports).toContain('plan.toggleStrength(');
    expect(sports).not.toMatch(/updateSettings\(\{ strengthTraining/);
  });
});
