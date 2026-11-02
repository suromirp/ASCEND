import { describe, expect, it } from 'vitest';
import { askForLocation, locateIfGranted, locateOnce } from './locationSwitch';
import { LocateError } from '../utils/geolocation';

const ok = () => Promise.resolve({ lat: 46.12, lon: 6.93 });

describe('Je locatie aanzetten', () => {
  it('lukt met een plek', async () => {
    const r = await askForLocation({ requestPermission: () => Promise.resolve('granted'), locate: ok });
    expect(r).toEqual({ status: 'found', position: { lat: 46.12, lon: 6.93 } });
  });

  it('lukt in de browser, waar het venster pas bij de vraag naar je plek komt', async () => {
    const r = await askForLocation({ requestPermission: () => Promise.resolve(undefined), locate: ok });
    expect(r.status).toBe('found');
  });

  it('stopt zonder te zoeken als de toestemming is geweigerd', async () => {
    let asked = false;
    const r = await askForLocation({ requestPermission: () => Promise.resolve('denied'), locate: () => { asked = true; return ok(); } });
    expect(r).toEqual({ status: 'failed', reason: 'denied' });
    expect(asked).toBe(false);
  });

  it('geeft de reden van de browser door', async () => {
    const r = await askForLocation({ requestPermission: () => Promise.resolve(undefined), locate: () => Promise.reject(new LocateError('unsupported')) });
    expect(r).toEqual({ status: 'failed', reason: 'unsupported' });
  });

  it('geeft op na de grens van tien seconden', async () => {
    const r = await askForLocation({ requestPermission: () => Promise.resolve('granted'), locate: () => new Promise(() => undefined), limitMs: 20 });
    expect(r).toEqual({ status: 'failed', reason: 'timeout' });
  });

  it('een onverwachte fout is niet beschikbaar, nooit een uitzondering', async () => {
    const r = await askForLocation({ requestPermission: () => Promise.reject(new Error('stuk')), locate: ok });
    expect(r).toEqual({ status: 'failed', reason: 'unavailable' });
  });
});

describe('je plek voor je etappe', () => {
  it('geeft een plek of een reden, ook als het toestel niet antwoordt', async () => {
    expect(await locateOnce({ locate: ok })).toEqual({ status: 'found', position: { lat: 46.12, lon: 6.93 } });
    expect(await locateOnce({ locate: () => Promise.reject(new LocateError('denied')) })).toEqual({ status: 'failed', reason: 'denied' });
    expect(await locateOnce({ locate: () => new Promise(() => undefined), limitMs: 20 })).toEqual({ status: 'failed', reason: 'timeout' });
  });
});

describe('je plek zonder dat je erom vraagt', () => {
  it('wordt alleen bepaald met een toestemming die er al is', async () => {
    let asked = 0;
    const locate = () => { asked++; return ok(); };
    expect(await locateIfGranted({ getPermission: () => Promise.resolve('prompt'), locate })).toEqual({ status: 'skipped' });
    expect(await locateIfGranted({ getPermission: () => Promise.resolve('denied'), locate })).toEqual({ status: 'skipped' });
    expect(await locateIfGranted({ getPermission: () => Promise.resolve('unknown'), locate })).toEqual({ status: 'skipped' });
    expect(await locateIfGranted({ getPermission: () => Promise.reject(new Error('stuk')), locate })).toEqual({ status: 'skipped' });
    expect(asked).toBe(0);
    expect((await locateIfGranted({ getPermission: () => Promise.resolve('granted'), locate })).status).toBe('found');
    expect(asked).toBe(1);
  });
});
