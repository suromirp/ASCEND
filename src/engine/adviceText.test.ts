import { describe, expect, it } from 'vitest';
import { adviceBrief, adviceLead, firstSentence } from './adviceText';

describe('firstSentence', () => {
  it('geeft de eerste zin met zijn punt', () => {
    expect(firstSentence('Je testloop had 2:16 stilstand. Met Akkoord verandert er iets.')).toBe('Je testloop had 2:16 stilstand.');
  });
  it('knipt niet midden in een getal of afkorting', () => {
    expect(firstSentence('Rond 2.5 km, ca. 20 minuten. Daarna rust.')).toBe('Rond 2.5 km, ca. 20 minuten.');
  });
  it('houdt een tekst met één zin heel', () => {
    expect(firstSentence('Rust vandaag')).toBe('Rust vandaag');
    expect(firstSentence('Rust vandaag.')).toBe('Rust vandaag.');
  });
  it('kent ook een vraagteken als einde', () => {
    expect(firstSentence('Klaar voor meer? Dan gaat de lat omhoog.')).toBe('Klaar voor meer?');
  });
  it('laat witruimte weg', () => {
    expect(firstSentence('  Kort.  Lang.  ')).toBe('Kort.');
  });
});

describe('adviceLead en adviceBrief', () => {
  const base = { effect: 'Eerste zin. Tweede zin.' };
  it('neemt lead als die er is, anders de eerste zin', () => {
    expect(adviceLead({ ...base, lead: 'Eigen lead.' })).toBe('Eigen lead.');
    expect(adviceLead(base)).toBe('Eerste zin.');
  });
  it('brief valt terug op lead', () => {
    expect(adviceBrief({ ...base, brief: 'Di 2:16 stilgestaan' })).toBe('Di 2:16 stilgestaan');
    expect(adviceBrief({ ...base, lead: 'Eigen lead.' })).toBe('Eigen lead.');
    expect(adviceBrief(base)).toBe('Eerste zin.');
  });
});
