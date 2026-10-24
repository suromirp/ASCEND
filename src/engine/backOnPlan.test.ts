import { describe, it, expect } from 'vitest';
import { proposeBackOnPlan, proposeMove } from './scheduler';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { daysBetween } from '../utils/dates';
import type { PlannedSession } from '../models/training';

// Doorloop, punt 4: een overgeslagen training kon alleen terug via Ongedaan
// maken in de melding. "Toch doen" zet hem terug op zijn dag als dat volgens de
// regels kan, anders komt er een voorstel.

const { templates } = buildDefaultProgramData();
const WEEK = '2026-10-19';
const TODAY = '2026-10-20';
const row = (id: string, templateId: string, date: string, status: PlannedSession['status'] = 'planned'): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: WEEK, status, order: 0 });

describe('Toch doen: een overgeslagen training terug op de planning', () => {
  it('past hij op zijn dag, dan staat hij er weer, zonder andere verandering', () => {
    const week = [row('run', 'tpl_easy_run', '2026-10-19'), row('upper', 'tpl_upper_b', '2026-10-23', 'skipped'), row('long', 'tpl_long_run', '2026-10-25')];
    const p = proposeBackOnPlan(week, templates, 'upper', [], null, undefined, undefined, TODAY);
    expect(p.resolved).toBe(true);
    expect(p.changes).toEqual([expect.objectContaining({ sessionId: 'upper', fromDate: '2026-10-23', toDate: '2026-10-23', restore: true })]);
  });

  it('botst hij met een zware beendag, dan komt er een voorstel dat de ander verschuift', () => {
    const week = [row('lower', 'tpl_lower_a', '2026-10-21', 'skipped'), row('hills', 'tpl_hill_intervals', '2026-10-22')];
    const p = proposeBackOnPlan(week, templates, 'lower', [], null, undefined, undefined, TODAY);
    expect(p.changes[0]).toMatchObject({ sessionId: 'lower', restore: true });
    expect(p.changes.length).toBeGreaterThan(1);
  });

  it('een dag die al voorbij is kan niet terug', () => {
    const week = [row('upper', 'tpl_upper_b', '2026-10-19', 'skipped')];
    const p = proposeBackOnPlan(week, templates, 'upper', [], null, undefined, undefined, TODAY);
    expect(p.changes).toEqual([]);
    expect(p.resolved).toBe(false);
  });
});

describe('verplaatsen op de 48-uursregel', () => {
  it('ruilt Heuvelsprints en afdalen en de lange duurloop niet om tot ze nog 24 uur na elkaar liggen in de verkeerde volgorde', () => {
    // Heuvelsprints en afdalen op zaterdag naar zondag, waar de lange duurloop staat.
    // Een volle week: alleen de zaterdag komt vrij.
    const week = [
      row('run', 'tpl_easy_run', '2026-10-19'), row('upa', 'tpl_upper_a', '2026-10-20'), row('lower', 'tpl_lower_a', '2026-10-21'), row('rest', 'tpl_herstel', '2026-10-22'),
      row('upb', 'tpl_upper_b', '2026-10-23'), row('hills', 'tpl_hills_descent', '2026-10-24'), row('long', 'tpl_long_run', '2026-10-25'),
    ];
    const p = proposeMove(week, templates, 'hills', '2026-10-25', [], null, undefined, undefined, TODAY);
    const long = p.changes.find((c) => c.sessionId === 'long');
    // Zo lost het niets op: de lange duurloop op zaterdag, de heuvels erna op zondag.
    expect(p.resolved && long ? daysBetween(long.toDate, '2026-10-25') : undefined).not.toBe(1);
    // Wat het voorstel zegt, klopt met wat het doet: geen "48 uur" als er niets is opgelost.
    if (!p.resolved) expect(p.reason).not.toMatch(/schuift op\.$/);
  });
});
