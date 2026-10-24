// ASCEND: Forge. Your strength training: progress per exercise and what ASCEND
// would propose next time. ASCEND counts along quietly with the trainings that
// come in through the MacroFactor export (engine/strengthModel.ts, the rules KR-1
// to KR-8 of docs/onderzoek/Kracht loggen en progressie.md). Nothing here
// changes the plan or a log, and nothing is a maximum you must reach.
//
// The page is a short list: one row per exercise with the number of now and the
// difference with the first comparison moment. A tap opens the row with now, the
// two moments (4 and 8 weeks as the advice) and the best ever side by side, what
// else changed (reps at the same weight, top weight, volume) and the proposal for
// next time; from there the full history opens in a sheet. Above the list are a
// search field and a chip per training (the real templates). The search term and
// the filter survive a visit to another page (usePageState). All the arithmetic
// is in engine/forgeHistory.ts and engine/forgeText.ts
// (docs/beslissingen/2026-10-24-forge-vergelijken-en-zoeken.md).
//
// One choice for all rows, stored with the Forge settings (StrengthSettings.oneRmView):
// the estimated 1RM, with the 1RM from the MacroFactor export in the history
// (engine/externalOneRm.ts), or the weight you can handle at your rep range. With
// "Geschatte 1RM tonen" off there is only the second and no switch
// (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Eyebrow, InfoButton, PageHeader, PrimaryButton, SecondaryButton, Segmented } from '../components/ui';
import { SettingsPageLink } from '../components/settings/SettingsLink';
import { jumpRoute } from '../components/settings/jump';
import { ExerciseRow } from '../components/forge/ExerciseRow';
import { ExerciseHistorySheet } from '../components/forge/ExerciseHistorySheet';
import { ForgeFilters } from '../components/forge/ForgeFilters';
import { currentBodyKg } from '../engine/bodyWeight';
import { isRepsBased, splitByRecency, trainingFilters, visibleViews } from '../engine/forgeHistory';
import { accuracy, comparisonRows, exerciseHistories, exerciseViews, legsTiredAt, type ComparisonRow } from '../engine/strengthHistory';
import { externalOneRmByKey } from '../engine/externalOneRm';
import { compareMoments, resolveStrengthSettings, type OneRmView, type StrengthSettings } from '../engine/strengthSettings';
import type { OneRmReading } from '../models/metrics';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, todayISO } from '../utils/dates';
import { usePageState } from '../components/usePageState';
import { TextButton } from '../components/TextButton';

const SHOWN_AT_FIRST = 12;

// What the model on this page is made from: the choices of the list (which side,
// the moments, the order, the small lines) do not change a number, so a tap on the
// switch does not recalculate every exercise.
function modelKey(raw: StrengthSettings | undefined): string {
  const copy: StrengthSettings = { ...raw };
  delete copy.oneRmView;
  delete copy.showOneRm;
  delete copy.showMacroFactorOneRm;
  delete copy.compareWeeks;
  delete copy.listSort;
  delete copy.showExtras;
  return JSON.stringify(copy);
}

const NO_READINGS = new Map<string, OneRmReading[]>();

export function ForgePage() {
  const navigate = useNavigate();
  const forgeSettings = jumpRoute('forge', { jumpTo: 'forge' });
  const { sessionLogs, templates, program, settings, updateSettings } = useAppData();
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const [showAll, setShowAll] = usePageState('showAll', false);
  const [query, setQuery] = usePageState('zoek', '');
  const [trainingChoice, setTrainingChoice] = usePageState<string | null>('training', null);
  const [openKey, setOpenKey] = usePageState<string | null>('open', null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [listInfo, setListInfo] = useState(false);

  const strengthKey = modelKey(settings.strengthModel);
  const choices = resolveStrengthSettings(settings.strengthModel);
  const showOneRm = choices.showOneRm;
  const weeks = useMemo(() => compareMoments(choices.compareWeeks), [choices.compareWeeks]);
  // One choice for all rows. The tap shows at once; the stored choice follows.
  const [pendingView, setPendingView] = useState<OneRmView | null>(null);
  const mode: OneRmView = showOneRm ? (pendingView ?? choices.oneRmView) : 'work_weight';
  async function chooseView(next: OneRmView) {
    setPendingView(next);
    try {
      await updateSettings({ strengthModel: { ...settings.strengthModel, oneRmView: next } });
    } finally {
      setPendingView(null);
    }
  }
  const macroFactorOneRm = useMemo(() => (choices.showMacroFactorOneRm ? externalOneRmByKey(settings.externalOneRm) : NO_READINGS), [choices.showMacroFactorOneRm, settings.externalOneRm]);
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

  const trainings = useMemo(() => (model ? trainingFilters(templates, model.views) : []), [model, templates]);
  // A stored filter for a training that is no longer there counts as "Alles".
  const training = trainingChoice !== null && trainings.includes(trainingChoice) ? trainingChoice : null;
  const shown = useMemo(() => (model ? visibleViews(model.views, { query, training, sort: choices.listSort }) : []), [model, query, training, choices.listSort]);
  // Wat je de laatste weken (tot het verste vergelijkingsmoment) nog deed staat bovenaan;
  // oefeningen uit een oud schema staan weggeklapt onder Eerder gedaan. Een zoekterm
  // zoekt in alles.
  const split = useMemo(() => splitByRecency(shown, today, weeks[1] * 7), [shown, today, weeks]);
  const [showOlder, setShowOlder] = usePageState('eerder', false);
  const historyView = historyKey ? model?.views.find((v) => v.history.key === historyKey) : undefined;
  const filtering = query.trim() !== '' || training !== null;

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
            ASCEND telt stil mee. Getallen zijn rekengetallen om je eigen trainingen te vergelijken, geen maximum dat je moet halen. Het verschil staat tegenover {weeks[0]} en {weeks[1]} weken geleden.
          </p>

          {showOneRm && shown.some((v) => !isRepsBased(v)) && (
            <div className="w-full max-w-[260px]">
              <Segmented<OneRmView>
                tall
                label="Wat Forge laat zien"
                value={mode}
                onChange={(next) => void chooseView(next)}
                options={[
                  { value: 'one_rm', label: '1RM' },
                  { value: 'work_weight', label: 'Werkgewicht' },
                ]}
              />
            </div>
          )}

          <ForgeFilters query={query} onQuery={setQuery} trainings={trainings} training={training} onTraining={setTrainingChoice} />

          <Card className="flex flex-col py-2">
            <div className="flex items-center justify-between gap-2 pt-1">
              <p role="status" className="font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                {filtering ? `${shown.length} van ${model.views.length} oefeningen` : `${model.views.length} oefeningen`}
              </p>
              <InfoButton onClick={() => setListInfo((v) => !v)} label={listInfo ? 'Uitleg over de getallen sluiten' : 'Uitleg over de getallen'} />
            </div>
            {listInfo && (
              <p className="pb-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Het getal rechts is de stand na je laatste training. De kleine regel eronder is het verschil met {weeks[0]} weken geleden. Open je een oefening, dan staat het verschil met nu onder elk getal. Een moment telt alleen als je toen binnen een even lange periode getraind hebt; anders staat er Niet gedaan.
              </p>
            )}
            {shown.length === 0 && (
              <div className="flex flex-col items-start gap-1 py-3">
                <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Geen oefening gevonden.</p>
                <TextButton onClick={() => { setQuery(''); setTrainingChoice(null); }} icon="verder">Zoekopdracht wissen</TextButton>
              </div>
            )}
            {(query.trim() ? shown : split.recent).map((v) => (
              <ExerciseRow
                key={v.history.key}
                view={v}
                mode={mode}
                bodyKg={bodyKg}
                today={today}
                weeks={weeks}
                showExtras={choices.showExtras}
                showTrendLines={choices.showTrendLines}
                macroFactor={macroFactorOneRm.get(v.history.key)}
                open={openKey === v.history.key}
                onToggle={() => setOpenKey(openKey === v.history.key ? null : v.history.key)}
                onHistory={() => setHistoryKey(v.history.key)}
              />
            ))}
            {!query.trim() && split.older.length > 0 && (
              <div className="flex flex-col border-t pt-1" style={{ borderColor: 'var(--color-card-border)' }}>
                <TextButton onClick={() => setShowOlder(!showOlder)} className="self-start" icon="omlaag" flipped={showOlder}>
                  {showOlder ? 'Eerder gedaan verbergen' : `Eerder gedaan (${split.older.length})`}
                </TextButton>
                {showOlder && split.older.map((v) => (
                  <ExerciseRow
                    key={v.history.key}
                    view={v}
                    mode={mode}
                    bodyKg={bodyKg}
                    today={today}
                    weeks={weeks}
                    showExtras={choices.showExtras}
                    showTrendLines={choices.showTrendLines}
                    macroFactor={macroFactorOneRm.get(v.history.key)}
                    open={openKey === v.history.key}
                    onToggle={() => setOpenKey(openKey === v.history.key ? null : v.history.key)}
                    onHistory={() => setHistoryKey(v.history.key)}
                  />
                ))}
              </div>
            )}
          </Card>

          <ComparisonSection rows={model.rows} showAll={showAll} onShowAll={() => setShowAll(true)} />
          <TextButton onClick={() => navigate(forgeSettings.to, { state: forgeSettings.state })} className="self-start text-left" icon="verder">
            Instellingen van Forge: sportschool, opwarmen en meer
          </TextButton>
        </>
      )}

      {historyView && (
        <ExerciseHistorySheet view={historyView} mode={mode} bodyKg={bodyKg} today={today} macroFactor={macroFactorOneRm.get(historyView.history.key)} onClose={() => setHistoryKey(null)} />
      )}
    </div>
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
