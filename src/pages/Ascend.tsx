import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { computeReadiness } from '../engine/readiness';
import { computeObjectiveProgress } from '../engine/progression';
import { MetricBar } from '../components/MetricBar';
import { AscentLadder } from '../components/AscentLadder';
import { MilestoneDetailSheet } from '../components/MilestoneDetailSheet';
import { getGR5MilestoneDetail, GR5_PACKING_LIST, GR5_PACKING_NOTE, GR5_PACKING_SOURCES, GR5_TRAINING_SPLIT_SOURCES } from '../data/gr5Details';
import { Card, Eyebrow } from '../components/ui';

export function AscendPage() {
  const { sessionLogs, plannedSessions, objectives, milestoneProgress, clearMilestoneManually } = useAppData();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showPackingList, setShowPackingList] = useState(false);

  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);
  const objective = objectives[0];
  const progress = useMemo(
    () => (objective ? computeObjectiveProgress(objective, milestoneProgress, sessionLogs) : null),
    [objective, milestoneProgress, sessionLogs],
  );
  const selectedMilestone = progress?.milestones.find((m) => m.definition.id === selectedMilestoneId);
  const selectedDetail = selectedMilestone ? getGR5MilestoneDetail(selectedMilestone.definition.order) : undefined;

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-6">
      <div>
        <Eyebrow>ASCEND READINESS</Eyebrow>
        <p className="mt-1 font-display text-4xl" style={{ color: 'var(--color-gold)' }}>{readiness.overall}%</p>
      </div>

      <Card className="flex flex-col gap-4">
        <MetricBar label="KRACHT" value={readiness.strength} />
        <MetricBar label="CARDIO" value={readiness.cardio} />
        <MetricBar label="KLIMMEN / D+" value={readiness.climbing} accent="alpine" />
        <MetricBar label="UITHOUDING" value={readiness.endurance} />
        <MetricBar label="HERSTEL" value={readiness.recovery} accent="alpine" />
        <MetricBar label="CONSISTENTIE" value={readiness.consistency} />
        <MetricBar label="RUGZAKCAPACITEIT" value={readiness.packCapability} />
      </Card>

      {progress && (
        <AscentLadder
          progress={progress}
          onMarkCleared={(milestoneId) => clearMilestoneManually(objective.id, milestoneId)}
          onSelectMilestone={setSelectedMilestoneId}
        />
      )}

      <Card className="flex flex-col gap-3">
        <Eyebrow>TRAININGSVERDELING RICHTING GR5</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Hardlopen blijft in het schema — het is een goede aerobe aanvulling en gaat niet ten koste van kracht.
          De verhouding verschuift wel steeds meer richting echte hiking-specificiteit naarmate de GR5 dichterbij komt.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>4× kracht / hypertrofie</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1–2× hardlopen — aerobe basis, later snelheid/drempel</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1× bergspecifiek — incline / D+ / echte hike</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>regelmatig: lange hike, afdaling, rugzak, back-to-back</li>
        </ul>
        <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          {GR5_TRAINING_SPLIT_SOURCES.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline underline-offset-2"
              style={{ color: 'var(--color-sky)' }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <button onClick={() => setShowPackingList((s) => !s)} className="flex items-center justify-between gap-3 text-left">
          <div>
            <Eyebrow>LATER: ALPINE / GR5-MATERIAAL</Eyebrow>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog niet nodig voor Maand 1 — de volledige uitrusting voor een echte GR5-etappe.</p>
          </div>
          <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>{showPackingList ? '−' : '+'}</span>
        </button>

        {showPackingList && (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
              {GR5_PACKING_LIST.map((item) => (
                <li key={item} className="flex gap-2">
                  <span style={{ color: 'var(--color-gold)' }}>·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{GR5_PACKING_NOTE}</p>
            <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              {GR5_PACKING_SOURCES.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline underline-offset-2"
                  style={{ color: 'var(--color-sky)' }}
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          </>
        )}
      </Card>

      {selectedMilestone && selectedDetail && (
        <MilestoneDetailSheet
          title={selectedMilestone.definition.title}
          detail={selectedDetail}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}
    </div>
  );
}
