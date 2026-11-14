import { describe, expect, it } from 'vitest';
import guideSheet from './TrainingGuideSheet.tsx?raw';
import guideRow from './GuideRow.tsx?raw';
import watchSheet from './WatchSheet.tsx?raw';
import logger from './ExerciseLogger.tsx?raw';
import weekSheet from './SessionActionSheet.tsx?raw';
import missionCard from './TodayMissionCard.tsx?raw';
import forgeMenus from './forge/ForgeMenus.tsx?raw';
import briefingScreen from './TrainingBriefing.tsx?raw';

// Het uitlegblad van een training: elk onderblad gaat door Sheet (useSheetClose, sheetRef, SheetGrip),
// zodat de terugknop van het toestel eerst het onderblad sluit en daarna het uitlegblad. Een
// openklapdeel (Fold) kent geen laag in de terugknop en komt niet terug.
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };
const css = nodeFs.readFileSync(new URL('../index.css', import.meta.url), 'utf8');

describe('uitlegblad van een training', () => {
  it('klapt niets meer open in het blad', () => {
    expect(guideSheet).not.toContain('Fold');
    expect(guideSheet).not.toContain('aria-expanded');
  });

  // Zes werd vijf op 11 november: Stappen voor je Garmin verhuisde naar het blad Je horloge
  // (docs/beslissingen/2026-11-11-info-blad-horloge.md). Vijf werd bewust vier op 14 november: De stappen
  // staan op het trainingsscherm en in de Briefing (docs/beslissingen/2026-11-14-info-blad-a.md).
  it('elk onderblad is een Sheet met de eyebrow Uitleg', () => {
    expect((guideSheet.match(/<Sheet /g) ?? []).length).toBe(4);
    expect((guideSheet.match(/<Sheet eyebrow="Uitleg"/g) ?? []).length).toBe(4);
  });

  // Richting A (14 november): niets dubbel met het trainingsscherm. Weer, heuvels, route, kleding, Je tempo,
  // Zo voelt elk tempo, De stappen en de plekken staan niet meer in het blad, en er zijn geen groepskoppen.
  it('alleen wat je wilt begrijpen: niets van het trainingsscherm', () => {
    for (const weg of ['WeatherLine', 'HillsNearbyLine', 'RouteProposalLine', 'ClothingAdvice', 'paceLine', 'Zo voelt elk tempo', 'WorkoutSteps', '/plekken', 'useNavigate']) {
      expect(guideSheet, weg).not.toContain(weg);
    }
    expect(guideRow).not.toContain('Eyebrow');
  });

  it('weer, kleding, heuvels, tempo en plekken staan op het trainingsscherm', () => {
    for (const er of ['<WeatherLine', '<ClothingAdvice', '<HillsNearbyLine', '{myPace}', 'spotsPageFor(template.id)']) expect(logger, er).toContain(er);
    // De rij naar de plekken is een pagina: eerst het scherm dicht (concept bewaard), dan navigeren.
    expect(logger).toMatch(/closeSheet\(\); navigate\(spotsPageFor/);
  });

  it('elke ingang naar de uitleg heet Waarom deze training', () => {
    for (const src of [logger, weekSheet, missionCard, forgeMenus, briefingScreen]) {
      expect(src).not.toContain('Uitleg bij deze training');
      expect(src).not.toContain('Meer over deze training');
    }
    expect(logger).toContain('label="Waarom deze training"');
    expect(forgeMenus).toContain('title="Waarom deze training"');
  });

  it('het uitlegblad zelf gaat door useSheetClose met greep en ref', () => {
    expect(guideSheet).toContain('useSheetClose(onClose)');
    expect(guideSheet).toContain('ref={sheetRef}');
    expect(guideSheet).toContain('<SheetGrip />');
  });

  it('een rij die een blad opent laat het blad uit zich groeien, een pagina-rij niet', () => {
    expect(guideRow).toContain("data-sheet-from={row.page ? undefined : ''}");
  });

  it('geen eigen kleuren in de rij', () => {
    expect(guideRow).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

});

// Het blad Je horloge (docs/visie/Ontwerp Info-blad.md, spoor 1).
describe('blad Je horloge', () => {
  it('gaat door Sheet (useSheetClose, sheetRef, SheetGrip), ook het onderblad Zelf nabouwen met de eyebrow Uitleg', () => {
    expect((watchSheet.match(/<Sheet /g) ?? []).length).toBe(2);
    expect(watchSheet).toContain('<Sheet eyebrow="Uitleg"');
    expect(watchSheet).toContain("from './settings/Sheet'");
  });

  it('de stand komt uit WatchStatusRow, met zijn grens in tijd en zichtbare uitkomst', () => {
    expect(watchSheet).toContain('<WatchStatusRow');
  });

  it('rendert alleen: wat het blad toont komt uit engine/watchSheet', () => {
    expect(watchSheet).toContain("from '../engine/watchSheet'");
    expect(watchSheet).not.toMatch(/watchAdvice\(|watchKindOf\(/);
  });

  it('een rij naar een pagina sluit eerst alle lagen en navigeert daarna', () => {
    const body = watchSheet.slice(watchSheet.indexOf('function toPage'));
    const fn = body.slice(0, body.indexOf('}'));
    expect(fn.indexOf('onLeave()')).toBeGreaterThan(-1);
    expect(fn.indexOf('onLeave()')).toBeLessThan(fn.indexOf('navigate('));
  });

  it('Beweging: geen eigen animatie, dus de regels van Sheet; Uit zet alles meteen op de eindstand', () => {
    expect(watchSheet).not.toMatch(/animate-|mx-|transition/);
    expect(css).toContain("html[data-motion='off'] *");
    // Uitgroeien uit de rij (data-grow) is alleen in Normaal; in Rustig schuift het blad gewoon in.
    expect(css).toMatch(/\.animate-sheet-in\[data-grow\]/);
  });

  it('geen eigen kleuren', () => {
    expect(watchSheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('het trainingsscherm: knop Horloge, Uitleg achter de i, geen knop Info meer', () => {
    expect(logger).toContain('>Horloge</SecondaryButton>');
    expect(logger).toContain('label="Waarom deze training"');
    expect(logger).not.toContain('>Info</SecondaryButton>');
    // Naar een pagina sluit het trainingsscherm zonder het concept weg te gooien.
    expect(logger).toContain('onLeave={closeSheet}');
    expect(logger).not.toContain('onLeave={requestClose}');
  });

  it('de knop Horloge laat het blad uit zich groeien', () => {
    expect(logger).toMatch(/data-sheet-from=""><SecondaryButton onClick=\{\(\) => setShowWatch\(true\)\}/);
  });

  // Spoor 2: dezelfde rij in Week en op Vandaag, die hetzelfde blad opent.
  it('Week: de rij Je horloge in Andere keuzes, alleen voor een training die nog moet komen', () => {
    expect(weekSheet).toContain('<WatchSheet');
    expect(weekSheet).toContain('title={WATCH_SHEET_TEXT.row} sub={watchView.rowSub} sheetFrom');
    expect(weekSheet).toContain('watchView.hasWatchSheet && !skipped && session.scheduledDate >= today');
  });

  it('Vandaag: de rij Je horloge in het menu, het blad pas als het menu dicht is', () => {
    expect(missionCard).toContain('<WatchSheet');
    expect(missionCard).toContain('pick(() => setShowWatch(true))');
  });
});
