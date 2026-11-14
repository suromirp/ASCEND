import { describe, expect, it } from 'vitest';
import { CHUNK_LINE, CHUNK_TITLE, isChunkLoadError } from './chunkLoadError';

describe('isChunkLoadError', () => {
  it('herkent de meldingen van de browsers bij een scherm dat niet laadt', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/Weather.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('laat een gewone fout met rust', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('de tekst is Nederlands en zonder gedachtestreepjes', () => {
    for (const t of [CHUNK_TITLE, CHUNK_LINE]) expect(t).not.toMatch(/[–—]/);
    expect(CHUNK_LINE).toMatch(/verbinding/);
  });
});
