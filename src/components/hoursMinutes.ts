// Minuten als uren en minuten, "2:21". Eerst afronden op hele minuten en dan
// pas delen, zodat 119,6 minuten "2:00" wordt en niet "1:00" (de minuten
// afronden na het delen schoof het uur niet mee).
export function hoursMinutes(minutes: number): string {
  const m = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
