import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { HOLIDAYS_KEY, readHolidayStore, readPublicHolidays, refreshPublicHolidays } from './publicHolidays';
import { mapPublicHolidays, publicHolidaysUrl } from '../integrations/publicHolidays';

// Nagemaakte antwoorden in de vorm van Nager.Date: geen netwerk in de tests.
const answer = (year: number) => [
  { date: `${year}-04-06`, localName: 'Tweede Paasdag', name: 'Easter Monday', countryCode: 'NL', global: true, types: ['Public'] },
  { date: `${year}-04-27`, localName: 'Koningsdag', name: "King's Day", countryCode: 'NL', global: true, types: ['Public'] },
  { date: `${year}-05-05`, localName: 'Bevrijdingsdag', name: 'Liberation Day', countryCode: 'NL', global: true, types: ['Bank'] },
  { date: `${year}-06-01`, localName: 'Streekdag', name: 'Regional day', countryCode: 'NL', global: false, counties: ['NL-XX'], types: ['Public'] },
];
const yearOf = (url: string) => Number(url.split('/').at(-2));
const ok = () => vi.fn(async (url: string) => new Response(JSON.stringify(answer(yearOf(url))), { status: 200 }));
const as = (f: unknown) => f as typeof fetch;
const base = { enabled: true, country: 'NL', today: '2027-03-20', now: new Date('2027-03-20T08:00:00.000Z') };

beforeEach(async () => {
  await wipeAllData();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('de adapter', () => {
  it('vraagt alleen een jaar en een land', () => {
    expect(publicHolidaysUrl(2027, 'nl')).toBe('https://date.nager.at/api/v3/PublicHolidays/2027/NL');
  });

  it('houdt alleen wat landelijk geldt en een echte vrije dag is, met de bron in source', () => {
    expect(mapPublicHolidays(answer(2027), 'NL')).toEqual([
      { date: '2027-04-06', name: 'Tweede Paasdag', country: 'NL', source: 'nager-date' },
      { date: '2027-04-27', name: 'Koningsdag', country: 'NL', source: 'nager-date' },
    ]);
    // Een ouder antwoord met `type` in plaats van `types`.
    expect(mapPublicHolidays([{ date: '2027-01-01', localName: 'Nieuwjaarsdag', global: true, type: 'Public' }], 'NL')).toHaveLength(1);
    expect(() => mapPublicHolidays({ fout: true }, 'NL')).toThrow();
  });
});

describe('feestdagen ophalen en bewaren', () => {
  it('ophalen gelukt: bewaard, en dat jaar wordt niet opnieuw gevraagd', async () => {
    const f = ok();
    const first = await refreshPublicHolidays({ ...base, fetchImpl: as(f) });
    expect(first.status).toBe('fetched');
    expect(first.holidays.map((h) => h.name)).toEqual(['Tweede Paasdag', 'Koningsdag']);
    const again = await refreshPublicHolidays({ ...base, fetchImpl: as(f) });
    expect(again.status).toBe('ready');
    expect(f).toHaveBeenCalledTimes(1);
    expect(await readPublicHolidays('NL')).toHaveLength(2);
  });

  it('ophalen mislukt: een zichtbare uitkomst, niets als "geen feestdagen" bewaard, de volgende keer opnieuw', async () => {
    const bad = vi.fn(async () => new Response('kapot', { status: 500 }));
    const r = await refreshPublicHolidays({ ...base, fetchImpl: as(bad) });
    expect(r).toEqual({ status: 'failed', failure: 'failed', holidays: [] });
    expect((await readHolidayStore()).failure).toEqual({ country: 'NL', kind: 'failed', at: base.now.toISOString() });
    const f = ok();
    expect((await refreshPublicHolidays({ ...base, fetchImpl: as(f) })).status).toBe('fetched');
    expect((await readHolidayStore()).failure).toBeUndefined();
  });

  it('tijdsgrens: een antwoord dat niet komt, stopt en meldt het', async () => {
    const hang = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('afgebroken'), { name: 'AbortError' })));
    }));
    const r = await refreshPublicHolidays({ ...base, fetchImpl: as(hang), timeoutMs: 20, limitMs: 1000 });
    expect(r.status).toBe('failed');
    expect(r.failure).toBe('timeout');
    // Ook de grens over alles samen, als een aanvraag zijn eigen grens negeert.
    const deaf = vi.fn(() => new Promise<Response>(() => {}));
    const r2 = await refreshPublicHolidays({ ...base, fetchImpl: as(deaf), timeoutMs: 10_000, limitMs: 20 });
    expect(r2).toMatchObject({ status: 'failed', failure: 'timeout' });
  });

  it('offline: niets gevraagd, wat er al stond blijft', async () => {
    await refreshPublicHolidays({ ...base, fetchImpl: as(ok()) });
    vi.stubGlobal('navigator', { onLine: false });
    const f = ok();
    // December: het volgende jaar is nodig, maar er is geen verbinding.
    const r = await refreshPublicHolidays({ ...base, today: '2027-12-02', fetchImpl: as(f) });
    expect(f).not.toHaveBeenCalled();
    expect(r.status).toBe('failed');
    expect(r.failure).toBe('offline');
    expect(r.holidays.map((h) => h.date)).toEqual(['2027-04-06', '2027-04-27']);
  });

  it('uit: er wordt niets opgehaald', async () => {
    const f = ok();
    expect(await refreshPublicHolidays({ ...base, enabled: false, fetchImpl: as(f) })).toEqual({ status: 'off', holidays: [] });
    expect(f).not.toHaveBeenCalled();
    expect(await MetaRepo.get(HOLIDAYS_KEY)).toBeUndefined();
  });

  it('jaarwisseling: vanaf december ook het volgende jaar, daarna niets nieuws', async () => {
    const f = ok();
    await refreshPublicHolidays({ ...base, fetchImpl: as(f) });
    const dec = await refreshPublicHolidays({ ...base, today: '2027-12-01', fetchImpl: as(f) });
    expect(f).toHaveBeenCalledTimes(2);
    expect(yearOf(String(f.mock.calls[1][0]))).toBe(2028);
    expect(dec.holidays.map((h) => h.date)).toEqual(['2027-04-06', '2027-04-27', '2028-04-06', '2028-04-27']);
    await refreshPublicHolidays({ ...base, today: '2028-01-01', fetchImpl: as(f) });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('per land: een ander land wordt apart gevraagd', async () => {
    const f = ok();
    await refreshPublicHolidays({ ...base, fetchImpl: as(f) });
    await refreshPublicHolidays({ ...base, country: 'BE', fetchImpl: as(f) });
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[1][0])).toContain('/2027/BE');
  });

  it('staat niet in de back-up', async () => {
    await refreshPublicHolidays({ ...base, fetchImpl: as(ok()) });
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('Koningsdag');
  });
});
