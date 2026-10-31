import { describe, expect, it } from 'vitest';
import { weekdayPattern } from './weekdayPattern';
import type { PlannedSession } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';

// Nagemaakte planning: acht weken met een training op dinsdag en op donderdag.
const today = '2026-10-31'; // zaterdag
const firstMonday = addDays(mondayOfWeek(today), -7 * 7);
function plan(): PlannedSession[] {
  const out: PlannedSession[] = [];
  for (let w = 0; w < 8; w++) {
    for (const [offset, name] of [[1, 'di'], [3, 'do']] as const) {
      const date = addDays(firstMonday, w * 7 + offset);
      out.push({ id: `${name}${w}`, templateId: 'tpl_run', scheduledDate: date, weekStartDate: addDays(firstMonday, w * 7), status: 'planned' } as PlannedSession);
    }
  }
  return out;
}
const logsFor = (ids: string[]) => ids.map((id) => ({ plannedSessionId: id }));
const allDone = (except: string[] = []) => logsFor(plan().map((s) => s.id).filter((id) => !except.includes(id)));

describe('patronen per weekdag', () => {
  it('zegt niets als alles gewoon doorgaat', () => {
    expect(weekdayPattern({ today, planned: plan(), logs: allDone() })).toBeUndefined();
  });

  it('ziet een weekdag waarop de training duidelijk vaker wegvalt', () => {
    const p = weekdayPattern({ today, planned: plan(), logs: allDone(['do0', 'do2', 'do3', 'do5', 'do6']) });
    expect(p?.weekday).toBe(4);
    expect(p?.missed).toBe(5);
    expect(p?.text).toBe('Op donderdag viel je training de laatste acht weken vijf van de acht keer weg. Misschien past een andere dag beter in je week.');
  });

  it('drie keer is te weinig, en vallen beide dagen even vaak weg dan is het geen patroon', () => {
    expect(weekdayPattern({ today, planned: plan(), logs: allDone(['do0', 'do2', 'do3']) })).toBeUndefined();
    expect(weekdayPattern({ today, planned: plan(), logs: allDone(['do0', 'do2', 'do3', 'do5', 'di0', 'di2', 'di3', 'di5']) })).toBeUndefined();
  });

  it('vrije dagen tellen niet mee, en een training die jij verschoof telt op de oude dag', () => {
    const missing = ['do0', 'do2', 'do3', 'do5'];
    const excludedDays = new Set(missing.map((id) => plan().find((s) => s.id === id)!.scheduledDate));
    expect(weekdayPattern({ today, planned: plan(), logs: allDone(missing), excludedDays })).toBeUndefined();
    const moved = plan().map((s) => (missing.includes(s.id) ? { ...s, status: 'moved' as const, movedFromDate: s.scheduledDate, scheduledDate: addDays(s.scheduledDate, 1) } : s));
    expect(weekdayPattern({ today, planned: moved, logs: allDone() })?.weekday).toBe(4);
  });
});
