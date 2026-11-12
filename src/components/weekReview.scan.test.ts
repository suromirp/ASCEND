// Het blad Je week tot nu (docs/visie/Ontwerp Je week tot nu.md, besluit 2026-11-12-je-week-tot-nu): de vaste
// regels op de bron. Bij Beweging Rustig en Uit staat het blad netjes op zijn eindstand: het heeft geen eigen
// beweging naast het in- en uitschuiven van useSheetClose, en het wisselen naar een weergave beweegt niet.
import { describe, expect, it } from 'vitest';
import sheet from './WeekReview.tsx?raw';
import glance from '../engine/weekGlance.ts?raw';
import hook from './useMountainMuscleProposal.ts?raw';
import forgeIntro from './forge/ForgeIntro.tsx?raw';
import notice from './MountainMuscleNotice.tsx?raw';

describe('Je week tot nu, de bron', () => {
  it('geen eigen beweging: alleen het blad en de achtergrond in en uit', () => {
    const anims = new Set(sheet.match(/animate-[a-z-]+/g));
    expect([...anims].sort()).toEqual(['animate-backdrop-in', 'animate-backdrop-out', 'animate-sheet-in', 'animate-sheet-out']);
    expect(sheet).not.toMatch(/transition|@keyframes|requestAnimationFrame/);
  });

  it('het blad gaat door useSheetClose, met ref={sheetRef} en SheetGrip', () => {
    expect(sheet).toContain('useSheetClose(onClose)');
    expect(sheet).toContain('ref={sheetRef}');
    expect(sheet).toContain('<SheetGrip />');
  });

  it('één mint knop: Akkoord in de weergave Voorstel, met Liever niet links ervan', () => {
    expect(sheet.match(/<PrimaryButton/g)).toHaveLength(1);
    const liever = sheet.indexOf('>Liever niet</SecondaryButton>');
    const akkoord = sheet.indexOf('>Akkoord</PrimaryButton>');
    expect(liever).toBeGreaterThan(0);
    expect(akkoord).toBeGreaterThan(liever);
  });

  it('alleen tokens, niets kleiner dan 12 px, geen hoofdletters als opmaak', () => {
    expect(sheet + glance).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(sheet).not.toMatch(/uppercase|text-\[(?:[0-9]|1[01])px\]|text-\[0?\.\d+rem\]/);
  });

  it('de regel "hard" en de oude koppen staan niet meer in het blad', () => {
    expect(sheet).not.toMatch(/effortLine|Wat telt|weeklyCheckLine|weekSummaryLine/);
    expect(sheet).not.toMatch(/<Eyebrow>Kracht voor de berg/);
  });

  it('geen voorstel, geen rij: de rij Voorstel staat er alleen met een voorstel, als eerste rij', () => {
    expect(sheet).toContain("{muscle.proposal && muscle.text && <SheetRow title={muscle.state === 'done' ? 'Toegevoegd' : 'Voorstel'}");
    expect(sheet.indexOf("'Voorstel'}")).toBeLessThan(sheet.indexOf('title="Je trainingen"'));
  });

  it('geen "een paar minuten": de app kent de duur van de oefening niet', () => {
    expect(sheet + glance + hook).not.toMatch(/paar minuten/);
  });

  it('geen gedachtestreepjes', () => {
    expect(sheet + glance).not.toMatch(/[–—]/);
  });

  it('Forge en het blad: dezelfde hook en dezelfde week, zonder eigen weekStart', () => {
    expect(hook).toContain('const weekStart = muscleProposalWeek(todayISO());');
    expect(forgeIntro).not.toMatch(/weekStart/);
    expect(notice).toContain('useMountainMuscleProposal({ onlyFor })');
    expect(sheet).toContain('useMountainMuscleProposal({ active: reviewShowsMuscleProposal(review.weekStart, today) })');
  });
});
