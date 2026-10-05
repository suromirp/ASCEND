import { useAppData } from '../state/AppDataContext';
import { predictDuration, MIN_LOGS_TO_LEARN } from '../engine/durationLearning';
import { todayISO } from '../utils/dates';
import { NumberField } from './NumberField';

// Settings → Training → Krachttraining: how long each strength training
// takes. You set a starting estimate; ASCEND learns from how long the full
// training really took and says which number it uses now.
export function StrengthDurationSettings() {
  const { templates, plannedSessions, sessionLogs, settings, updateSettings, refresh } = useAppData();
  const today = todayISO();
  const strength = templates.filter(
    (t) => t.type === 'strength' && !t.weeklyProgression && (t.defaultDayOfWeek || plannedSessions.some((s) => s.templateId === t.id && s.scheduledDate >= today)),
  );
  if (strength.length === 0) return null;
  const estimates = settings.sessionDurationEstimates ?? {};

  async function setEstimate(templateId: string, minutes: number | undefined) {
    const next = { ...estimates };
    if (minutes && minutes > 0) next[templateId] = Math.round(minutes);
    else delete next[templateId];
    await updateSettings({ sessionDurationEstimates: next });
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Hoe lang een krachttraining duurt</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          Vul in hoe lang je denkt dat elke training duurt. Na {MIN_LOGS_TO_LEARN} keer afvinken met de echte duur rekent ASCEND met wat je meestal nodig hebt. Daarmee kloppen je week en je dagbudget.
        </p>
      </div>
      {strength.map((t) => {
        const prediction = predictDuration(t, sessionLogs, estimates[t.id]);
        const note = prediction.source === 'learned'
          ? `ASCEND rekent nu met ${prediction.minutes} min, wat je meestal nodig had de laatste ${prediction.basedOn} keer.`
          : prediction.source === 'estimate'
            ? `ASCEND rekent met jouw schatting, tot er ${MIN_LOGS_TO_LEARN} trainingen met duur zijn.`
            : `ASCEND rekent met de standaard ${prediction.minutes} min, tot er ${MIN_LOGS_TO_LEARN} trainingen met duur zijn.`;
        return (
          <div key={t.id} className="flex flex-col gap-1">
            <NumberField label={t.name} unit="min" value={estimates[t.id]} placeholder={String(t.durationVariants.full)} onChange={(v) => void setEstimate(t.id, v)} compact />
            <p className="text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
          </div>
        );
      })}
    </div>
  );
}
