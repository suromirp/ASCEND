import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalibrationNotice } from './CalibrationNotice';

const noop = async () => undefined;
const html = (phase: 'open' | 'added' | 'gone') => renderToStaticMarkup(<CalibrationNotice name="Barbell Back Squat" phase={phase} onAccept={noop} onLater={() => undefined} onSettings={() => undefined} />);

describe('CalibrationNotice volgt de werkelijke stand', () => {
  it('zegt dat er een set bij staat zolang hij er staat', () => {
    expect(html('added')).toContain('Er staat een set bij Barbell Back Squat');
  });
  it('zegt na Lichter dat de set er niet meer bij staat, zonder "haal hem weg"', () => {
    const out = html('gone');
    expect(out).toContain('staat er nu niet bij');
    expect(out).not.toContain('haal hem dan weg');
  });
});
