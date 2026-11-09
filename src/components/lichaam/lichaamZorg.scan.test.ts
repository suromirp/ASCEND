import { describe, expect, it } from 'vitest';
import bodySpot from '../../pages/BodySpot.tsx?raw';
import bodyCheckSheet from './BodyCheckSheet.tsx?raw';

// Een waarschuwing over zorg staat nooit achter een tik of in een ingeklapt deel
// (docs/beslissingen/2026-11-09-teksten-lichaam-en-instellingen.md). De spoedtekst van een plek en de lijst
// "Naar een fysio of je huisarts bij" staan daarom altijd open, op de plekpagina en in het blad Hoe voelt je lijf.
describe('zorg op Lichaam staat nooit achter een tik', () => {
  const sources = { 'pages/BodySpot.tsx': bodySpot, 'components/lichaam/BodyCheckSheet.tsx': bodyCheckSheet };

  it('geen inklap rond de zorgteksten', () => {
    for (const [file, text] of Object.entries(sources)) {
      expect(text, file).not.toMatch(/aria-expanded/);
      expect(text, file).not.toMatch(/mx-unfold/);
      expect(text, file).not.toMatch(/\binert=/);
      expect(text, file).not.toMatch(/fysioOpen/);
    }
  });

  it('de spoedtekst en de lijst worden zonder voorwaarde van een tik getoond', () => {
    expect(bodySpot).toMatch(/\{care\.direct && \(/);
    expect(bodySpot).toMatch(/care\.fysioAll\.map/);
    expect(bodyCheckSheet).toMatch(/\{s\.direct && </);
    expect(bodyCheckSheet).toMatch(/\{s\.fysio\.length > 0 && \(/);
    for (const text of Object.values(sources)) expect(text).toContain('Naar een fysio of je huisarts bij');
  });
});
