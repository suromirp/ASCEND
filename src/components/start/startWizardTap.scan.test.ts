import { describe, expect, it } from 'vitest';
import raw from './StartWizard.tsx?raw';

// Zonder commentaarregels: daar staan de namen ook.
const src = raw.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// Punt J (Lookout 14 november): een dubbele tik op Volgende landde op "De rest overslaan" van de volgende vraag.
// Elke tik in de vraag gaat door één vangnet dat de eerste 400 ms na een nieuwe vraag niets doorlaat.
describe('de start: elke knop in een vraag is bewaakt tegen een te vroege tik', () => {
  it('het vangnet om de vragen leest tooSoon in de vangfase', () => {
    expect(src).toMatch(/onClickCapture=\{\(e\) => \{ if \(tooSoon\(\)\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); \} \}\}/);
  });
  it('alle knoppen, keuzes en De rest overslaan staan binnen het vangnet', () => {
    const open = src.indexOf('onClickCapture=');
    const close = src.lastIndexOf('</div>\n        )}\n      </Sheet>');
    expect(open).toBeGreaterThan(0);
    expect(close).toBeGreaterThan(open);
    for (const needle of ['onClick=', 'onPick=', 'De rest overslaan', 'Nog geen datum']) {
      let at = src.indexOf(needle);
      while (at !== -1) {
        expect(at > open && at < close, `${needle} op positie ${at}`).toBe(true);
        at = src.indexOf(needle, at + 1);
      }
    }
  });
});
