// ASCEND: Forge. Your strength training: progress per exercise and what ASCEND
// would propose next time. ASCEND counts along quietly with the trainings that
// come in through the MacroFactor export (engine/strengthModel.ts, the rules KR-1
// to KR-8 of docs/onderzoek/Kracht loggen en progressie.md). Nothing here
// changes the plan or a log, and nothing is a maximum you must reach: the number
// is called "geschatte kracht" and the line shows the weight you can handle at
// your rep range.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendLineChart } from '../components/TrendLineChart';
import { Card, Eyebrow, InfoButton, Num, PageHeader, PrimaryButton, SecondaryButton, Stat, StatusPill } from '../components/ui';
import { SettingsPageLink } from '../components/settings/SettingsLink';
import { jumpRoute } from '../components/settings/jump';
import { currentBodyKg } from '../engine/bodyWeight';
import { accuracy, comparisonRows, exerciseHistories, exerciseViews, legsTiredAt, missingData, type ComparisonRow, type ExerciseView, type MissingData } from '../engine/strengthHistory';
import { describePlannedSet, formatWeight, WEIGHT_MISMATCH_TEXT } from '../engine/strengthModel';
import { oneRmChange, oneRmSeries } from '../engine/strengthOneRm';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, todayISO } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { usePageState } from '../components/usePageState';
import { TextButton } from '../components/TextButton';

const SHOWN_AT_FIRST = 12;
const kg = (n: number) => `${formatNumberNL(n, 1)} kg`;

export function ForgePage() {
  const navigate = useNavigate();
  const forgeSettings = jumpRoute('forge', { jumpTo: 'forge' });
  const { sessionLogs, templates, program, settings, updateSettings } = useAppData();
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const [showAll, setShowAll] = usePageState('showAll', false);

  const strengthKey = JSON.stringify(settings.strengthModel ?? null);
  const showOneRm = resolveStrengthSettings(settings.strengthModel).showOneRm;
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
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader
        eyebrow="Stand"
        title="Forge"
        line="Je krachttraining: vooruitgang per oefening en wat ASCEND de volgende keer voorstelt."
        fallback="/stand"
      />

      {!model && (
        <Card className="flex flex-col gap-3">
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Kracht meerekenen staat uit</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Zet je het aan, dan rekent ASCEND stil mee met de krachttrainingen die je uit MacroFactor inleest. Je planning verandert er niet door.
          </p>
          <PrimaryButton onClick={() => void updateSettings({ strengthModel: { ...settings.strengthModel, enabled: true } })}>Aanzetten</PrimaryButton>
          <SecondaryButton onClick={() => navigate(forgeSettings.to, { state: forgeSettings.state })}>Naar de instellingen</SecondaryButton>
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

      {model && model.views.length === 0 && <SettingsPageLink page="forge" label="Instellingen van Forge" />}

      {model && model.views.length > 0 && (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            ASCEND telt stil mee. De lijn is het gewicht dat je volgens de schatting aankunt bij het aantal herhalingen van die oefening. Het is een rekengetal om je eigen trainingen met elkaar te vergelijken, geen maximum dat je moet halen.
          </p>
          {model.views.map((v) => (
            <ExerciseCard key={v.history.key} view={v} showOneRm={showOneRm} />
          ))}
          <ComparisonSection rows={model.rows} showAll={showAll} onShowAll={() => setShowAll(true)} />
          <TextButton onClick={() => navigate(forgeSettings.to, { state: forgeSettings.state })} className="self-start text-left" icon="verder">
            Instellingen van Forge: sportschool, opwarmen en meer
          </TextButton>
        </>
      )}
    </div>
  );
}

// Wat er aan de sets ontbreekt, en hoe het erbij komt.
const REFILL_TEXT: Record<MissingData, string> = {
  rir: 'Deze sets staan hier nog zonder herhalingen in reserve (RIR); ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
  help: 'Deze sets staan hier nog zonder de hulp van het apparaat; ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
  rir_and_help: 'Deze sets staan hier nog zonder herhalingen in reserve (RIR) en zonder de hulp van het apparaat; ze komen uit een oudere import. Lees je MacroFactor-export opnieuw in en tik Alles verwerken, dan vult ASCEND ze aan.',
};

function ExerciseCard({ view, showOneRm }: { view: ExerciseView; showOneRm: boolean }) {
  const { history, now, next, line, strengthKg, weightMismatch } = view;
  const { settings } = useAppData();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const exercise = history.exercise;
  // Pull-ups with help: the help is negative, so a line of it goes up while the
  // number goes down. With a body weight the line shows what you lift yourself.
  const assisted = exercise?.resistance === 'assisted_bodyweight';
  const liftedKg = assisted ? bodyKg : undefined;
  const chartLine = liftedKg ? line.map((p) => ({ ...p, value: liftedKg + p.value })) : line;
  const count = history.sessions.length;
  const [oneRmInfo, setOneRmInfo] = useState(false);
  const oneRm = useMemo(() => oneRmSeries(view.points), [view.points]);
  const oneRmDelta = oneRmChange(oneRm);
  // One line per card: with the 1RM chart on, the line of the working weight
  // would tell the same story twice. With help the first line reads otherwise
  // (what you lift yourself), so that one stays.
  const oneRmChart = showOneRm && strengthKg !== undefined && oneRm.length >= 2 && !assisted;
  // With your own body weight in it the number is the total load, not the plates.
  const totalLoad = exercise?.bodyweightFraction !== undefined || (exercise !== undefined && ['bodyweight', 'assisted_bodyweight', 'pack_or_vest'].includes(exercise.resistance));

  const navigate = useNavigate();
  let missing: string | undefined;
  let refill: MissingData | undefined;
  if (!next) {
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
      {line.length >= 2 && !oneRmChart && (
        <div className="font-sans tabular-nums">
          <TrendLineChart points={chartLine} color="var(--color-action)" height={90} formatValue={assisted && !liftedKg ? (v) => `hulp ${kg(Math.abs(v))}` : (v) => kg(Math.abs(v))} />
          {assisted && (
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              {liftedKg ? 'De lijn laat zien hoeveel je zelf optilt: je lichaamsgewicht min de hulp. Hoger is sterker.' : 'De lijn laat de hulp zien. Hoger op de lijn is minder hulp, dus sterker.'}
            </p>
          )}
        </div>
      )}
      {line.length === 1 && !oneRmChart && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>De lijn begint na de tweede training.</p>}
      {showOneRm && strengthKg !== undefined && (
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Geschatte 1RM</Eyebrow>
            <InfoButton onClick={() => setOneRmInfo((v) => !v)} label={oneRmInfo ? 'Uitleg over de geschatte 1RM sluiten' : 'Uitleg over de geschatte 1RM'} />
          </div>
          {oneRmInfo && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Een schatting uit je laatste sets, geen test. Gebruik hem om je trainingen te vergelijken.
            </p>
          )}
          <div className="flex items-end justify-between gap-3">
            <Stat value={formatNumberNL(strengthKg, 1)} unit={totalLoad ? 'kg totale last' : 'kg'} size="m" />
            {oneRmDelta && (
              <StatusPill tone={oneRmDelta.deltaKg > 0 ? 'progress' : 'neutral'}>
                {oneRmDelta.deltaKg > 0 ? '+' : ''}{formatNumberNL(oneRmDelta.deltaKg, 1)} kg in 4 weken
              </StatusPill>
            )}
          </div>
          {oneRm.length >= 2 && (
            <div className="font-sans tabular-nums">
              <TrendLineChart points={oneRm.map((p) => ({ label: formatDateNL(p.date), value: p.kg }))} color="var(--color-progress)" height={90} formatValue={(v) => kg(v)} />
            </div>
          )}
        </div>
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
      {refill && (
        <TextButton onClick={() => navigate('/koppelen/macrofactor')} className="self-start text-left" icon="verder">
          MacroFactor opnieuw inlezen
        </TextButton>
      )}
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
