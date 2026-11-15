import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Het blad Weekbudget met krachttraining aan en uit: bij uit verdwijnt de stepper Keer kracht per week.
let settings: Record<string, unknown> = {};
vi.mock('../../../state/AppDataContext', () => ({ useAppData: () => ({ settings, updateSettings: async () => undefined, program: null }) }));
vi.mock('../Sheet', () => ({ Sheet: ({ children }: { children: ReactNode | ((close: () => void) => ReactNode) }) => createElement('div', null, typeof children === 'function' ? children(() => undefined) : children) }));

async function render(s: Record<string, unknown>) {
  settings = s;
  const { WeekBudgetSheet } = await import('./WeekBudgetSheet');
  return renderToStaticMarkup(createElement(WeekBudgetSheet, { onClose: () => undefined }));
}

describe('Weekbudget en krachttraining', () => {
  it('kracht aan: de stepper Keer kracht per week staat er', async () => {
    const html = await render({});
    expect(html).toContain('Keer kracht per week');
    expect(html).not.toContain('Krachttraining staat uit');
  });
  it('kracht uit: geen stepper, wel één regel die zegt waarom', async () => {
    const html = await render({ strengthTraining: false });
    expect(html).not.toContain('Keer kracht per week');
    expect(html).toContain('Krachttraining staat uit');
  });
});
