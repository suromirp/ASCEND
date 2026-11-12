import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/icons';
import { Eyebrow, InfoButton } from '../components/ui';
import { SkyBand } from '../components/SkyBand';
import { LegFatigueCard } from '../components/LegFatigueCard';
import { LegFatigueInfoSheet } from '../components/LegFatigueInfoSheet';
import { FreshnessChart } from '../components/stand/FreshnessChart';
import { LegCalendar } from '../components/stand/LegCalendar';
import { IndexCheckCard } from '../components/stand/IndexCheckCard';
import { WeeklyLoadChart } from '../components/stand/WeeklyLoadChart';
import { LOAD_INFO } from '../components/stand/standChartData';
import { IntensityMixCard } from '../components/stand/IntensityMixCard';
import { DescentBody } from '../components/stand/DescentCard';
import { ClimbPaceBody } from '../components/stand/ClimbPaceCard';
import { useClimbPace } from '../components/stand/useClimbPace';
import { TrainingSplitSheet } from '../components/TrainingSplitSheet';
import { RhythmCard, RhythmSheet } from '../components/stand/RhythmCard';
import { RunTrendsCard } from '../components/stand/RunTrendsCard';
import { useRunTrendRows } from '../components/stand/useRunTrendRows';
import { PaceCurveCard } from '../components/stand/PaceCurveCard';
import { usePaceCurve } from '../components/stand/usePaceCurve';
import { InfluenceCard } from '../components/influence/InfluenceCard';
import { useStandData } from '../components/stand/useStandData';
import { StandInfoSheet, StandRow, StandRows, StandSheet } from '../components/stand/StandParts';
import { useInfluenceEffects } from '../components/influence/useInfluenceEffects';
import { useAppData } from '../state/AppDataContext';
import { hasAnythingToShow, recordedCounts } from '../engine/influenceEffects';
import { climbRowValue, descentRowValue, indexCheckValue, influenceRowShown, legDaysValue } from '../engine/standPage';

// De schermen achter Je stand (docs/visie/Ontwerp Stand minimaal.md, 2): Benen, Belasting en Ritme achter de
// drie regels, Lopen en Wat speelde er achter hun rij. Elk scherm heeft de lage lucht met de terugknop, het kopje
// Je stand, de naam en de i van het scherm: zo staat de naam één keer, niet ook nog als kop van de eerste kaart.
// Daaronder het hart, een grafiek in de stijl van de zone 2-kaart en de rijen; uitleg staat achter de i, een
// waarschuwing op het scherm. Alleen lezen.

export type StandScreenId = 'benen' | 'belasting' | 'ritme' | 'lopen' | 'invloed';

const TITLES: Record<StandScreenId, string> = {
  benen: 'Benen',
  belasting: 'Belasting',
  ritme: 'Ritme',
  lopen: 'Lopen',
  invloed: 'Wat speelde er',
};

// De i in de lucht: welke uitleg hij opent. Lopen en Wat speelde er hebben hun uitleg in de rijen zelf.
const INFO_LABEL: Partial<Record<StandScreenId, string>> = {
  benen: 'Hoe de beenindex werkt',
  belasting: 'Wat Belasting telt',
  ritme: 'Wat Ritme telt',
};

const isScreen = (id: string | undefined): id is StandScreenId => !!id && id in TITLES;

function ScreenInfo({ screen, onClose }: { screen: StandScreenId; onClose: () => void }) {
  if (screen === 'benen') return <LegFatigueInfoSheet onClose={onClose} />;
  if (screen === 'belasting') return <StandInfoSheet eyebrow="Belasting" title="Belasting per week" lines={LOAD_INFO} onClose={onClose} />;
  return <RhythmSheet onClose={onClose} />;
}

type Sheet = 'beendagen' | 'index' | 'bergaf' | 'klimtempo' | 'verdeling' | null;

function Benen() {
  const d = useStandData();
  const [sheet, setSheet] = useState<Sheet>(null);
  const checks = indexCheckValue(d.checks);
  return (
    <>
      <LegFatigueCard />
      <FreshnessChart points={d.curve} today={d.today} />
      <StandRows label="Meer over je benen">
        <StandRow label="Beendagen" value={legDaysValue(d.calendar.map((c) => c.level))} onClick={() => setSheet('beendagen')} sheet />
        {checks && <StandRow label="Index en je benen" value={checks} onClick={() => setSheet('index')} sheet />}
      </StandRows>
      {sheet === 'beendagen' && <StandSheet eyebrow="Benen" title="Beendagen" onClose={() => setSheet(null)}><LegCalendar days={d.calendar} today={d.today} /></StandSheet>}
      {sheet === 'index' && <StandSheet eyebrow="Benen" title="Index en je benen" onClose={() => setSheet(null)}><IndexCheckCard checks={d.checks} /></StandSheet>}
    </>
  );
}

function Belasting() {
  const d = useStandData();
  const climb = useClimbPace();
  const [sheet, setSheet] = useState<Sheet>(null);
  const descent = descentRowValue(d.descent, d.routeDescent !== undefined);
  const climbValue = climbRowValue(climb);
  return (
    <>
      <WeeklyLoadChart weeks={d.weeks} />
      <IntensityMixCard mix={d.mix} />
      <StandRows label="Meer over je belasting">
        {descent && <StandRow label="Bergaf" value={descent} onClick={() => setSheet('bergaf')} sheet />}
        {climbValue && <StandRow label="Klimtempo" value={climbValue} onClick={() => setSheet('klimtempo')} sheet />}
        <StandRow label="Soorten" value="Kracht, lopen en bergwerk" onClick={() => setSheet('verdeling')} sheet />
      </StandRows>
      {sheet === 'bergaf' && <StandSheet eyebrow="Belasting" title="Bergaf" onClose={() => setSheet(null)}><DescentBody weeks={d.descent} routeDayDescent={d.routeDescent} /></StandSheet>}
      {sheet === 'klimtempo' && climb && <StandSheet eyebrow="Belasting" title="Klimtempo" onClose={() => setSheet(null)}><ClimbPaceBody state={climb} goalDay={d.goalDay} pack={{ packKg: d.goalPack, bodyKg: d.inputs.bodyKg }} /></StandSheet>}
      {sheet === 'verdeling' && <TrainingSplitSheet onClose={() => setSheet(null)} />}
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
  const { settings } = useAppData();
  const { entries, effects } = useInfluenceEffects();
  // Direct geopend terwijl het overzicht uit staat of er nog niets te zien is: een regel, nooit een lege lucht.
  if (!influenceRowShown(settings.influenceOverview, recordedCounts(entries).length, hasAnythingToShow(effects))) {
    return <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Hier staat nog niets. Leg bij een training of een dag in het logboek vast wat er speelde.</p>;
  }
  return <InfluenceCard />;
}

const BODY: Record<StandScreenId, () => ReactNode> = { benen: Benen, belasting: Belasting, ritme: Ritme, lopen: Lopen, invloed: Invloed };

// Terug: kwam je van Je stand, Vandaag of een andere plek in de app (de regel of rij gaf `from` mee), dan één stap
// terug (de scrollhoogte blijft); anders (een link, een bladwijzer) naar Je stand zelf, nooit de app uit.
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return (
    <button
      type="button"
      onClick={() => (from ? navigate(-1) : navigate('/stand'))}
      aria-label={from === 'vandaag' ? 'Terug naar Vandaag' : 'Terug naar Je stand'}
      className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-ink-dim)' }}
    >
      <Icon name="terug" size={24} />
    </button>
  );
}

export function StandScreenPage() {
  const { scherm } = useParams();
  const [info, setInfo] = useState(false);
  // Een adres dat niet (meer) bestaat opent Je stand, niet een leeg scherm.
  if (!isScreen(scherm)) return <Navigate to="/stand" replace />;
  const Body = BODY[scherm];
  const infoLabel = INFO_LABEL[scherm];
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6" data-stand-screen={scherm}>
      <SkyBand variant="low">
        <div className="flex items-start gap-2">
          <BackButton />
          <div className="min-w-0 flex-1 pt-1">
            <Eyebrow>Je stand</Eyebrow>
            <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>{TITLES[scherm]}</h1>
          </div>
          {infoLabel && <div className="mt-8 pr-2.5"><InfoButton onClick={() => setInfo(true)} label={infoLabel} /></div>}
        </div>
      </SkyBand>
      <Body />
      {info && <ScreenInfo screen={scherm} onClose={() => setInfo(false)} />}
    </div>
  );
}
