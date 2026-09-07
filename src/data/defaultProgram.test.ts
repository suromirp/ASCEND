import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from './defaultProgram';
import { isLegHeavyTemplate, isIntentionalBackToBack } from '../engine/scheduler';
import { daysBetween } from '../utils/dates';

// Fase 6 (sports-science review, item F2): buildPlannedSessions' fixed
// defaultDayOfWeek materialization is deliberately NOT replaced with a
// dynamic "key-session-first" scheduling algorithm — every fresh install
// gets the exact same, identical template set with no per-user variance to
// actually optimize over, so a live scheduler running at seed time would
// just re-derive this same hand-designed pattern. Building on Fase 2's
// reworked leg-heavy mechanism here instead means: verify the hand-designed
// default week already respects it, and lock that in as a regression test
// so a future defaultDayOfWeek edit can't silently reintroduce an
// unintentional back-to-back leg-heavy conflict.
describe('buildDefaultProgramData — default week respects Fase 2 leg-heavy spacing', () => {
  it('never places two leg-heavy sessions within 1 calendar day of each other, except the intentional weekend exception', () => {
    const { templates, plannedSessions } = buildDefaultProgramData();
    const templateById = new Map(templates.map((t) => [t.id, t]));

    const legHeavySessions = plannedSessions
      .filter((s) => isLegHeavyTemplate(templateById.get(s.templateId)!))
      .sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));

    expect(legHeavySessions.length).toBeGreaterThan(0); // sanity check — the assertion below would be vacuous otherwise

    for (let i = 0; i < legHeavySessions.length - 1; i++) {
      const a = legHeavySessions[i];
      const b = legHeavySessions[i + 1];
      const gap = Math.abs(daysBetween(a.scheduledDate, b.scheduledDate));
      if (gap <= 1 && !isIntentionalBackToBack(a.templateId, b.templateId)) {
        throw new Error(`Unintentional leg-heavy conflict: ${a.templateId} (${a.scheduledDate}) and ${b.templateId} (${b.scheduledDate}) are ${gap} day(s) apart`);
      }
    }
  });

  it('the weekend hill-intervals + long-run pairing is the one deliberate exception, still leg-heavy on both sides', () => {
    const { templates } = buildDefaultProgramData();
    const templateById = new Map(templates.map((t) => [t.id, t]));
    expect(isLegHeavyTemplate(templateById.get('tpl_hill_intervals')!)).toBe(true);
    expect(isLegHeavyTemplate(templateById.get('tpl_long_run')!)).toBe(true);
    expect(isIntentionalBackToBack('tpl_hill_intervals', 'tpl_long_run')).toBe(true);
  });
});
