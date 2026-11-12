import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui';
import { TextButton } from '../TextButton';
import { ChevronGlyph } from '../vandaag/glyphs';
import { WeightOverviewSheet } from './WeightOverviewSheet';
import { useRunTrendRows } from './useRunTrendRows';
import { usePaceCurve } from './usePaceCurve';
import { useStandYourWeek } from './useStandYourWeek';
import { useInfluenceEffects } from '../influence/useInfluenceEffects';
import { useAppData } from '../../state/AppDataContext';
import { loadBodyKg } from '../../engine/weightTrend';
import { forgeEntryLine } from '../../engine/forgeEntry';
import { forgePoints } from '../../engine/forgeHistory';
import { exerciseHistories, exerciseViews, legsTiredAt } from '../../engine/strengthHistory';
import { compareMoments, resolveStrengthSettings, strengthModelKey } from '../../engine/strengthSettings';
import { weightsInUse } from '../../engine/bodyWeight';
import { weightCardData, weightCardOn } from '../../engine/weightCard';
import { hasAnythingToShow, recordedCounts } from '../../engine/influenceEffects';
import { influenceRowShown, influenceRowValue, runRowValue, standListRows, type StandListId, type StandRowId } from '../../engine/standPage';
import { todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';

// Je stand, blok 3: één kaart met rijen, zonder kopje (docs/visie/Ontwerp Stand minimaal.md, 2). Links het vaste
// woord gedempt, dan de waarde in gewone inkt, rechts een pijltje. Een rij is er alleen als er iets achter zit,
// behalve Kracht: die blijft staan zodat Forge te vinden is, met Aanzetten als Kracht meerekenen uit staat.
// Zonder doel komt Je week er als eerste rij bij (dezelfde berekening als op Ascend, engine/yourWeek.ts).
// Kracht, Lopen en Wat speelde er volgen de bewaarde volgorde van Je stand; Gewicht staat onderaan, zoals de
// kaart Gewicht altijd onderaan Je stand stond.

// Forge in één regel (engine/forgeEntry.ts), zoals de kaart Forge die hier eerst stond.
function useForgeEntry() {
  const { sessionLogs, templates, program, settings, injuryNotes } = useAppData();
  const today = todayISO();
  const bodyKg = loadBodyKg(settings);
  const strengthKey = strengthModelKey(settings.strengthModel);
  return useMemo(() => {
    const s = resolveStrengthSettings(JSON.parse(strengthKey) as typeof settings.strengthModel);
    if (!s.enabled) return forgeEntryLine({ enabled: false, series: [], proposals: 0, today, weeks: 8 });
    const strengthLogs = sessionLogs.filter((l) => l.strengthData && l.strengthData.length > 0);
    const deps = { logs: sessionLogs, templates, program, bodyKg, sore: { injuries: injuryNotes, checkIns: settings.morningCheckIns ?? [] } };
    const histories = exerciseHistories(strengthLogs, templates, deps);
    const views = exerciseViews(histories, s, bodyKg, today, legsTiredAt(today, undefined, deps));
    const weeks = compareMoments(s.compareWeeks)[1];
    return forgeEntryLine({
      enabled: true,
      series: views.map((v) => forgePoints(v, s.showOneRm ? s.oneRmView : 'work_weight')),
      proposals: views.filter((v) => v.next && !v.weightMismatch).length,
      today,
      weeks,
    });
  }, [strengthKey, sessionLogs, templates, program, bodyKg, today, injuryNotes, settings.morningCheckIns]);
}

function Row({ label, value, onClick, sheet, trailing }: { label: string; value: string; onClick?: () => void; sheet?: boolean; trailing?: ReactNode }) {
  const inner = (
    <>
      <span className="w-[104px] shrink-0 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <span className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{value}</span>
    </>
  );
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }} data-stand-row={label}>
      {onClick ? (
        <button type="button" onClick={onClick} data-sheet-from={sheet ? '' : undefined} aria-label={`${label}: ${value}`} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left">
          {inner}
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>
        </button>
      ) : (
        <div className="flex min-h-[56px] w-full items-center gap-3 py-1.5 pl-4 pr-2">
          {inner}
          {trailing}
        </div>
      )}
    </li>
  );
}

export function StandList({ order }: { order: StandListId[] }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const [weightOpen, setWeightOpen] = useState(false);
  const today = todayISO();

  const week = useStandYourWeek();
  const forge = useForgeEntry();
  const runValue = runRowValue(useRunTrendRows(), !!usePaceCurve());

  const { entries, effects } = useInfluenceEffects();
  const ownReasons = recordedCounts(entries).length;
  const influenceOn = influenceRowShown(settings.influenceOverview, ownReasons, hasAnythingToShow(effects));

  const weights = useMemo(
    () => weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect),
    [settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect],
  );
  const weight = useMemo(() => weightCardData(weights, settings.weightTrend, today), [weights, settings.weightTrend, today]);
  const weightOn = weightCardOn(settings.weightCard, weights) && !!weight;

  const rows = standListRows({
    order,
    week: week?.minutesLine,
    forge: { off: forge.state === 'off', line: forge.line },
    run: runValue,
    influence: influenceOn ? influenceRowValue(ownReasons, effects.filter((e) => e.enough).length) : undefined,
    weight: weightOn && weight ? `${formatNumberNL(weight.kg, 1)} kg${weight.isTrend ? ', trend' : ''}` : undefined,
  });
  const from = { state: { from: 'stand' } };
  const open: Record<StandRowId, () => void> = {
    week: () => navigate('/ascend'),
    kracht: () => navigate('/forge'),
    lopen: () => navigate('/stand/lopen', from),
    invloed: () => navigate('/stand/invloed', from),
    gewicht: () => setWeightOpen(true),
  };

  return (
    <>
      <Card className="!p-0">
        <ul aria-label="Meer over je stand">
          {rows.map((r) => (r.off ? (
            <Row
              key={r.id}
              label={r.label}
              value={r.value}
              trailing={<TextButton onClick={() => void updateSettings({ strengthModel: { ...settings.strengthModel, enabled: true } })}>Aanzetten</TextButton>}
            />
          ) : (
            <Row key={r.id} label={r.label} value={r.value} onClick={open[r.id]} sheet={r.id === 'gewicht'} />
          )))}
        </ul>
      </Card>
      {weightOpen && <WeightOverviewSheet onClose={() => setWeightOpen(false)} />}
    </>
  );
}
