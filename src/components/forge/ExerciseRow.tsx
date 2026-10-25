// ASCEND: een oefening op Forge als compacte rij. De rij toont de naam, het getal
// van nu en het verschil met het eerste vergelijkingsmoment; tik klapt hem open met
// nu, de twee momenten en het beste ooit naast elkaar, wat er verder veranderde en
// het voorstel voor de volgende keer. Vanuit daar opent de volledige geschiedenis.
// Alle rekenwerk staat in engine/forgeHistory.ts en engine/forgeText.ts.

import { useMemo } from 'react';
import { formatNumberNL } from '../../utils/number';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { Eyebrow } from '../ui';
import { ExerciseChart } from './ExerciseChart';
import { TrendSpark } from './TrendSpark';
import type { OneRmReading } from '../../models/metrics';
import { TextButton } from '../TextButton';
import { compareExercise, forgePoints, trendValues, type Comparison, type ForgePoint } from '../../engine/forgeHistory';
import { deltaText, deltaTone, extraText, extraTone, shortDateNL, topSetText, valueKind, valueText, type DeltaTone } from '../../engine/forgeText';
import { missingData, type ExerciseView, type MissingData } from '../../engine/strengthHistory';
import { describePlannedSet, formatWeight, WEIGHT_MISMATCH_TEXT } from '../../engine/strengthModel';
import type { OneRmView } from '../../engine/strengthSettings';
import type { ValueKind } from '../../engine/forgeText';

// Mint is vooruit, gedempt is gelijk of lager. Geen rood: het is een kleine regel zonder oordeel.
const TONE: Record<DeltaTone, string> = { up: 'var(--color-progress)', flat: 'var(--color-ink-dim)' };

// Wat er aan de sets ontbreekt, en hoe het erbij komt.
const REFILL_TEXT: Record<MissingData, string> = {
  rir: 'Deze sets staan hier nog zonder herhalingen in reserve (RIR); ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
  help: 'Deze sets staan hier nog zonder de hulp van het apparaat; ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
  rir_and_help: 'Deze sets staan hier nog zonder herhalingen in reserve (RIR) en zonder de hulp van het apparaat; ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
};

export function ExerciseRow({
  view,
  mode,
  bodyKg,
  today,
  weeks,
  showExtras,
  showTrendLines,
  macroFactor,
  open,
  onToggle,
  onHistory,
}: {
  view: ExerciseView;
  mode: OneRmView;
  bodyKg: number | undefined;
  today: string;
  weeks: [number, number];
  showExtras: boolean;
  // Het kleine lijntje in de rij en de grafiek in de opengeklapte rij.
  showTrendLines: boolean;
  macroFactor?: OneRmReading[];
  open: boolean;
  onToggle: () => void;
  onHistory: () => void;
}) {
  const { history } = view;
  const exercise = history.exercise;
  const points = useMemo(() => forgePoints(view, mode), [view, mode]);
  const cmp = useMemo(() => compareExercise(points, today, weeks), [points, today, weeks]);
  const trend = useMemo(() => (showTrendLines ? trendValues(view, mode) : []), [showTrendLines, view, mode]);
  const count = history.sessions.length;
  const first = cmp.moments[0];
  const kind = valueKind(view, mode);
  const text = (v: number) => valueText(v, kind, exercise, bodyKg);
  const diff = (d: number) => deltaText(d, kind, exercise, bodyKg);
  // Zonder moment in zijn venster vergelijkt de rij met de training ervoor.
  const rowChange = first?.change ?? cmp.previousChange;

  return (
    <div className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{history.name}</span>
          <span className="flex items-center gap-2 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
            <span className="whitespace-nowrap">{count} {count === 1 ? 'training' : 'trainingen'}</span>
            {showTrendLines && <TrendSpark values={trend} />}
          </span>
        </span>
        <span className="shrink-0 text-right font-sans tabular-nums">
          {cmp.now ? (
            <>
              <span className="block text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{text(cmp.now.value)}</span>
              <span className="block text-xs" style={{ color: rowChange !== undefined ? TONE[deltaTone(rowChange)] : 'var(--color-ink-dim)' }}>
                {first?.change !== undefined
                  ? `${diff(first.change)} sinds ${first.near || !first.point ? `${first.weeks} wk` : shortDateNL(first.point.date, today)}`
                  : cmp.previous && cmp.previousChange !== undefined
                    ? `${diff(cmp.previousChange)} sinds ${shortDateNL(cmp.previous.date, today)}`
                    : count === 1 ? 'Eerste keer' : 'Geen vergelijking'}
              </span>
            </>
          ) : (
            <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{kind === 'one_rm' ? 'Nog geen schatting' : kind === 'reps' ? 'Nog geen herhalingen' : 'Nog geen werkgewicht'}</span>
          )}
        </span>
        <span className="shrink-0" style={{ color: 'var(--color-ink-dim)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms ease-out' }}>
          <Icon name="omlaag" size={20} />
        </span>
      </button>
      {open && (
        <>
          {showTrendLines && (
            <div className="pb-3">
              <ExerciseChart view={view} mode={mode} bodyKg={bodyKg} today={today} macroFactor={macroFactor} height={90} />
            </div>
          )}
          <ExerciseDetail view={view} kind={kind} bodyKg={bodyKg} today={today} cmp={cmp} showExtras={showExtras} onHistory={onHistory} />
        </>
      )}
    </div>
  );
}

function Cell({ label, point, status = 'ok', today, kind, view, bodyKg, showExtras, note }: { label: string; point?: ForgePoint; status?: 'ok' | 'none' | 'same'; today: string; kind: ValueKind; view: ExerciseView; bodyKg: number | undefined; showExtras: boolean; note?: { text: string; tone: DeltaTone } }) {
  const exercise = view.history.exercise;
  // Bij herhalingen: het totaal en, als er gewicht bij is, het gewicht naast de herhalingen.
  const top = !point
    ? undefined
    : point.unit === 'reps'
      ? [point.totalReps !== undefined ? `totaal ${point.totalReps}` : '', point.topWeightKg ? `met ${formatNumberNL(point.topWeightKg, 1)} kg` : ''].filter(Boolean).join(', ')
      : topSetText(exercise, point.topWeightKg, point.topReps);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      {point ? (
        <>
          <span className="break-words font-sans text-sm font-semibold tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{valueText(point.value, kind, exercise, bodyKg, true)}</span>
          <span className="font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{shortDateNL(point.date, today)}</span>
          {showExtras && top && <span className="break-words font-sans text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{top}</span>}
        </>
      ) : (
        <span className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{status === 'same' ? 'Zelfde training' : status === 'none' ? 'Niet gedaan' : 'Nog niet'}</span>
      )}
      {note && <span className="break-words font-sans text-xs font-medium tabular-nums leading-snug" style={{ color: TONE[note.tone] }}>{note.text}</span>}
    </div>
  );
}

function ExerciseDetail({ view, kind, bodyKg, today, cmp, showExtras, onHistory }: { view: ExerciseView; kind: ValueKind; bodyKg: number | undefined; today: string; cmp: Comparison; showExtras: boolean; onHistory: () => void }) {
  const navigate = useNavigate();
  const { history, next, strengthKg, weightMismatch } = view;
  const exercise = history.exercise;
  const [m1, m2] = cmp.moments;
  const diff = (d: number) => deltaText(d, kind, exercise, bodyKg, true);
  const common = { today, kind, view, bodyKg, showExtras };

  let missing: string | undefined;
  let refill: MissingData | undefined;
  if (!next && kind !== 'reps') {
    refill = weightMismatch ? undefined : missingData(history);
    missing = weightMismatch
      ? WEIGHT_MISMATCH_TEXT
      : refill
        ? REFILL_TEXT[refill]
        : bodyKg === undefined && exercise?.bodyweightFraction !== undefined
          ? 'Vul je lichaamsgewicht in bij Instellingen, Lichaam, dan telt deze oefening mee.'
          : strengthKg === undefined
            ? 'Bij deze sets kan ASCEND nog geen kracht schatten.'
            : 'Nog geen voorstel mogelijk.';
  }
  const withExtras = showExtras ? cmp.moments.filter((m) => m.extras.length > 0) : [];
  const bestNote = cmp.now && cmp.best ? (cmp.atBest ? { text: 'Dit is het beste', tone: 'up' as const } : { text: diff(cmp.now.value - cmp.best.value), tone: 'flat' as const }) : undefined;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="grid grid-cols-4 gap-2">
        <Cell label="Nu" point={cmp.now} {...common} />
        <Cell
          label={`${m1.weeks} wk geleden`}
          point={m1.point}
          status={m1.status}
          {...common}
          note={m1.change !== undefined ? { text: diff(m1.change), tone: deltaTone(m1.change) } : undefined}
        />
        <Cell
          label={`${m2.weeks} wk geleden`}
          point={m2.point}
          status={m2.status}
          {...common}
          note={m2.change !== undefined ? { text: diff(m2.change), tone: deltaTone(m2.change) } : undefined}
        />
        <Cell label="Beste ooit" point={cmp.best} {...common} note={bestNote} />
      </div>

      {withExtras.length > 0 && (
        <div className="flex flex-col gap-2">
          {withExtras.map((m) => (
            <div key={m.weeks} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium" style={{ color: 'var(--color-ink-dim)' }}>{m.near || !m.point ? `Sinds ${m.weeks} weken geleden` : `Sinds ${shortDateNL(m.point.date, today)}`}</span>
              {m.extras.map((c) => (
                <span key={c.kind} className="font-sans text-sm tabular-nums leading-snug" style={{ color: TONE[extraTone(c)] }}>{extraText(c)}</span>
              ))}
            </div>
          ))}
        </div>
      )}

      {next && (
        <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <Eyebrow>Volgende keer volgens ASCEND</Eyebrow>
          <p className="font-sans text-base tabular-nums" style={{ color: 'var(--color-ink)' }}>{describePlannedSet(exercise, next.sets[0], next.dumbbellTotal)}</p>
          {next.sets.length > 1 && (
            <p className="font-sans text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              {next.sets.length} werksets, de volgende per set: {next.sets.slice(1).map((x) => formatWeight(exercise, x.weightKg)).join(', ')}
            </p>
          )}
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{next.reason}</p>
          {next.warmups.length > 0 && (
            <p className="font-sans text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Opwarmen: {next.warmups.map((w) => `${formatWeight(exercise, w.weightKg)} x ${w.reps}`).join(', ')}
            </p>
          )}
        </div>
      )}
      {missing && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{missing}</p>}
      {refill && (
        <TextButton onClick={() => navigate('/koppelen/macrofactor')} className="self-start text-left" icon="verder">
          MacroFactor opnieuw inlezen
        </TextButton>
      )}
      <TextButton onClick={onHistory} className="self-start text-left" icon="verder">
        Hele geschiedenis van {history.name}
      </TextButton>
    </div>
  );
}
