import { describe, expect, it } from 'vitest';
import guideSheet from './TrainingGuideSheet.tsx?raw';
import guideRow from './GuideRow.tsx?raw';

// Het uitlegblad van een training: elk onderblad gaat door Sheet (useSheetClose, sheetRef, SheetGrip),
// zodat de terugknop van het toestel eerst het onderblad sluit en daarna het uitlegblad. Een
// openklapdeel (Fold) kent geen laag in de terugknop en komt niet terug.
describe('uitlegblad van een training', () => {
  it('klapt niets meer open in het blad', () => {
    expect(guideSheet).not.toContain('Fold');
    expect(guideSheet).not.toContain('aria-expanded');
  });

  it('elk onderblad is een Sheet met de eyebrow Uitleg', () => {
    expect((guideSheet.match(/<Sheet /g) ?? []).length).toBe(6);
    expect((guideSheet.match(/<Sheet eyebrow="Uitleg"/g) ?? []).length).toBe(6);
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
