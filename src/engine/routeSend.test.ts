import { describe, expect, it } from 'vitest';
import { SAVE_HINT, SEND_HINT, SEND_LABEL, WATCH_STEPS, sendLine, type RouteSendOutcome } from './routeSend';

describe('de teksten bij Naar Garmin Connect', () => {
  const all: RouteSendOutcome[] = [{ kind: 'offered' }, { kind: 'shared' }, { kind: 'cancelled' }, { kind: 'waiting' }, { kind: 'unavailable' }, { kind: 'failed', step: 'file' }, { kind: 'failed', step: 'open' }];

  it('elke uitkomst heeft een zichtbare regel, zonder gedachtestreepje', () => {
    for (const o of all) {
      const line = sendLine(o);
      expect(line.text.length).toBeGreaterThan(0);
      expect(line.text).not.toMatch(/[–—]/);
    }
  });

  it('alleen een echte fout of geen weg is amber; wegtikken en wachten niet', () => {
    expect(all.filter((o) => sendLine(o).warn).map((o) => o.kind)).toEqual(['unavailable', 'failed', 'failed']);
  });

  it('de vaste regels en de drie stappen naar het horloge', () => {
    expect(SEND_LABEL).toBe('Naar Garmin Connect');
    expect(SEND_HINT).toBe('Kies Garmin Connect in het venster en sla hem op als koers.');
    expect(SAVE_HINT).toContain('Garmin Connect');
    expect(WATCH_STEPS).toHaveLength(3);
    expect(WATCH_STEPS[2]).toContain('Navigatie, Koersen');
  });
});
