// ASCEND: Vandaag, op een dag van je GR5-etappe: hoeveel kilometer je nog hebt tot het eind en welke
// plek daarna komt (engine/stagePosition.ts). Alleen met Je locatie aan en alleen als de etappe van
// vandaag coordinaten heeft; anders staat er niets. Je plek wordt één keer gevraagd als de regel
// verschijnt en opnieuw als je erom vraagt, met een grens van tien seconden. Hij blijft in het
// geheugen van dit scherm: geen spoor, geen route, niets bewaard (docs/beslissingen/2026-11-02-locatie.md).
// Begin en eind van de etappe en het spoor komen uit OpenStreetMap; het spoor wordt pas hier geladen
// (data/gr5Tracks.ts) en de regel noemt de bron (docs/beslissingen/2026-11-11-gr5-uit-osm.md).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useTripPlan } from '../state/useTripPlan';
import { GR5_STAGES } from '../data/gr5Stages';
import { GR5_OSM_ATTRIBUTION, GR5_OSM_LICENSE_URL, loadGr5Tracks, withTrack, type Gr5Track } from '../data/gr5Tracks';
import { mainGoal } from '../engine/mainGoal';
import { buildItinerary, walkDayOn } from '../engine/routePlan';
import { locationEnabled, stageLocateFailureText } from '../engine/locationSetting';
import { stageHasCoords, stagePosition, stagePositionText, type StagePosition } from '../engine/stagePosition';
import { updatedLabel } from '../engine/weather';
import { locateIfGranted, locateOnce } from '../storage/locationSwitch';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { TextButton } from './TextButton';

// De plek zelf blijft in het geheugen; de uitkomst wordt bij elke weergave berekend, zodat het spoor dat later
// binnenkomt de meting verbetert zonder je plek opnieuw te vragen.
type Located = { lat: number; lon: number; accuracyM?: number };
type Shown = { kind: 'busy' } | { kind: 'idle' } | { kind: 'ok'; pos: Located; at: string } | { kind: 'fail'; text: string };

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
  // Het spoor van OSM; tot het er is (of als het niet laadt) meet de regel in een rechte lijn.
  const [tracks, setTracks] = useState<Record<string, Gr5Track>>({});
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void loadGr5Tracks().then((loadedTracks) => {
      if (alive.current) setTracks(loadedTracks);
    });
    return () => {
      alive.current = false;
    };
  }, []);

  const stages = useMemo(() => day?.stages.map((s) => withTrack(s, tracks)), [day, tracks]);
  // Vraagt je plek; zet zelf niets synchroon, zodat een effect hem veilig kan aanroepen.
  // Uit zichzelf alleen met een toestemming die er al is; de knop vraagt altijd.
  const hasStages = !!stages;
  const locate = useCallback((auto: boolean) => {
    if (!hasStages) return;
    void (auto ? locateIfGranted() : locateOnce()).then((result) => {
      if (!alive.current) return;
      if (result.status === 'skipped') {
        setShown({ kind: 'idle' });
        return;
      }
      if (result.status === 'failed') {
        setShown({ kind: 'fail', text: stageLocateFailureText(result.reason) });
        return;
      }
      setShown({ kind: 'ok', pos: result.position, at: new Date().toISOString() });
    });
  }, [hasStages]);
  const position: StagePosition | undefined = useMemo(
    () => (shown.kind === 'ok' && stages ? stagePosition(stages, shown.pos, shown.pos.accuracyM) : undefined),
    [shown, stages],
  );

  const dayNumber = day?.dayNumber;
  useEffect(() => {
    if (hasCoords) locate(true);
  }, [hasCoords, dayNumber, locate]);
  const again = () => {
    setShown({ kind: 'busy' });
    locate(false);
  };

  if (!day || !hasCoords) return null;
  return (
    <Card className="flex flex-col gap-1">
      <Eyebrow>Op je etappe, {day.from} naar {day.to}</Eyebrow>
      {shown.kind === 'busy' && <p className="text-sm" role="status" style={{ color: 'var(--color-ink-dim)' }}>Je plek wordt bepaald. Dit duurt hoogstens tien seconden.</p>}
      {shown.kind === 'idle' && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>ASCEND vraagt je plek pas als jij erom vraagt. Tik op Opnieuw bepalen om te zien hoever je nog moet.</p>}
      {shown.kind === 'ok' && position && (
        <>
          <p className="text-sm leading-relaxed tabular-nums" role="status" style={{ color: 'var(--color-ink)' }}>{stagePositionText(position)}</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Je plek, {updatedLabel(shown.at)}. Die blijft alleen op dit scherm en wordt nergens bewaard.
          </p>
        </>
      )}
      {shown.kind === 'ok' && !position && <p className="text-sm leading-relaxed" role="status" style={{ color: 'var(--color-warning)' }}>{stageLocateFailureText('away')}</p>}
      {shown.kind === 'fail' && <p className="text-sm leading-relaxed" role="status" style={{ color: 'var(--color-warning)' }}>{shown.text}</p>}
      {shown.kind !== 'busy' && (
        <TextButton className="self-start" onClick={again}>Opnieuw bepalen</TextButton>
      )}
      <a href={GR5_OSM_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>Route {GR5_OSM_ATTRIBUTION}</a>
    </Card>
  );
}
