import type { SessionTemplate } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { bootReminderLine } from '../../engine/bootBreakIn';
import { useJourney } from './useJourney';

// Eén korte regel op een lange wandeling of bergtocht met rugzak, zolang de nieuwe
// bergschoenen niet ingelopen zijn. Verandert niets aan de planning
// (engine/bootBreakIn.ts#bootReminderLine).
export function BootReminderLine({ template, className = '' }: { template: SessionTemplate; className?: string }) {
  const { settings } = useAppData();
  const { boots } = useJourney();
  const line = bootReminderLine(template, boots, settings.bootBreakInReminder !== false);
  if (!line) return null;
  return <p className={`text-sm leading-snug ${className}`} style={{ color: 'var(--color-ink-dim)' }}>{line}</p>;
}
