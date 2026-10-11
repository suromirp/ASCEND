import { describe, it, expect } from 'vitest';
import { assessOnCourse } from './onCourse';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-07', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 8 }, { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 8 }] };
const pattern = ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];

// Weeks starting 7 Sep; `skip(weekIndex, templateId)` decides what was not logged.
function history(weeks: number, skip: (w: number, templateId: string) => boolean) {
  const planned: PlannedSession[] = [];
  const logs: SessionLog[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = addDays('2026-09-07', 7 * w);
    pattern.forEach((templateId, d) => {
      const date = addDays(monday, d);
      const id = `${w}-${templateId}`;
      planned.push({ id, templateId, scheduledDate: date, weekStartDate: monday, status: 'planned', order: d });
      if (templateId !== 'tpl_herstel' && !skip(w, templateId)) {
        logs.push({ id: `l-${id}`, plannedSessionId: id, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual' });
      }
    });
  }
  return { planned, logs };
}

const base = { goalName: 'de GR5', goalDate: '2027-08-01', program, templates, planChangeLog: [] };

describe('assessOnCourse', () => {
  it('waits two full weeks before judging', () => {
    const { planned, logs } = history(2, () => false);
    const a = assessOnCourse({ ...base, today: '2026-09-17', plannedSessions: planned, logs });
    expect(a.status).toBe('early');
    expect(a.headline).toBe('Net begonnen');
  });

  it('on course when almost everything and every long training was done', () => {
    const { planned, logs } = history(5, (w, t) => w === 1 && t === 'tpl_hill_intervals');
    const a = assessOnCourse({ ...base, today: '2026-10-07', plannedSessions: planned, logs });
    expect(a.status).toBe('on');
    expect(a.summary).toBe('Laatste 4 weken: 23 van 24 trainingen, lange training 4 van 4');
  });

  it('nearly, and names the long training when that is what fell away', () => {
    const { planned, logs } = history(5, (w, t) => (w === 1 || w === 2) && t === 'tpl_long_run');
    const a = assessOnCourse({ ...base, today: '2026-10-07', plannedSessions: planned, logs });
    expect(a.status).toBe('nearly');
    expect(a.lines[0]).toContain('lange training');
    expect(a.lines.some((l) => l.startsWith('Lange duurloop viel 2 van de 4 weken weg'))).toBe(true);
  });

  it('behind when a lot was missed, and says there is still time', () => {
    const { planned, logs } = history(5, (w, t) => w >= 1 && ['tpl_easy_run', 'tpl_hill_intervals', 'tpl_long_run'].includes(t));
    const a = assessOnCourse({ ...base, today: '2026-10-07', plannedSessions: planned, logs });
    expect(a.status).toBe('behind');
    expect(a.headline).toBe('Achter op schema');
    expect(a.lines.some((l) => l.includes('Tijd genoeg'))).toBe(true);
    expect(a.lines.length).toBeLessThanOrEqual(3);
  });
});
