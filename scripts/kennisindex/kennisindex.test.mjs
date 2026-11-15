// Houdt de kennisindex bij: elk document in docs/ heeft een regel in docs/kennisindex/bronnen.json, elke regel
// wijst naar een document dat bestaat, en docs/kennisindex/ is wat `npm run kennisindex` nu maakt. Een besluit dat
// is ingehaald wijst met vervangenDoor naar een bestaand, niet ouder document, zonder kringen, en een besluit dat
// een later besluit in zijn "Vervangt" noemt heet hier niet "geldt".
import { describe, it, expect } from 'vitest';
import { controleer, datum, documenten, kringen, leesBronnen, verschillen } from './maak.mjs';

const B = (naam) => `docs/beslissingen/${naam}.md`;
const OUD = B('2026-10-27-stem-van-ascend');
const NIEUW = B('2026-11-09-stem-van-ascend');
/** De echte bronnen met één regel anders, om te zien dat de controle het merkt. */
const met = (pad, wijzig) => {
  const bron = structuredClone(leesBronnen());
  wijzig(bron.documenten[pad], bron.documenten);
  return controleer(undefined, bron);
};

describe('kennisindex', () => {
  it('heeft voor elk document in docs/ een regel in bronnen.json', () => {
    const bekend = new Set(Object.keys(leesBronnen().documenten));
    expect(documenten().filter((p) => !bekend.has(p))).toEqual([]);
  });

  it('heeft geen regel die naar een document wijst dat niet bestaat, en elke regel is compleet', () => {
    expect(controleer()).toEqual([]);
  });

  it('is gelijk aan wat het script nu maakt (anders: npm run kennisindex)', () => {
    expect(verschillen()).toEqual([]);
  });

  it('laat vervangenDoor naar een bestaand document wijzen dat niet ouder is', () => {
    expect(datum(OUD) < datum(NIEUW)).toBe(true);
    expect(met(OUD, (e) => { e.vervangenDoor = [B('2026-01-01-bestaat-niet')]; }).join('\n')).toMatch(/wijst niet naar een ander bestaand document/);
    expect(met(OUD, (e) => { e.vervangenDoor = [OUD]; }).join('\n')).toMatch(/wijst niet naar een ander bestaand document/);
    expect(met(NIEUW, (e) => { e.stand = 'vervangen'; e.vervangenDoor = [OUD]; }).join('\n')).toMatch(/wijst naar een ouder document/);
    expect(met(OUD, (e) => { delete e.vervangenDoor; }).join('\n')).toMatch(/zonder "vervangenDoor"/);
  });

  it('eist bij deels ingehaald één zin over wat nog geldt', () => {
    expect(met(OUD, (e) => { e.stand = 'deels'; }).join('\n')).toMatch(/zonder "Geldt nog:"/);
  });

  it('kent geen kringen in vervangenDoor', () => {
    expect(kringen(leesBronnen().documenten)).toEqual([]);
    expect(kringen({ a: { vervangenDoor: ['b'] }, b: { vervangenDoor: ['c'] }, c: { vervangenDoor: ['a'] } })).toHaveLength(1);
    expect(kringen({ a: { vervangenDoor: ['b', 'c'] }, b: { vervangenDoor: ['c'] }, c: {} })).toEqual([]);
    expect(met(NIEUW, (e) => { e.stand = 'vervangen'; e.vervangenDoor = [OUD]; }).join('\n')).toMatch(/Kring in "vervangenDoor"/);
  });

  it('meldt een besluit dat geldt terwijl een later besluit zegt het te vervangen', () => {
    const fout = met(OUD, (e) => { e.stand = 'geldt'; delete e.vervangenDoor; });
    expect(fout).toHaveLength(1);
    expect(fout[0]).toMatch(/Stand "geldt", maar genoemd als vervangen door 2026-11-09-stem-van-ascend/);
  });

  it('meldt een later besluit dat in "Vervangt" genoemd is en niet in vervangenDoor of vultAan staat', () => {
    const doel = B('2026-10-23-ochtendkaart-en-melding');
    const fout = met(B('2026-10-24-ochtend-een-tik'), (e) => { delete e.vultAan; });
    expect(fout).toHaveLength(1);
    expect(fout[0]).toContain(doel);
  });
});
