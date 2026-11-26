// ASCEND: onder Feestdagen voorstellen in het blad Rond een vakantie: wat het ophalen deed (engine/publicHolidays.ts
// #holidayStatusLine), en na een mislukte poging Opnieuw proberen, met dezelfde tijdsgrens. Alleen weergave.
import { useAppData } from '../../../state/AppDataContext';
import { usePublicHolidays } from '../../../state/usePublicHolidays';
import { holidayStatusLine } from '../../../engine/publicHolidays';
import { TextButton } from '../../TextButton';

export function HolidayStatus() {
  const { settings } = useAppData();
  const holidays = usePublicHolidays(settings);
  const line = holidayStatusLine(holidays, holidays.country, holidays.busy);
  if (!line) return null;
  return (
    <div className="mt-3 flex flex-col items-start gap-1">
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }} role="status" aria-live="polite">{line}</p>
      {holidays.status === 'failed' && (
        <TextButton tone="dim" onClick={holidays.retry} disabled={holidays.busy} className="-ml-1 px-1">Opnieuw proberen</TextButton>
      )}
    </div>
  );
}
