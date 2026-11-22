import { describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { CalibrationNotice } from './CalibrationNotice';

// I-83: de kaart IJkset heeft een weg naar de instelling, alleen in de stand open. Nagemaakte naam.
type Phase = 'open' | 'added' | 'gone';
type Found = { label: string; onClick?: () => void };
const tree = (phase: Phase, onSettings: () => void): ReactElement =>
  CalibrationNotice({ name: 'Barbell Bench Press', phase, onAccept: async () => undefined, onLater: () => undefined, onSettings }) as ReactElement;

function buttons(node: ReactNode, out: Found[] = []): Found[] {
  if (Array.isArray(node)) { node.forEach((n) => buttons(n, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  const el = node as ReactElement<{ children?: ReactNode; onClick?: () => void }>;
  if (typeof el.props.onClick === 'function') out.push({ label: ([] as ReactNode[]).concat(el.props.children ?? '').join(''), onClick: el.props.onClick });
  buttons(el.props.children, out);
  return out;
}

describe('CalibrationNotice, de weg naar de instelling', () => {
  it('staat alleen in de stand open, naast Niet nu en Akkoord, en roept de sprong aan', () => {
    const jump = vi.fn();
    const open = buttons(tree('open', jump));
    expect(open.map((b) => b.label)).toEqual(['Niet nu', 'Akkoord', 'IJkset aanpassen']);
    open[2].onClick?.();
    expect(jump).toHaveBeenCalledTimes(1);
    expect(buttons(tree('added', jump))).toEqual([]);
    expect(buttons(tree('gone', jump))).toEqual([]);
  });

  it('ForgeWorkout sluit eerst, springt naar de rij in Forge en onthoudt de terugweg', () => {
    const src = Object.values(import.meta.glob<string>('./ForgeWorkout.tsx', { query: '?raw', import: 'default', eager: true }))[0] ?? '';
    expect(src).not.toBe('');
    const jump = "jumpRoute('forge', { jumpTo: 'forge-ijkset', openSheet: true })";
    expect(src).toContain(jump);
    expect(src.indexOf('onClose();')).toBeGreaterThan(-1);
    expect(src.indexOf(jump)).toBeGreaterThan(src.indexOf('rememberTrainingReturn({'));
    expect(src.indexOf(jump)).toBeGreaterThan(src.lastIndexOf('onClose();', src.indexOf(jump)));
  });
});
