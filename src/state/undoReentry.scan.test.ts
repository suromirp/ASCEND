import { describe, expect, it } from 'vitest';
import goalActions from './goalActions.ts?raw';
import weekAdjustments from '../components/WeekAdjustments.tsx?raw';

// Lookout 14 november: na Ongedaan maken van de rustiger instap toonden Week en Vandaag de oude duur tot herladen,
// en de melding verdween met het blad. undoReentry ververst zoals Akkoord en zet de uitkomst in de meldingsbalk.
const src = goalActions;
const body = src.slice(src.indexOf('const undoReentry'), src.indexOf('return { clearMilestoneManually'));

describe('Ongedaan maken van de rustiger instap', () => {
  it('ververst de planning en de registers, en laat een melding staan', () => {
    expect(body).toContain('bumpPlanRevision()');
    expect(body).toContain('await refresh()');
    expect(body).toContain('setRecentChange(');
    expect(body).toContain("title: 'Rustiger instap teruggezet'");
  });
  it('het blad gebruikt die actie, niet een losse instelling', () => {
    const sheet = weekAdjustments;
    expect(sheet).toContain('undoReentry(from)');
    expect(sheet).not.toContain('updateSettings');
  });
});
