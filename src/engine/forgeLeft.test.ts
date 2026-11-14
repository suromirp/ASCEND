import { describe, expect, it } from 'vitest';
import {
  activeSeconds, breakAsPause, leftActiveSeconds, leftSession, leftSessionLines, longBreakMs, minutesPhrase, parkLeft, resolveLeftAfter, setsPhrase,
} from './forgeSession';

// Een training die bleef liggen (profiel afbreker, 14 november, backlog N). Nagemaakte tijden.
// De dag van een moment in Amsterdam, onafhankelijk van de tijdzone van de testmachine: zo klopt middernacht en de zomertijd.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayOf = (ms: number) => fmt.format(ms);
const at = (iso: string) => Date.parse(iso);
const H = 3_600_000;
const MIN = 60_000;

describe('leftSession: wanneer een lopende training een concept wordt', () => {
  const start = at('2026-11-17T21:30:00Z'); // di 17 november 22:30 in Amsterdam
  const s = { startedAt: start, pauses: [], lastActionAt: start + 20 * MIN };

  it('loopt gewoon door binnen de grens en voor middernacht', () => {
    expect(leftSession(s, start + 60 * MIN, { afterHours: 12, dayOf })).toBeUndefined();
  });

  it('een nacht met de app open: na middernacht met een uur stilte is het een concept', () => {
    const morning = at('2026-11-18T08:05:00Z');
    expect(leftSession(s, morning, { afterHours: 12, dayOf })).toEqual({ reason: 'nacht', lastActionAt: s.lastActionAt });
  });

  it('een late training die over middernacht doorloopt blijft lopen (minder dan een uur stil)', () => {
    const late = { startedAt: start, pauses: [], lastActionAt: at('2026-11-17T22:50:00Z') }; // 23:50
    expect(leftSession(late, at('2026-11-17T23:20:00Z'), { afterHours: 12, dayOf })).toBeUndefined(); // 00:20, 30 min stil
    expect(leftSession(late, at('2026-11-17T23:51:00Z'), { afterHours: 12, dayOf })?.reason).toBe('nacht'); // 00:51, 61 min stil
  });

  it('de grens in uren telt ook op dezelfde dag, en 0 is alleen middernacht', () => {
    const early = { startedAt: at('2026-11-18T06:00:00Z'), pauses: [], lastActionAt: at('2026-11-18T06:30:00Z') }; // 07:30
    const evening = at('2026-11-18T19:00:00Z'); // 20:00, 12,5 uur stil
    expect(leftSession(early, evening, { afterHours: 12, dayOf })?.reason).toBe('grens');
    expect(leftSession(early, evening, { afterHours: 0, dayOf })).toBeUndefined();
    expect(leftSession(early, at('2026-11-18T11:00:00Z'), { afterHours: 4, dayOf })?.reason).toBe('grens');
  });

  it('een gepauzeerde training die je vergat, wordt ook een concept', () => {
    const paused = { startedAt: start, pauses: [{ from: start + 20 * MIN }], lastActionAt: start + 20 * MIN };
    expect(leftSession(paused, at('2026-11-18T08:05:00Z'), { afterHours: 12, dayOf })?.reason).toBe('nacht');
  });

  it('overgeslagen in de planning is meteen een concept, ook binnen de grens', () => {
    expect(leftSession(s, start + 30 * MIN, { afterHours: 12, dayOf, skipped: true })?.reason).toBe('overgeslagen');
  });

  it('zonder lastActionAt telt het begin', () => {
    const bare = { startedAt: start, pauses: [] };
    expect(leftSession(bare, start + 13 * H, { afterHours: 12, dayOf })?.lastActionAt).toBe(start);
  });

  it('wintertijd (25 oktober): de grens is echte tijd, niet de wijzers van de klok', () => {
    // zo 25 oktober 01:00 CEST is 23:00Z op de 24e; 12:30 CET is 11:30Z: 12,5 uur echt.
    const s2 = { startedAt: at('2026-10-24T22:30:00Z'), pauses: [], lastActionAt: at('2026-10-24T23:00:00Z') };
    // Op de wijzers is het 01:00 tot 12:30, 11,5 uur; echt is het 12,5 uur.
    expect(leftSession(s2, at('2026-10-25T11:30:00Z'), { afterHours: 12, dayOf })?.reason).toBe('grens');
    // 10:59Z is 11:59 CET: op de wijzers bijna 11 uur, echt 11 uur 59, dus nog net binnen de grens.
    expect(leftSession(s2, at('2026-10-25T10:59:00Z'), { afterHours: 12, dayOf })).toBeUndefined();
  });

  it('wintertijd: middernacht valt op de dag in Amsterdam, niet in UTC', () => {
    // 23:30 CEST op za 24 oktober is 21:30Z; 00:40 op zo 25 oktober is nog CEST (22:40Z): 70 min stil, nieuwe dag.
    const s3 = { startedAt: at('2026-10-24T21:00:00Z'), pauses: [], lastActionAt: at('2026-10-24T21:30:00Z') };
    expect(dayOf(at('2026-10-24T22:40:00Z'))).toBe('2026-10-25');
    expect(leftSession(s3, at('2026-10-24T22:40:00Z'), { afterHours: 12, dayOf })?.reason).toBe('nacht');
  });

  it('zomertijd (29 maart): een uur minder op de wijzers, de grens blijft echte tijd', () => {
    // zo 29 maart 01:30 CET is 00:30Z; 13:00 CEST is 11:00Z: 10,5 uur echt, 11,5 uur op de wijzers.
    const s4 = { startedAt: at('2026-03-29T00:00:00Z'), pauses: [], lastActionAt: at('2026-03-29T00:30:00Z') };
    expect(leftSession(s4, at('2026-03-29T11:00:00Z'), { afterHours: 12, dayOf })).toBeUndefined();
    expect(leftSession(s4, at('2026-03-29T12:31:00Z'), { afterHours: 12, dayOf })?.reason).toBe('grens');
  });
});

describe('het concept: de klok staat stil op je laatste handeling, er gaat niets weg', () => {
  const start = at('2026-11-17T21:30:00Z');
  const s = { startedAt: start, pauses: [{ from: start + 10 * MIN, to: start + 15 * MIN }], lastActionAt: start + 40 * MIN };
  const morning = at('2026-11-18T08:05:00Z');

  it('leftActiveSeconds telt tot de laatste handeling, min de pauzes', () => {
    expect(leftActiveSeconds(s)).toBe(35 * 60);
    expect(activeSeconds(s, morning)).toBeGreaterThan(10 * 3600);
  });

  it('parkLeft (Verder, Afronden) maakt van de stilte een pauze: de duur blijft de tijd dat je trainde', () => {
    const parked = parkLeft(s, morning);
    expect(activeSeconds(parked, morning)).toBe(35 * 60);
    expect(parked.lastActionAt).toBe(morning);
    // Daarna loopt de klok weer gewoon, en de lange onderbreking vraagt niets meer.
    expect(activeSeconds(parked, morning + 5 * MIN)).toBe(40 * 60);
    expect(longBreakMs(parked, morning + MIN, 45)).toBeUndefined();
    expect(parkLeft).toBe(breakAsPause);
  });

  it('na parkeren is de sessie geen concept meer', () => {
    expect(leftSession(parkLeft(s, morning), morning + MIN, { afterHours: 12, dayOf })).toBeUndefined();
  });

  it('een scherm dat een nacht open bleef: de lange onderbreking ziet de stilte ook zonder terugkomst', () => {
    // useForgeClock kijkt elke minuut met longBreakMs; hier de regel zelf.
    expect(longBreakMs(s, start + 40 * MIN + 46 * MIN, 45)).toBe(46 * MIN);
  });
});

describe('de instelling en de zinnen', () => {
  it('advies 12 uur, alleen geldige waarden', () => {
    expect(resolveLeftAfter(undefined)).toBe(12);
    expect(resolveLeftAfter({ forgeLeftAfter: 0 })).toBe(0);
    expect(resolveLeftAfter({ forgeLeftAfter: 4 })).toBe(4);
    expect(resolveLeftAfter({ forgeLeftAfter: 7 })).toBe(12);
  });

  it('sets en minuten', () => {
    expect(setsPhrase(0)).toBe('geen sets');
    expect(setsPhrase(1)).toBe('1 set');
    expect(setsPhrase(3)).toBe('3 sets');
    expect(minutesPhrase(42 * 60)).toBe('42 min');
    expect(minutesPhrase(95 * 60)).toBe('1 uur 35 min');
    expect(minutesPhrase(120 * 60)).toBe('2 uur');
  });

  it('het droge feit eerst, en Weggooien zegt wat er weggaat', () => {
    const l = leftSessionLines({ name: 'Bovenlichaam A', doneSets: 3, activeSec: 35 * 60, when: 'gisteren om 23:10', reason: 'nacht' });
    expect(l.fact).toBe('Bovenlichaam A: 3 sets afgevinkt, 35 min getraind. Je laatste handeling was gisteren om 23:10.');
    expect(l.note).toBe('Hij staat als concept klaar; er gaat niets weg tot je kiest.');
    expect(l.discard).toBe('3 sets en 35 min van gisteren gaan weg. Je logboek en je planning veranderen niet.');
    expect(leftSessionLines({ name: 'X', doneSets: 0, activeSec: 60, when: 'vandaag om 08:00' }).discard).toBe('Deze training van vandaag gaat weg. Je logboek en je planning veranderen niet.');
    expect(leftSessionLines({ name: 'X', doneSets: 2, activeSec: 60, when: 'di 17 nov om 22:30', reason: 'overgeslagen' }).note).toContain('overgeslagen');
  });

  it('geen gedachtestreepjes in de zinnen', () => {
    const l = leftSessionLines({ name: 'X', doneSets: 2, activeSec: 600, when: 'gisteren om 22:00', reason: 'grens' });
    for (const t of Object.values(l)) expect(t).not.toMatch(/[–—]/);
  });
});

describe('Afronden van een concept: eerlijk een korte training', () => {
  it('3 sets na een nacht: de duur is de tijd dat je trainde, en het oordeel is een korte training', async () => {
    const { buildDefaultProgramData } = await import('../data/defaultProgram');
    const { isShortTraining, SHORT_TRAINING_TEXT } = await import('./shortTraining');
    const upper = buildDefaultProgramData().templates.find((x) => x.id === 'tpl_upper_a')!;
    const start = at('2026-11-17T21:30:00Z');
    const s = { startedAt: start, pauses: [], lastActionAt: start + 35 * MIN };
    const parked = parkLeft(s, at('2026-11-18T08:05:00Z'));
    // FinishSheet stelt de actieve tijd voor: 35 minuten, niet de nacht.
    const minutes = Math.round(activeSeconds(parked, at('2026-11-18T08:06:00Z')) / 60);
    expect(minutes).toBe(36);
    const sets = [{ exerciseId: upper.exercises![0].id, exerciseName: 'x', sets: [1, 2, 3].map(() => ({ reps: 8, weightKg: 40 })) }];
    const log = { variant: 'full' as const, durationMinutes: minutes, completedDate: '2026-11-17', strengthData: sets, source: 'manual' as const };
    expect(isShortTraining(log, upper, null)).toBe(true);
    expect(SHORT_TRAINING_TEXT).toBe('Een korte training. Dat telt ook.');
  });
});
