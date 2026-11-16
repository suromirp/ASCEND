import { describe, expect, it } from 'vitest';
import briefingScreen from './TrainingBriefing.tsx?raw';
import missionCard from './TodayMissionCard.tsx?raw';
import actionSheet from './SessionActionSheet.tsx?raw';
import todayPage from '../pages/Today.tsx?raw';
import weekPage from '../pages/Week.tsx?raw';

// Terug vanaf een pagina die je uit de Briefing opende brengt je weer in de Briefing (I-37). Wanneer
// dat geldt staat in engine/briefingReturn.test.ts; hier alleen dat de schermen het doorgeven.
describe('Terug naar de Briefing', () => {
  it('de Briefing laat het merkteken achter voordat hij naar een pagina gaat', () => {
    const toPage = briefingScreen.slice(briefingScreen.indexOf('function toPage('));
    expect(toPage.indexOf('markBriefingReturn(')).toBeGreaterThan(-1);
    expect(toPage.indexOf('markBriefingReturn(')).toBeLessThan(toPage.indexOf('navigate(to'));
  });
  it('de missiekaart en het blad zeggen welke laag de Briefing opende', () => {
    expect(missionCard).toContain('origin="mission"');
    expect(missionCard).toContain("useBriefingReturn('mission'");
    expect(actionSheet).toContain('origin="sheet"');
    expect(actionSheet).toContain('useState(openBriefing)');
  });
  it('Vandaag en Week openen het blad weer met de Briefing erover', () => {
    for (const page of [todayPage, weekPage]) {
      expect(page).toContain("useBriefingReturn('sheet'");
      expect(page).toMatch(/openBriefing=\{briefingFor === \w+\.id\}/);
    }
  });
});
