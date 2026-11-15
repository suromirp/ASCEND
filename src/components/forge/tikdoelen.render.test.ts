import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RirBubble, TickBox } from './parts';
import blockSource from './ExerciseBlock.tsx?raw';

// Tikdoelen in Forge zijn een echte knop van 44 bij 44 px, zoals InfoButton: de knop zelf is h-11 w-11 en een
// negatieve marge houdt de rij zoals hij was. Een onzichtbaar ::before telt niet: Lookout meet de knop zelf.
// Tailwind: h-11 = 44 px, -m-1.5 = 6 px, -m-2.5 = 10 px, h-8 = 32 px, h-6 = 24 px.
const PX: Record<string, number> = { '1.5': 6, '2.5': 10 };
const buttonClass = (html: string) => /<button[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';

function layoutSize(cls: string, face: number) {
  const m = /(?:^|\s)-m-(\d(?:\.\d)?)(?:\s|$)/.exec(cls);
  return 44 - 2 * (m ? PX[m[1]] : 0) === face;
}

describe('tikdoelen in Forge', () => {
  it('het afvinkvakje is 44 bij 44 en neemt in de rij 32 px in', () => {
    const cls = buttonClass(renderToStaticMarkup(createElement(TickBox, { done: false, onClick: () => undefined, label: 'Set 1 gedaan' })));
    expect(cls).toMatch(/\bh-11\b/);
    expect(cls).toMatch(/\bw-11\b/);
    expect(layoutSize(cls, 32)).toBe(true);
    expect(cls).not.toMatch(/before:/);
  });

  it('de RIR-knop is 44 bij 44 en neemt in de rij 24 px in', () => {
    const cls = buttonClass(renderToStaticMarkup(createElement(RirBubble, { rir: 2, hint: true, onClick: () => undefined, label: 'Voorschrift 2 over, set 1, tik om je eigen RIR in te vullen' })));
    expect(cls).toMatch(/\bh-11\b/);
    expect(cls).toMatch(/\bw-11\b/);
    expect(layoutSize(cls, 24)).toBe(true);
    expect(cls).not.toMatch(/before:/);
  });

  it('de kolomkop Toon vorige keer is 16 px tekst met 14 px boven en onder: 44 hoog', () => {
    const line = blockSource.split('\n').find((l) => l.includes("'Toon vorige keer'")) ?? '';
    expect(line).toContain('py-[14px]');
    expect(line).toContain('-my-[14px]');
    expect(line).not.toMatch(/before:/);
    // De kop staat in een rij met text-xs (regelhoogte 16 px).
    expect(blockSource).toMatch(/role="row" className="forge-grid items-end pb-1 text-xs"/);
  });
});
