import { describe, expect, it } from 'vitest';
import { clearBriefingReturn, markBriefingReturn, takeBriefingReturn } from './briefingReturn';

const AT = 1_000_000;

describe('takeBriefingReturn: één keer', () => {
  it('opent één keer; een tweede keer terug opent niets meer', () => {
    clearBriefingReturn();
    markBriefingReturn({ origin: 'mission', templateId: 'tpl-run', date: '2026-11-15', path: '/' }, AT);
    expect(takeBriefingReturn({ path: '/', back: true, origin: 'sheet' }, AT + 1)).toBeUndefined();
    expect(takeBriefingReturn({ path: '/', back: true, origin: 'mission' }, AT + 2)?.templateId).toBe('tpl-run');
    expect(takeBriefingReturn({ path: '/', back: true, origin: 'mission' }, AT + 3)).toBeUndefined();
  });
});
