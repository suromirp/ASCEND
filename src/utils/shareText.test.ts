import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareText, copyText, shareText } from './shareText';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tekst delen', () => {
  it('kopieert met het klembord', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('brief')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('brief');
  });

  it('meldt mislukt als het klembord weigert en er geen terugval is', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('nee')) } });
    expect(await copyText('brief')).toBe(false);
  });

  it('weet of delen kan', () => {
    vi.stubGlobal('navigator', {});
    expect(canShareText()).toBe(false);
    vi.stubGlobal('navigator', { share: vi.fn() });
    expect(canShareText()).toBe(true);
  });

  it('deelt via Web Share met titel en tekst', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    expect(await shareText('Vertrekbrief', 'brief')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Vertrekbrief', text: 'brief' });
  });

  it('behandelt wegtikken als geannuleerd en een andere fout als mislukt', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')) });
    expect(await shareText('a', 'b')).toBe('cancelled');
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('kapot')) });
    expect(await shareText('a', 'b')).toBe('failed');
  });

  it('zegt niet beschikbaar zonder Web Share', async () => {
    vi.stubGlobal('navigator', {});
    expect(await shareText('a', 'b')).toBe('unavailable');
  });
});
