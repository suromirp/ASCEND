import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/icons';
import { Eyebrow } from '../components/ui';
import { SkyBand } from '../components/SkyBand';
import { LegFatigueCard } from '../components/LegFatigueCard';
import { FreshnessChart } from '../components/stand/FreshnessChart';
import { LegCalendar } from '../components/stand/LegCalendar';
import { IndexCheckCard } from '../components/stand/IndexCheckCard';
import { WeeklyLoadChart } from '../components/stand/WeeklyLoadChart';
import { IntensityMixCard } from '../components/stand/IntensityMixCard';
import { DescentCard } from '../components/stand/DescentCard';
import { ClimbPaceCard } from '../components/stand/ClimbPaceCard';
import { TrainingSplitRow } from '../components/stand/TrainingSplitRow';
import { RhythmCard } from '../components/stand/RhythmCard';
import { RunTrendsCard } from '../components/stand/RunTrendsCard';
import { useRunTrendRows } from '../components/stand/useRunTrendRows';
import { PaceCurveCard } from '../components/stand/PaceCurveCard';
import { usePaceCurve } from '../components/stand/usePaceCurve';
import { InfluenceCard } from '../components/influence/InfluenceCard';
import { useStandData } from '../components/stand/useStandData';

// De schermen achter Je stand (docs/visie/Ontwerp Stand minimaal.md, 2): Benen, Belasting en Ritme achter de
// drie regels, Lopen en Wat speelde er achter hun rij. Elk scherm heeft de lage lucht met de terugknop naar
// Je stand, het kopje Je stand en de naam. De kaarten zijn dezelfde die eerst onder elkaar op Je stand stonden;
// hier staan ze elk één keer. Alleen lezen.

export type StandScreenId = 'benen' | 'belasting' | 'ritme' | 'lopen' | 'invloed';

const TITLES: Record<StandScreenId, string> = {
  benen: 'Benen',
  belasting: 'Belasting',
  ritme: 'Ritme',
  lopen: 'Lopen',
  invloed: 'Wat speelde er',
};

const isScreen = (id: string | undefined): id is StandScreenId => !!id && id in TITLES;

function Benen() {
  const d = useStandData();
  return (
    <>
      <LegFatigueCard />
      <FreshnessChart points={d.curve} today={d.today} />
      <LegCalendar days={d.calendar} today={d.today} />
      {d.checks.length > 0 && <IndexCheckCard checks={d.checks} />}
    </>
  );
}

function Belasting() {
  const d = useStandData();
  return (
    <>
      <WeeklyLoadChart weeks={d.weeks} />
      <IntensityMixCard mix={d.mix} />
      <DescentCard weeks={d.descent} routeDayDescent={d.routeDescent} />
      <ClimbPaceCard goalDay={d.goalDay} pack={{ packKg: d.goalPack, bodyKg: d.inputs.bodyKg }} />
      <TrainingSplitRow />
    </>
  );
}

function Ritme() {
  const d = useStandData();
  return <RhythmCard rhythm={d.rhythm} mainPast={d.mainPast} />;
}

function Lopen() {
  const rows = useRunTrendRows();
  const curve = usePaceCurve();
  // Direct geopend zonder iets erachter: een regel, nooit een leeg scherm.
  if (!curve && rows.every((r) => r.word === 'Te weinig gegevens')) {
    return <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen loopjes met details. Na een paar lopen met je horloge staan je trends hier.</p>;
  }
  return (
    <>
      <RunTrendsCard />
      <PaceCurveCard />
    </>
  );
}

function Invloed() {
  return <InfluenceCard />;
}

const BODY: Record<StandScreenId, () => ReactNode> = { benen: Benen, belasting: Belasting, ritme: Ritme, lopen: Lopen, invloed: Invloed };

// Terug naar Je stand: kwam je van Je stand, dan één stap terug (de scrollhoogte blijft); anders (een link,
// een bladwijzer) naar Je stand zelf, nooit de app uit.
function BackToStand() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromStand = (location.state as { from?: string } | null)?.from === 'stand';
  return (
    <button
      type="button"
      onClick={() => (fromStand ? navigate(-1) : navigate('/stand'))}
      aria-label="Terug naar Je stand"
      className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-ink-dim)' }}
    >
      <Icon name="terug" size={24} />
    </button>
  );
}

export function StandScreenPage() {
  const { scherm } = useParams();
  // Een adres dat niet (meer) bestaat opent Je stand, niet een leeg scherm.
  if (!isScreen(scherm)) return <Navigate to="/stand" replace />;
  const Body = BODY[scherm];
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6" data-stand-screen={scherm}>
      <SkyBand variant="low">
        <div className="flex items-start gap-2">
          <BackToStand />
          <div className="min-w-0 flex-1 pt-1">
            <Eyebrow>Je stand</Eyebrow>
            <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>{TITLES[scherm]}</h1>
          </div>
        </div>
      </SkyBand>
      <Body />
    </div>
  );
}
