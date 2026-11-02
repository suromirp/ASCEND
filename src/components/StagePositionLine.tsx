// ASCEND: Vandaag, op een dag van je GR5-etappe: hoeveel kilometer je nog hebt tot het eind en welke
// plek daarna komt (engine/stagePosition.ts). Alleen met Je locatie aan en alleen als de etappe van
// vandaag coordinaten heeft; anders staat er niets. Je plek wordt één keer gevraagd als de regel
// verschijnt en opnieuw als je erom vraagt, met een grens van tien seconden. Hij blijft in het
// geheugen van dit scherm: geen spoor, geen route, niets bewaard (docs/beslissingen/2026-11-02-locatie.md).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useTripPlan } from '../state/useTripPlan';
import { GR5_STAGES } from '../data/gr5Stages';
import { mainGoal } from '../engine/mainGoal';
import { buildItinerary, walkDayOn } from '../engine/routePlan';
import { locationEnabled, stageLocateFailureText } from '../engine/locationSetting';
import { stageHasCoords, stagePosition, stagePositionText, type StagePosition } from '../engine/stagePosition';
import { updatedLabel } from '../engine/weather';
import { locateOnce } from '../storage/locationSwitch';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { TextButton } from './TextButton';

type Shown = { kind: 'busy' } | { kind: 'ok'; position: StagePosition; at: string } | { kind: 'fail'; text: string };

// Het hek: pas als alles klopt wordt het etappeplan gelezen, zodat Vandaag er anders niets voor doet.
export function StagePositionLine() {
  const { settings, trainingGoals, goalMilestones } = useAppData();
  const startDate = mainGoal(trainingGoals, goalMilestones, 'live')?.targetDate;
  if (!startDate || !locationEnabled(settings) || !GR5_STAGES.some(stageHasCoords)) return null;
  return <StagePositionCard startDate={startDate} />;
}

function StagePositionCard({ startDate }: { startDate: string }) {
  const { plan, loaded } = useTripPlan();
  const today = todayISO();
  const day = useMemo(() => (loaded ? walkDayOn(buildItinerary(plan, startDate), today) : undefined), [loaded, plan, startDate, today]);
  const hasCoords = !!day && day.stages.every(stageHasCoords);
  const [shown, setShown] = useState<Shown>({ kind: 'busy' });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const stages = day?.stages;
  // Vraagt je plek; zet zelf niets synchroon, zodat een effect hem veilig kan aanroepen.
  const locate = useCallback(() => {
    if (!stages) return;
    void locateOnce().then((result) => {
      if (!alive.current) return;
      if (result.status === 'failed') {
        setShown({ kind: 'fail', text: stageLocateFailureText(result.reason) });
        return;
      }
      const position = stagePosition(stages, result.position);
      setShown(position ? { kind: 'ok', position, at: new Date().toISOString() } : { kind: 'fail', text: stageLocateFailureText('away') });
    });
  }, [stages]);

  const dayNumber = day?.dayNumber;
  useEffect(() => {
    if (hasCoords) locate();
  }, [hasCoords, dayNumber, locate]);
  const again = () => {
    setShown({ kind: 'busy' });
    locate();
  };

  if (!day || !hasCoords) return null;
  return (
    <Card className="flex flex-col gap-1">
      <Eyebrow>Op je etappe, {day.from} naar {day.to}</Eyebrow>
      {shown.kind === 'busy' && <p className="text-sm" role="status" style={{ color: 'var(--color-ink-dim)' }}>Je plek wordt bepaald. Dit duurt hoogstens tien seconden.</p>}
      {shown.kind === 'ok' && (
        <>
          <p className="text-sm leading-relaxed tabular-nums" role="status" style={{ color: 'var(--color-ink)' }}>{stagePositionText(shown.position)}</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Je plek, {updatedLabel(shown.at)}. Die blijft alleen op dit scherm en wordt nergens bewaard.
          </p>
        </>
      )}
      {shown.kind === 'fail' && <p className="text-sm leading-relaxed" role="status" style={{ color: 'var(--color-warning)' }}>{shown.text}</p>}
      {shown.kind !== 'busy' && (
        <TextButton className="self-start" onClick={again}>Opnieuw bepalen</TextButton>
      )}
    </Card>
  );
}
