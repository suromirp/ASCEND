import { describe, it, expect, vi } from 'vitest';

const registerPlugin = vi.fn();
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: (...a: unknown[]) => registerPlugin(...a),
}));

import { writeWidgetSummary } from './widgetBridge';

describe('widgetBridge op het web', () => {
  it('doet niets en geeft geen fout', () => {
    expect(() => writeWidgetSummary({ date: '2026-11-04', title: 'Rustdag' })).not.toThrow();
    expect(registerPlugin).not.toHaveBeenCalled();
  });
});
