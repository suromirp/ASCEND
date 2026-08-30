import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { computeReadiness } from '../engine/readiness';
import { computeObjectiveProgress } from '../engine/progression';
import { MetricBar } from '../components/MetricBar';
import { AscentLadder } from '../components/AscentLadder';
import { Card, Eyebrow } from '../components/ui';

export function AscendPage() {
  const { sessionLogs, plannedSessions, objectives, milestoneProgress, clearMilestoneManually } = useAppData();

  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);
  const objective = objectives[0];
  const progress = useMemo(
    () => (objective ? computeObjectiveProgress(objective, milestoneProgress, sessionLogs) : null),
    [objective, milestoneProgress, sessionLogs],
  );

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
        />
      )}
    </div>
  );
}
