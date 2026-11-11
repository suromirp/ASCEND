import { describe, expect, it } from 'vitest';
import { SAVE_HINT, SEND_HINT, SEND_LABEL, WATCH_STEPS, routeActionLine, sendLine, watchSteps, type RouteSendOutcome } from './routeSend';

describe('de teksten bij Naar Garmin Connect', () => {
  const all: RouteSendOutcome[] = [{ kind: 'offered' }, { kind: 'shared' }, { kind: 'cancelled' }, { kind: 'waiting' }, { kind: 'unavailable' }, { kind: 'failed', step: 'file' }, { kind: 'failed', step: 'open' }, { kind: 'failed', step: 'slow' }];

  it('elke uitkomst heeft een zichtbare regel, zonder gedachtestreepje', () => {
    for (const o of all) {
      const line = sendLine(o);
      expect(line.text.length).toBeGreaterThan(0);
      expect(line.text).not.toMatch(/[–—]/);
    }
  });

  it('alleen een echte fout of geen weg is amber; wegtikken en wachten niet', () => {
    expect(all.filter((o) => sendLine(o).warn).map((o) => o.kind)).toEqual(['unavailable', 'failed', 'failed', 'failed']);
  });

  it('de vaste regels en de drie stappen naar het horloge', () => {
    expect(SEND_LABEL).toBe('Naar Garmin Connect');
    expect(SEND_HINT).toBe('Kies Garmin Connect in het venster en sla de lus op als koers.');
    expect(SAVE_HINT).toContain('Garmin Connect');
    expect(WATCH_STEPS).toHaveLength(3);
    expect(WATCH_STEPS[2]).toContain('Navigatie, Koersen');
  });
});

describe('de ene regel onder de knoppen', () => {
  it('voor een tik: wat je doet, met of zonder Naar Garmin Connect', () => {
    expect(routeActionLine(true)).toEqual({ text: SEND_HINT, warn: false });
    expect(routeActionLine(false)).toEqual({ text: SAVE_HINT, warn: false });
  });

  it('na een tik staat de uitkomst op dezelfde plek', () => {
    expect(routeActionLine(true, { send: { kind: 'shared' } })).toEqual(sendLine({ kind: 'shared' }));
    expect(routeActionLine(true, { file: { ok: false } })).toEqual({ text: 'Opslaan lukte niet. Probeer het nog eens.', warn: true });
  });

  it('na opslaan of downloaden volgt de stap naar Garmin Connect in dezelfde regel', () => {
    expect(routeActionLine(true, { file: { ok: true, where: 'download', name: 'ascend-route-simpel-2026-11-15.gpx' } }).text).toBe(`Gedownload als ascend-route-simpel-2026-11-15.gpx. ${SAVE_HINT}`);
    expect(routeActionLine(false, { file: { ok: true, where: 'folder', name: 'a.gpx', label: 'Documenten/ASCEND' } }).text).toBe(`Opgeslagen als a.gpx in Documenten/ASCEND. ${SAVE_HINT}`);
  });
});

describe('watchSteps (blad achter de i)', () => {
  it('stap 1 zegt hoe het bestand in Garmin Connect komt, één keer', () => {
    expect(watchSteps(false)[0]).toBe(`${SAVE_HINT} Dat vraagt internet.`);
    expect(watchSteps(true)[0]).toBe(`${SEND_HINT} Dat vraagt internet.`);
    expect(watchSteps(true).slice(1)).toEqual(WATCH_STEPS.slice(1));
    expect(watchSteps(false)).toHaveLength(WATCH_STEPS.length);
  });
});
