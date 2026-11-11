import { describe, expect, it } from 'vitest';
import missionCard from './TodayMissionCard.tsx?raw';
import briefingScreen from './TrainingBriefing.tsx?raw';

// Spoor 6 van de Briefing (docs/beslissingen/2026-11-11-briefing.md): op Vandaag één mint knop
// Briefing als je horloge afvinkt, Zelf invullen in het menu, en de routerij weg. Of het Briefing of
// Gedaan is, zegt één functie in de engine (engine/briefing.test.ts, missionButton).
describe('de knop Briefing op Vandaag', () => {
  it('Briefing of Gedaan komt uit missionButton, met de koppeling uit useWatchLink', () => {
    expect(missionCard).toContain("missionButton({ template, session, logs: sessionLogs, watchLink, watchSource }) === 'briefing'");
    expect(missionCard).toContain('useWatchLink()');
  });
  it('de routerij staat er alleen zonder de knop Briefing: de Briefing is de ingang', () => {
    expect(missionCard).toContain('{!briefingButton && <RouteProposalLine');
  });
  it('Zelf invullen staat in het menu en opent het bestaande formulier', () => {
    expect(missionCard).toMatch(/briefingButton && \([\s\S]*?pick\(\(\) => onLog\('full'\)\)[\s\S]*?BRIEFING_TEXT\.manual/);
  });
  it('de Briefing gaat door useSheetClose, en Zelf invullen kan pas op de dag zelf', () => {
    expect(briefingScreen).toContain('useSheetClose(onClose)');
    expect(briefingScreen).toContain('const manual = due ? onManual : undefined;');
  });
  it('geen hex- of rgba-kleuren en geen tekst onder 12 px in de Briefing', () => {
    expect(briefingScreen).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(briefingScreen).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
    expect(briefingScreen).not.toMatch(/\buppercase\b/);
  });
});
