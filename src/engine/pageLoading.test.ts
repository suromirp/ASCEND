import { describe, expect, it } from 'vitest';
import { pageLoadingHeading } from './pageLoading';

describe('de kop van de laadstand van een lui geladen pagina', () => {
  it('Stand krijgt de hoge lucht met de titel van de tab', () => {
    expect(pageLoadingHeading('/stand')).toEqual({ kind: 'tab', title: 'Je stand' });
  });

  it('Instellingen en de groepen krijgen de lage lucht zonder tandwiel', () => {
    expect(pageLoadingHeading('/more')).toEqual({ kind: 'settings', eyebrow: 'Meer', title: 'Instellingen' });
    expect(pageLoadingHeading('/more/forge')).toEqual({ kind: 'settings', eyebrow: 'Instellingen', title: 'Forge' });
    expect(pageLoadingHeading('/more/planning/sporten')).toEqual({ kind: 'settings', eyebrow: 'Planning', title: 'Sporten' });
    expect(pageLoadingHeading('/more/planning/hoeveel')).toEqual({ kind: 'settings', eyebrow: 'Planning', title: 'Hoeveel per soort' });
    expect(pageLoadingHeading('/more/bestaat-niet')).toEqual({ kind: 'settings', eyebrow: 'Meer', title: 'Instellingen' });
  });

  it('de losse pagina\'s krijgen hun eigen kopje en titel', () => {
    expect(pageLoadingHeading('/kennis')).toEqual({ kind: 'page', eyebrow: 'Gidsen', title: 'Kennisbank' });
    expect(pageLoadingHeading('/kennis/hoogte')).toEqual({ kind: 'page', eyebrow: 'Gidsen', title: 'Kennisbank' });
    expect(pageLoadingHeading('/lichaam/knie')).toEqual({ kind: 'page', eyebrow: 'Lichaam', title: 'Lichaam' });
    expect(pageLoadingHeading('/forge')).toEqual({ kind: 'page', eyebrow: 'Stand', title: 'Forge' });
    expect(pageLoadingHeading('/reis/paklijst')).toEqual({ kind: 'page', eyebrow: 'Reis', title: 'Paklijst' });
  });

  it('een onbekend adres krijgt toch een lucht, met de naam van de app', () => {
    expect(pageLoadingHeading('/iets')).toEqual({ kind: 'page', title: 'ASCEND' });
  });
});
