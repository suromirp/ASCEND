import type { SessionLog } from '../models/training';
import { getModality } from '../data/modalities';
import { getCompatibility, COMPATIBILITY_LABEL } from '../data/garminSuggested';
import { formatDateNL } from '../utils/dates';
import { Card, Eyebrow } from './ui';

const TYPE_LABEL: Record<string, string> = { strength: 'Kracht', cardio: 'Cardio', hiking: 'Avontuur', recovery: 'Herstel', adventure: 'Avontuur' };
const FEEL_LABEL: Record<string, string> = { better: 'Beter dan normaal', normal: 'Normaal', worse: 'Slechter dan normaal' };
const ENVIRONMENT_LABEL: Record<string, string> = { treadmill: 'Treadmill', outdoor: 'Buiten' };

export function LogDetailSheet({ log, templateName, onClose }: { log: SessionLog; templateName: string; onClose: () => void }) {
  const activity = log.outdoorData ?? log.cardioData;
  const modality = activity?.modality ? getModality(log.templateId, activity.modality) : undefined;
  const garminType = activity?.garminSuggestedType;
  const compatibility = garminType ? getCompatibility(log.templateId, garminType) : undefined;

  const rows: { label: string; value: string }[] = [];
  if (modality) rows.push({ label: 'Modaliteit', value: modality.label });
  if (activity?.environment) rows.push({ label: 'Omgeving', value: ENVIRONMENT_LABEL[activity.environment] ?? activity.environment });
  if (activity?.guidanceMode) {
    rows.push({
      label: 'Manier van trainen',
      value: activity.guidanceMode === 'ascend_guided' ? 'ASCEND Guided' : activity.guidanceMode === 'garmin_suggested' ? 'Garmin Suggested' : 'Vrije training',
    });
  }
  if (garminType) rows.push({ label: 'Garmin stelde voor', value: garminType });
  if (activity?.distanceKm !== undefined) rows.push({ label: 'Afstand', value: `${activity.distanceKm} km` });
  if (activity?.elevationGainM !== undefined) {
    rows.push({ label: 'Hoogtemeters D+', value: `${activity.elevationGainM} m${activity.estimatedElevation ? ' (geschat)' : ''}` });
  }
  if (log.outdoorData?.elevationLossM !== undefined) rows.push({ label: 'Hoogtemeters D-', value: `${log.outdoorData.elevationLossM} m` });
  if (log.outdoorData?.steps !== undefined) rows.push({ label: 'Verdiepingen/stappen', value: `${log.outdoorData.steps}` });
  if (log.outdoorData?.machineVerticalM !== undefined) rows.push({ label: 'Machine-vertical', value: `${log.outdoorData.machineVerticalM} m` });
  if (activity?.avgHeartRate !== undefined) rows.push({ label: 'Gem. hartslag', value: `${activity.avgHeartRate} bpm` });
  if (activity?.cadence !== undefined) rows.push({ label: 'Cadans', value: `${activity.cadence}` });
  if (activity?.power !== undefined) rows.push({ label: 'Vermogen', value: `${activity.power} W` });
  if (log.outdoorData?.backpackWeightKg !== undefined) rows.push({ label: 'Rugzakgewicht', value: `${log.outdoorData.backpackWeightKg} kg` });
  if (log.outdoorData?.terrain) rows.push({ label: 'Terrein', value: log.outdoorData.terrain });
  if (log.rpe !== undefined) rows.push({ label: 'RPE', value: `${log.rpe}/10` });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="rounded-b-none border-b-0 pb-8">
          <Eyebrow>{formatDateNL(log.completedDate)}</Eyebrow>
          <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{templateName}</h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {TYPE_LABEL[log.type]} • {log.durationMinutes} min
          </p>

          {log.subjectiveFeel && (
            <p className="mt-2 text-xs font-medium" style={{ color: log.subjectiveFeel === 'worse' ? 'var(--color-warning)' : 'var(--color-gold)' }}>
              {FEEL_LABEL[log.subjectiveFeel]}
            </p>
          )}

          {rows.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between border-b py-1.5 text-sm" style={{ borderColor: 'var(--color-card-border)' }}>
                  <span style={{ color: 'var(--color-ink-dim)' }}>{r.label}</span>
                  <span style={{ color: 'var(--color-ink)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {compatibility && (
            <div
              className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
              style={{
                borderColor: compatibility.compatibility === 'not_equivalent' ? 'var(--color-warning)' : 'var(--color-card-border)',
                color: 'var(--color-ink-dim)',
              }}
            >
              <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{COMPATIBILITY_LABEL[compatibility.compatibility]}. </span>
              {compatibility.note}
            </div>
          )}

          {log.notes && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>NOTITIES</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{log.notes}</p>
            </div>
          )}

          <button onClick={onClose} className="mt-6 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
      </div>
    </div>
  );
}
