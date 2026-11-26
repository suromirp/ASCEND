import { describe, expect, it } from 'vitest';
import type { LeavePeriod } from '../models/leave';
import type { PublicHoliday } from '../models/publicHoliday';
import {
  HOLIDAY_COUNTRY_ADVICE, holidayOffer, holidayOfferId, holidayOfferTitle, holidayPeriod, holidayRow, holidayYearsDue, holidayYearsFor,
  holidayFailureLine, holidayStatusLine, planHorizonEnd, quietHolidays, resolveHolidayCountry, resolveHolidayOffers,
} from './publicHolidays';

// Nagemaakte feestdagen, de vorm die de adapter levert.
const h = (date: string, name: string, country = 'NL'): PublicHoliday => ({ date, name, country, source: 'nager-date' });
const HOLIDAYS = [h('2027-03-28', 'Eerste Paasdag'), h('2027-03-29', 'Tweede Paasdag'), h('2027-04-27', 'Koningsdag'), h('2027-12-25', 'Eerste Kerstdag')];
const base = { holidays: HOLIDAYS, country: 'NL', today: '2027-03-20', horizonEnd: '2027-06-30', periods: [] as LeavePeriod[], declined: [] as string[], enabled: true };

describe('instelling en land', () => {
  it('staat aan als advies en leest Nederland als advies', () => {
    expect(resolveHolidayOffers(undefined)).toBe(true);
    expect(resolveHolidayOffers(false)).toBe(false);
    expect(resolveHolidayOffers('ja')).toBe(true);
    expect(HOLIDAY_COUNTRY_ADVICE).toBe('NL');
    expect(resolveHolidayCountry(undefined)).toBe('NL');
    expect(resolveHolidayCountry('BE')).toBe('BE');
    expect(resolveHolidayCountry('XX')).toBe('NL');
  });
});

describe('welke jaren', () => {
  it('haalt dit jaar, en vanaf december ook het volgende', () => {
    expect(holidayYearsFor('2027-11-30')).toEqual([2027]);
    expect(holidayYearsFor('2027-12-01')).toEqual([2027, 2028]);
  });

  it('haalt een jaar per land maar één keer', () => {
    const cache = [{ country: 'NL', year: 2027, fetchedAt: '2027-01-02T08:00:00.000Z', holidays: [] }];
    expect(holidayYearsDue(cache, 'NL', '2027-06-01')).toEqual([]);
    expect(holidayYearsDue(cache, 'BE', '2027-06-01')).toEqual([2027]);
    // De jaarwisseling: in december komt het nieuwe jaar erbij, op 1 januari is het er al.
    expect(holidayYearsDue(cache, 'NL', '2027-12-01')).toEqual([2028]);
    const both = [...cache, { country: 'NL', year: 2028, fetchedAt: '2027-12-01T08:00:00.000Z', holidays: [] }];
    expect(holidayYearsDue(both, 'NL', '2028-01-01')).toEqual([]);
  });
});

describe('het voorstel', () => {
  it('stelt de eerstvolgende feestdag voor, als vrije dag', () => {
    const offer = holidayOffer(base)!;
    expect(offer).toEqual({ id: 'feestdag:NL:2027-03-28', date: '2027-03-28', name: 'Eerste Paasdag', country: 'NL' });
    expect(holidayOfferTitle(offer, base.today)).toBe('Zondag 28 maart is Eerste Paasdag. Zet hem als vrije dag?');
    expect(holidayPeriod(offer, 'leave-1')).toEqual({ id: 'leave-1', kind: 'free_days', startDate: '2027-03-28', endDate: '2027-03-28', note: 'Eerste Paasdag' });
    expect(holidayRow(offer, base.today)).toEqual({ title: 'Eerste Paasdag · zo 28 mrt', sub: 'Als vrije dag zetten?' });
  });

  it('de dag zelf telt mee: een feestdag van vandaag', () => {
    expect(holidayOffer({ ...base, today: '2027-03-29' })?.date).toBe('2027-03-29');
    expect(holidayOffer({ ...base, today: '2027-03-30' })?.date).toBe('2027-04-27');
  });

  it('alleen binnen de horizon van de planning', () => {
    expect(holidayOffer({ ...base, today: '2027-05-01' })).toBeUndefined();
    expect(holidayOffer({ ...base, horizonEnd: '2027-03-27' })).toBeUndefined();
    expect(holidayOffer({ ...base, horizonEnd: '2027-03-28' })?.date).toBe('2027-03-28');
    expect(holidayOffer({ ...base, horizonEnd: undefined })).toBeUndefined();
  });

  it('niet op een dag met een periode, ook geen vakantie of tocht', () => {
    for (const kind of ['free_days', 'no_training', 'trek', 'no_gym'] as const) {
      const periods: LeavePeriod[] = [{ id: 'p', kind, startDate: '2027-03-27', endDate: '2027-03-28' }];
      expect(holidayOffer({ ...base, periods })?.date).toBe('2027-03-29');
    }
  });

  it('niet na Liever niet, alleen voor die ene feestdag', () => {
    const offer = holidayOffer(base)!;
    expect(holidayOfferId(HOLIDAYS[0])).toBe(offer.id);
    expect(holidayOffer({ ...base, declined: [offer.id] })?.date).toBe('2027-03-29');
  });

  it('niet als de instelling uit staat, en alleen voor het land van de instelling', () => {
    expect(holidayOffer({ ...base, enabled: false })).toBeUndefined();
    expect(holidayOffer({ ...base, holidays: [h('2027-03-29', 'Paasmaandag', 'BE')] })).toBeUndefined();
  });

  it('over de jaarwisseling: eind december, dan het nieuwe jaar', () => {
    const holidays = [...HOLIDAYS, h('2027-12-26', 'Tweede Kerstdag'), h('2028-01-01', 'Nieuwjaarsdag')];
    const late = { ...base, holidays, today: '2027-12-27', horizonEnd: '2028-03-01' };
    const offer = holidayOffer(late)!;
    expect(offer.date).toBe('2028-01-01');
    expect(holidayOfferTitle(offer, late.today)).toBe('Zaterdag 1 januari 2028 is Nieuwjaarsdag. Zet hem als vrije dag?');
  });
});

describe('de horizon en stil in Week', () => {
  it('de horizon is de laatste geplande dag', () => {
    expect(planHorizonEnd([])).toBeUndefined();
    expect(planHorizonEnd([{ scheduledDate: '2027-04-01' }, { scheduledDate: '2027-05-03' }, { scheduledDate: '2027-02-01' }])).toBe('2027-05-03');
  });

  it('toont een feestdag zonder periode, niets als hij uit staat', () => {
    const periods: LeavePeriod[] = [{ id: 'p', kind: 'free_days', startDate: '2027-03-28', endDate: '2027-03-28' }];
    const quiet = quietHolidays({ holidays: HOLIDAYS, country: 'NL', periods, enabled: true });
    expect(quiet.get('2027-03-28')).toBeUndefined();
    expect(quiet.get('2027-03-29')).toBe('Tweede Paasdag');
    expect(quietHolidays({ holidays: HOLIDAYS, country: 'NL', periods, enabled: false }).size).toBe(0);
  });
});

describe('de uitkomst van het ophalen', () => {
  it('zegt het als het mislukte, en zwijgt als hij uit staat', () => {
    expect(holidayStatusLine({ status: 'off', holidays: [] }, 'NL')).toBeUndefined();
    expect(holidayStatusLine({ status: 'failed', failure: 'offline', holidays: [] }, 'NL')).toBe('Feestdagen ophalen lukte niet zonder verbinding. Bij de volgende keer openen probeert ASCEND het opnieuw.');
    expect(holidayStatusLine({ status: 'failed', failure: 'timeout', holidays: [] }, 'NL')).toContain('duurde te lang');
    expect(holidayStatusLine({ status: 'fetched', holidays: [1] }, 'BE')).toBe('De feestdagen van België staan op dit toestel.');
    expect(holidayStatusLine({ status: 'ready', holidays: [] }, 'NL', true)).toBe('Feestdagen van Nederland ophalen.');
    expect(holidayFailureLine({ status: 'ready', holidays: [] }, 'NL')).toBeUndefined();
    expect(holidayFailureLine({ status: 'failed', failure: 'failed', holidays: [] }, 'NL')).toContain('lukte niet');
  });
});
