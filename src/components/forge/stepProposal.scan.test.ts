import { describe, expect, it } from 'vitest';

// Het stapvoorstel (StepProposalNotice.tsx): zacht erin met `mx-row-in` (240 ms, ease-out, een keer), in Rustig en
// Uit meteen op de eindstand; Liever niet links en Akkoord rechts met de gewone knoppen; geen kleur buiten de tokens.
const SOURCES = import.meta.glob<string>('./*.tsx', { query: '?raw', import: 'default', eager: true });
const read = (name: string): string => Object.entries(SOURCES).find(([p]) => p.endsWith(`/${name}`))?.[1] ?? '';

describe('het stapvoorstel in Forge', () => {
  const src = read('StepProposalNotice.tsx');

  // De klasse zelf (240 ms ease-out, in Rustig `animation: none`, in Uit alles stil) staat in src/index.css bij de
  // andere klassen zonder beweging; vitest leest CSS als lege tekst, dus hier alleen dat de kaart hem gebruikt.
  it('verschijnt met mx-row-in, geen eigen animatie', () => {
    expect(src).toContain('mx-row-in');
    expect(src).not.toMatch(/animate-|transition|style=\{\{[^}]*animation/);
  });

  it('Liever niet staat links van Akkoord, met de gewone knoppen', () => {
    const no = src.indexOf('>Liever niet</SecondaryButton>');
    const yes = src.indexOf('>Akkoord</SecondaryButton>');
    expect(no).toBeGreaterThan(0);
    expect(yes).toBeGreaterThan(no);
    expect(src).toContain('>Ongedaan maken</TextButton>');
  });

  it('geen losse kleur, geen gedachtestreepje en niets kleiner dan 12 px', () => {
    for (const name of ['StepProposalNotice.tsx', 'StepUndoRow.tsx']) {
      const s = read(name);
      expect(s, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
      expect(s, name).not.toMatch(/[\u2013\u2014]/);
      expect(s, name).not.toMatch(/text-\[(\d|1[01])px\]/);
    }
  });

  it('staat in Forge bovenaan, alleen voor het eerste afvinken en niet bij alleen kijken', () => {
    const forge = read('ForgeWorkout.tsx');
    expect(forge).toMatch(/const stepNotice = !readOnly && !startedAt && strength\.stepProposal;/);
    expect(read('ForgeIntro.tsx')).toContain('<StepProposalNotice templateId={templateId} date={date} />');
  });
});
