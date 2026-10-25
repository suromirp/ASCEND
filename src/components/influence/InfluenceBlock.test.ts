import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { KnownFact } from '../../engine/influence';
import { InfluenceBlock } from './InfluenceBlock';

vi.mock('../../state/AppDataContext', () => ({ useAppData: () => ({ saveInfluence: async () => undefined }) }));

const fact: KnownFact = { reason: 'zware_beendag', title: 'Zware beendag', source: 'Beenkracht A, uit je logboek' };
const html = (facts: KnownFact[]) => renderToStaticMarkup(createElement(InfluenceBlock, { target: { date: '2026-10-24' }, entry: undefined, facts, mode: 'day' }));

describe('InfluenceBlock', () => {
  it('toont een feit als gewone regel, zonder knop, vinkje of rondje', () => {
    const out = html([fact]);
    expect(out).toContain('Wat ASCEND al weet');
    expect(out).toContain('Zware beendag');
    expect(out).toContain('Beenkracht A, uit je logboek');
    expect(out).not.toContain('Tik als het klopt');
    expect(out).not.toContain('role="checkbox"');
    expect(out).not.toContain('<svg');
    // Het feit is geen knop: geen knop bevat zijn titel.
    expect(out).not.toMatch(/<button[^>]*>[^<]*Zware beendag/);
  });

  it('toont geen blok met feiten als er geen zijn', () => {
    expect(html([])).not.toContain('Wat ASCEND al weet');
  });
});
