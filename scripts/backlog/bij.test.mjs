// Houdt de Inbox van docs/backlog.md eerlijk: elk punt een vaste code, geen dubbele codes, en het script
// scripts/backlog/bij.mjs verplaatst een punt na "Klaar: I-<n>" naar Pas live (zonder echte git).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bijwerken, codesUit, datumNl } from './bij.mjs';

const backlog = readFileSync(new URL('../../docs/backlog.md', import.meta.url), 'utf8');

function blok(tekst, kop) {
  const regels = tekst.split('\n');
  const van = regels.findIndex((r) => r.startsWith(`## ${kop}`));
  const tot = regels.findIndex((r, i) => i > van && r.startsWith('## '));
  return regels.slice(van + 1, tot < 0 ? undefined : tot);
}

describe('backlog: codes in de Inbox', () => {
  const inbox = blok(backlog, 'Inbox');
  const punten = inbox.filter((r) => r.trimStart().startsWith('- '));

  it('geeft elke Inboxregel die met "- " begint een code [I-n]', () => {
    expect(punten.filter((r) => !/^\s*- \[I-\d+\] /.test(r))).toEqual([]);
    expect(punten.length).toBeGreaterThan(0);
  });

  it('heeft geen dubbele codes, ook niet tussen Inbox en Pas live', () => {
    const alle = [...backlog.matchAll(/^\s*- \[I-(\d+)\] /gm)].map((m) => Number(m[1]));
    expect(alle.filter((c, i) => alle.indexOf(c) !== i)).toEqual([]);
  });

  it('noemt bovenaan de Inbox het hoogste nummer, en dat klopt', () => {
    const regel = inbox.find((r) => r.startsWith('Hoogste code: I-'));
    expect(regel).toBeDefined();
    const alle = [...backlog.matchAll(/^\s*- \[I-(\d+)\] /gm)].map((m) => Number(m[1]));
    expect(Number(regel.match(/I-(\d+)/)[1])).toBe(Math.max(...alle));
  });
});

describe('backlog:bij', () => {
  const nagemaakt = [
    '# Backlog',
    '',
    '## Inbox',
    'Hoogste code: I-5.',
    '- [I-1] Eerste punt (eigenaar 1 januari): met uitleg die mee moet.',
    '- [I-2] Tweede punt: nog open',
    '- [I-3] Groep (verslagen):',
    '  - [I-4] A. Eerste deel: klaar',
    '  - [I-5] B. Tweede deel: open',
    '  Mag: een losse regel onder de groep.',
    '',
    '## Pas live',
    '- Oud punt zonder code.',
    '',
    '## Later',
    '- [I-9] Staat niet in de Inbox.',
  ].join('\n');

  const commits = [
    { hash: 'aaaaaaa1111111', datum: '2026-11-14T22:30:00Z', bericht: 'Iets anders\n\nKlaar: I-1' },
    { hash: 'bbbbbbb2222222', datum: '2026-11-15T09:00:00Z', bericht: 'Samen\n\nKlaar: I-4, I-3 en I-9\nI-2 hoort hier niet bij' },
  ];

  it('leest codes van een Klaar-regel, ook meerdere op één regel', () => {
    expect(codesUit('x\n\nKlaar: I-4, I-3 en I-9')).toEqual([4, 3, 9]);
    expect(codesUit('x\nklaar: I-2')).toEqual([2]);
    expect(codesUit('Een punt I-7 in de tekst zonder Klaar')).toEqual([]);
  });

  it('verplaatst een punt met datum en korte commit, in Amsterdamse tijd', () => {
    expect(datumNl('2026-11-14T23:30:00Z')).toBe('15 november');
    const r = bijwerken(nagemaakt, commits);
    expect(r.verplaatst.map((v) => v.code)).toEqual([1, 4, 3]);
    const live = blok(r.tekst, 'Pas live');
    expect(live).toContain('- [I-1] Eerste punt (14 november, aaaaaaa)');
    expect(live).toContain('- [I-4] A. Eerste deel (15 november, bbbbbbb)');
    expect(blok(r.tekst, 'Inbox').join('\n')).toContain('- [I-2] Tweede punt: nog open');
    expect(blok(r.tekst, 'Inbox').join('\n')).not.toContain('[I-1]');
  });

  it('neemt bij een groep de deelpunten en de losse regel mee, en laat een deelpunt alleen gaan', () => {
    const r = bijwerken(nagemaakt, commits);
    const inbox = blok(r.tekst, 'Inbox').join('\n');
    expect(inbox).not.toContain('[I-5]');
    expect(inbox).not.toContain('Mag: een losse regel');
    const alleen = bijwerken(nagemaakt, [{ hash: 'ccccccc3333333', datum: '2026-11-15T09:00:00Z', bericht: 'Klaar: I-4' }]);
    const rest = blok(alleen.tekst, 'Inbox').join('\n');
    expect(rest).toContain('Mag: een losse regel');
    expect(rest).toContain('[I-5]');
    expect(rest).not.toContain('[I-4]');
  });

  it('slaat een code over die niet in de Inbox staat en raakt andere koppen niet aan', () => {
    const r = bijwerken(nagemaakt, commits);
    expect(r.overgeslagen.map((o) => o.code)).toEqual([9]);
    expect(blok(r.tekst, 'Later')).toEqual(['- [I-9] Staat niet in de Inbox.']);
  });

  it('is idempotent: een tweede run verandert niets', () => {
    const eerst = bijwerken(nagemaakt, commits);
    const tweede = bijwerken(eerst.tekst, commits);
    expect(tweede.tekst).toBe(eerst.tekst);
    expect(tweede.verplaatst).toEqual([]);
  });
});
