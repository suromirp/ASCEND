// ASCEND: Forge. Your strength training: progress per exercise and what ASCEND
// would propose next time. ASCEND counts along quietly with the trainings that
// come in through the MacroFactor export (engine/strengthModel.ts, the rules KR-1
// to KR-8 of docs/onderzoek/Kracht loggen en progressie.md). Nothing here
// changes the plan or a log, and nothing is a maximum you must reach: the number
// is called "geschatte kracht" and the line shows the weight you can handle at
// your rep range.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { TrendLineChart } from '../components/TrendLineChart';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton } from '../components/ui';
import { currentBodyKg } from '../engine/bodyWeight';
import { accuracy, comparisonRows, exerciseHistories, exerciseViews, legsTiredAt, type ComparisonRow, type ExerciseView } from '../engine/strengthHistory';
import { describePlannedSet, formatWeight } from '../engine/strengthModel';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, todayISO } from '../utils/dates';
import { formatNumberNL } from '../utils/number';

const SHOWN_AT_FIRST = 12;
const kg = (n: number) => `${formatNumberNL(n, 1)} kg`;

export function ForgePage() {
  const navigate = useNavigate();
  const { sessionLogs, templates, program, settings, updateSettings } = useAppData();
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const [showAll, setShowAll] = useState(false);

  const strengthKey = JSON.stringify(settings.strengthModel ?? null);
  const model = useMemo(() => {
    const s = resolveStrengthSettings(JSON.parse(strengthKey) as typeof settings.strengthModel);
    if (!s.enabled) return undefined;
    const strengthLogs = sessionLogs.filter((l) => l.strengthData && l.strengthData.length > 0);
    const deps = { logs: sessionLogs, templates, program, bodyKg };
    const histories = exerciseHistories(strengthLogs, templates, deps);
    const tiredNow = legsTiredAt(today, undefined, deps);
    return {
      views: exerciseViews(histories, s, bodyKg, today, tiredNow),
      rows: comparisonRows(histories, s, bodyKg),
    };
  }, [strengthKey, sessionLogs, templates, program, bodyKg, today]);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-4">
      <div className="flex items-start gap-2">
        <BackButton fallback="/stand" />
        <div>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Forge</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je krachttraining: vooruitgang per oefening en wat ASCEND de volgende keer voorstelt.</p>
        </div>
      </div>

      {!model && (
        <Card className="flex flex-col gap-3">
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Kracht meerekenen staat uit</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Zet je het aan, dan rekent ASCEND stil mee met de krachttrainingen die je uit MacroFactor inleest. Je planning verandert er niet door.
          </p>
          <PrimaryButton onClick={() => void updateSettings({ strengthModel: { ...settings.strengthModel, enabled: true } })}>Aanzetten</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/more')}>Naar de instellingen</SecondaryButton>
        </Card>
      )}

      {model && model.views.length === 0 && (
        <Card className="flex flex-col gap-3">
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Nog geen krachttrainingen</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Lees een export van MacroFactor in. Dan staan hier je oefeningen, je vooruitgang en wat ASCEND de volgende keer voorstelt. Per set heeft ASCEND de herhalingen in reserve (RIR) nodig, die staan in de export.
          </p>
          <PrimaryButton onClick={() => navigate('/koppelen/macrofactor')}>MacroFactor inlezen</PrimaryButton>
        </Card>
      )}

      {model && model.views.length > 0 && (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            ASCEND telt stil mee. De lijn is het gewicht dat je volgens de schatting aankunt bij het aantal herhalingen van die oefening. Het is een rekengetal om je eigen trainingen met elkaar te vergelijken, geen maximum dat je moet halen.
          </p>
          {model.views.map((v) => (
            <ExerciseCard key={v.history.key} view={v} />
          ))}
          <ComparisonSection rows={model.rows} showAll={showAll} onShowAll={() => setShowAll(true)} />
          <button onClick={() => navigate('/more')} className="min-h-[44px] self-start text-left text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }}>
            Instellingen van Forge: sportschool, opwarmen en meer
          </button>
        </>
      )}
    </div>
  );
}

function ExerciseCard({ view }: { view: ExerciseView }) {
  const { history, now, next, line, strengthKg } = view;
  const { settings } = useAppData();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const exercise = history.exercise;
  const count = history.sessions.length;

  let missing: string | undefined;
  if (!next) {
    missing =
      strengthKg === undefined
        ? 'Zonder herhalingen in reserve (RIR) bij de sets kan ASCEND hier geen kracht schatten.'
        : bodyKg === undefined && exercise?.bodyweightFraction !== undefined
          ? 'Vul je lichaamsgewicht in bij Meer, dan telt deze oefening mee.'
          : 'Nog geen voorstel mogelijk.';
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{history.name}</p>
        <span className="shrink-0 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{count} {count === 1 ? 'training' : 'trainingen'}</span>
      </div>

      {now && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
          Nu ongeveer <Num>{kg(Math.abs(now.weightKg))}</Num>
          {exercise?.resistance === 'assisted_bodyweight' ? ' hulp' : ''} voor <Num>{now.reps}</Num> herhalingen met <Num>{now.rir}</Num> over.
        </p>
      )}
      {line.length >= 2 && (
        <div className="font-sans tabular-nums">
          <TrendLineChart points={line} color="var(--color-bronze)" height={90} formatValue={(v) => kg(Math.abs(v))} />
        </div>
      )}
      {line.length === 1 && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>De lijn begint na de tweede training.</p>}
      {strengthKg !== undefined && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Geschatte kracht: <Num>{kg(strengthKg)}</Num> totale last. Dat is geen maximum, alleen het getal waar ASCEND mee rekent.
        </p>
      )}

      {next && (
        <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <Eyebrow>Volgende keer volgens ASCEND</Eyebrow>
          <p className="font-sans text-base tabular-nums" style={{ color: 'var(--color-ink)' }}>{describePlannedSet(exercise, next.sets[0])}</p>
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
    </Card>
  );
}

function ComparisonSection({ rows, showAll, onShowAll }: { rows: ComparisonRow[]; showAll: boolean; onShowAll: () => void }) {
  const a = accuracy(rows);
  const shown = showAll ? rows : rows.slice(0, SHOWN_AT_FIRST);
  // Per training day, newest first.
  const groups: { key: string; date: string; name: string; rows: ComparisonRow[] }[] = [];
  for (const r of shown) {
    const key = `${r.logId}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, date: r.date, name: r.trainingName, rows: [] }));
    g.rows.push(r);
  }
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Vergelijking</Eyebrow>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{a.sentence}</p>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Per training wat ASCEND vooraf had voorgesteld, alleen uit de trainingen ervoor, naast wat je echt deed.
      </p>
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{g.name}, {formatDateNL(g.date)}</p>
          {g.rows.map((r) => (
            <div key={r.exerciseKey} className="flex flex-col gap-0.5">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{r.exerciseName}</p>
              <p className="font-sans text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink-dim)' }}>ASCEND: {r.prescribed}</p>
              <p className="font-sans text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Gedaan: {r.actual}. {r.withinOneStep ? 'Hooguit één stap verschil.' : 'Meer dan één stap verschil.'}
              </p>
              {(!r.withinOneStep || r.kind === 'tired') && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{r.reason}</p>}
            </div>
          ))}
        </div>
      ))}
      {!showAll && rows.length > SHOWN_AT_FIRST && <SecondaryButton onClick={onShowAll}>Toon alles ({rows.length})</SecondaryButton>}
    </Card>
  );
}
