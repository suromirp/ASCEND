import { describe, expect, it } from 'vitest';
import briefingScreen from './TrainingBriefing.tsx?raw';
import actionSheet from './SessionActionSheet.tsx?raw';
import missionCard from './TodayMissionCard.tsx?raw';

// Sporen 1 tot 4 van docs/visie/Ontwerp trainingsscherm minimaal.md: wat de engine niet kan toetsen omdat het in
// het scherm zit. Wat erop staat zegt engine/briefing.ts (briefing.test.ts).
describe('het ene scherm vooraf', () => {
  it('spoor 1: het blad in Week opent de Briefing in plaats van Hoe je het doet, ook op een dag die voorbij is', () => {
    expect(actionSheet).toContain('main: entryAction(planned.main, template), rows: planned.rows.map((a) => entryAction(a, template))');
    // Vandaag al doen voor een training te voet gaat meteen naar het invullen, niet naar het oude scherm met uitleg.
    expect(actionSheet).toContain("else if (doTodayOpens(template) === 'log') (onLog ?? onStart)('full');");
  });
  it('Vandaag: de Briefing is voor elke training te voet bereikbaar, ook zonder koppeling (de naam en Meer keuzes)', () => {
    expect(missionCard).toContain('const briefingReach = !quickComplete && briefingEntry(template);');
    expect(missionCard).toContain('{briefingReach ? (');
    expect(missionCard).toMatch(/briefingReach && !briefingButton && \([\s\S]*?pick\(\(\) => setShowBriefing\(true\)\)[\s\S]*?BRIEFING_TEXT\.title/);
    expect(missionCard).toContain('|| briefingButton || briefingReach;');
  });
  it('spoor 2: de hartkaart met de kerngetallen en de zonebalk of het profiel; geen vak Wat je loopt', () => {
    expect(briefingScreen).toContain('<KeyNumbers facts={heart.facts} />');
    expect(briefingScreen).toContain('<ZoneBar active={heart.zone}');
    expect(briefingScreen).toContain('<IntervalProfile plan={plan} />');
    expect(briefingScreen).not.toContain('RunDetail');
    // "Zone 2." in gewone inkt, halfvet: geen mint woord in een zin.
    expect(briefingScreen).toContain('<span className="font-semibold">Zone {heart.zone}.</span>');
  });
  it('spoor 3: één lijst zonder kopje, de onderbalk met hoogstens één knop en geen knop Horloge', () => {
    expect(briefingScreen).toContain('<BriefingRows rows={view.rows} onOpen={openRow} />');
    expect(briefingScreen).not.toContain('SecondaryButton');
    expect(briefingScreen).not.toContain('StretchRow');
    expect(briefingScreen).not.toContain('grid-cols-2');
    expect(briefingScreen).toMatch(/\{footer && \(\s*<div className="fixed inset-x-0 bottom-0/);
  });
  it('spoor 3: elke rij is minstens 44 px hoog; opwarmen en rekken staan in een blad', () => {
    expect(briefingScreen).toContain("const cls = 'flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left';");
    expect(briefingScreen).toContain("{sheet === 'stretch' && (");
  });
  it('spoor 4: de stopregels zonder kaart en zonder amber kop; amber is alleen de stip', () => {
    expect(briefingScreen).not.toContain('<Eyebrow tone="var(--color-warning)"');
    expect(briefingScreen).toContain('<Eyebrow tone="var(--color-ink-dim)">{BRIEFING_TEXT.stop}</Eyebrow>');
    expect(briefingScreen).toContain('<StopSignals signals={view.stopSignals} quiet />');
  });
  it('spoor 4: de regel onder de chips staat er alleen als de engine hem geeft', () => {
    expect(briefingScreen).toContain('{view.placeLine && <p');
  });
  it('elk nieuw blad gaat door TodaySheet (useSheetClose, greep): terug sluit laag voor laag', () => {
    for (const s of ["sheet === 'steps'", "sheet === 'fuel'", "sheet === 'stretch'"]) {
      const at = briefingScreen.indexOf(s);
      expect(at).toBeGreaterThan(0);
      expect(briefingScreen.slice(at, at + 200)).toContain('<TodaySheet');
    }
  });
});
