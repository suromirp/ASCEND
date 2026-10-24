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
import { checkSummary, comparisonRows, exerciseHistories, exerciseViews, legsTiredAt, type ComparisonRow } from '../engine/strengthHistory';
import { biasWord, checkLines, type CheckSummary, type Tally } from '../engine/prescriptionCheck';
import { externalOneRmByKey } from '../engine/externalOneRm';
import { compareMoments, resolveStrengthSettings, strengthModelKey, type OneRmView } from '../engine/strengthSettings';
import type { OneRmReading } from '../models/metrics';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, formatShortDateNL, todayISO } from '../utils/dates';
import { usePageState } from '../components/usePageState';
import { TextButton } from '../components/TextButton';
import { Sheet } from '../components/settings/Sheet';
import { Icon } from '../components/icons';
import { formatNumberNL } from '../utils/number';

const SHOWN_AT_FIRST = 12;

const NO_READINGS = new Map<string, OneRmReading[]>();

export function ForgePage() {
  const navigate = useNavigate();
  const forgeSettings = jumpRoute('forge', { jumpTo: 'forge' });
  const { sessionLogs, templates, program, settings, updateSettings } = useAppData();
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const [query, setQuery] = usePageState('zoek', '');
  const [trainingChoice, setTrainingChoice] = usePageState<string | null>('training', null);
  const [openKey, setOpenKey] = usePageState<string | null>('open', null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [listInfo, setListInfo] = useState(false);

  const strengthKey = strengthModelKey(settings.strengthModel);
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
      rows: comparisonRows(histories, s, bodyKg, templates),
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

          {choices.showComparison && <ComparisonSection rows={model.rows} from={choices.checkFrom} />}
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


// Hoe raak een voorstel was, voor MacroFactor en voor ASCEND tegen dezelfde dag
// (engine/prescriptionCheck.ts). Op de pagina twee korte regels en geen oordeel, per
// training in een onderblad. Het blok staat alleen als "ASCEND naast MacroFactor" aan
// staat.
function ComparisonSection({ rows, from }: { rows: ComparisonRow[]; from: string }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => checkSummary(rows, from), [rows, from]);
  const all = checkLines(summary.all);
  const since = checkLines(summary.since);
  const sinceText = `Sinds ${formatShortDateNL(from)}`;
  const sinceMacroFactor = since.macrofactor ? `${sinceText}: ${since.macrofactor.replace('Raak: ', '')}` : undefined;
  const sinceForge = since.forge ? `${sinceText}: ${since.forge.replace('Raak in Forge: ', 'Forge, ')}` : undefined;
  const empty = !all.macrofactor && !all.forge;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Voorstel en wat je deed</Eyebrow>
      {empty && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Nog te weinig om iets te zeggen. Er zijn trainingen met herhalingen in reserve nodig, waarvoor ASCEND vooraf iets kon voorstellen.</p>
      )}
      {all.macrofactor && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{all.macrofactor}</p>}
      {sinceMacroFactor && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{sinceMacroFactor}</p>}
      {all.forge && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{all.forge}</p>}
      {sinceForge && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{sinceForge}</p>}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Raak is binnen het herhalingenbereik met de herhalingen in reserve die de training vraagt. Voor ASCEND is het een schatting achteraf, uit de beste set van die dag, behalve in Forge als je het voorgestelde gewicht pakte.
      </p>
      {rows.some((r) => r.check) && <TextButton onClick={() => setOpen(true)} className="self-start" icon="verder">Per training bekijken</TextButton>}
      {open && <ComparisonSheet rows={rows} summary={summary} onClose={() => setOpen(false)} />}
    </Card>
  );
}

// "18 van 25 raak, eerder te zwaar".
function tallyText(t: Tally): string {
  const bias = biasWord(t);
  return `${t.hit} van ${t.total} raak${bias ? `, ${bias}` : ''}`;
}

function ComparisonSheet({ rows, summary, onClose }: { rows: ComparisonRow[]; summary: CheckSummary; onClose: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const checked = rows.filter((r) => r.check);
  const shown = showAll ? checked : checked.slice(0, SHOWN_AT_FIRST);
  // Per training day, newest first.
  const groups: { key: string; date: string; name: string; forge: boolean; rows: ComparisonRow[] }[] = [];
  for (const r of shown) {
    let g = groups.find((x) => x.key === r.logId);
    if (!g) groups.push((g = { key: r.logId, date: r.date, name: r.trainingName, forge: r.check?.origin === 'forge', rows: [] }));
    g.rows.push(r);
  }
  const kg = (n: number) => `${formatNumberNL(n, 1)} kg`;
  const parts: { title: string; totals: CheckSummary['all'] }[] = [{ title: 'Alles', totals: summary.all }, { title: `Sinds ${formatShortDateNL(summary.from)}`, totals: summary.since }];
  return (
    <Sheet eyebrow="Forge" title="Voorstel en wat je deed" line="Per oefening: was het voorstel raak voor die dag?" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col gap-2">
          {parts.map((p) => {
            const mf = p.totals.macrofactor;
            const fg = p.totals.forge.ascend;
            const other = p.totals.forge.other;
            if (mf.did.total === 0 && fg.total === 0 && other.did.total === 0) return null;
            return (
              <div key={p.title} className="flex flex-col">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{p.title}</p>
                {mf.did.total > 0 && (
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                    MacroFactor: {tallyText(mf.did)}. ASCEND: {tallyText(mf.ascend)}.
                  </p>
                )}
                {fg.total > 0 && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Forge, ASCEND: {tallyText(fg)}.</p>}
                {other.did.total > 0 && (
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                    Forge met een ander gewicht dan voorgesteld: jij {tallyText(other.did)}. ASCEND: {tallyText(other.ascend)}.
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Een vinkje zegt dat het gewicht raak was voor die dag, bij jou en bij ASCEND voor dezelfde set. Bij ASCEND is dat een schatting achteraf, behalve in Forge als je het voorgestelde gewicht pakte.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.key} className="flex flex-col">
            <p className="pb-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{g.name}, {formatDateNL(g.date)}{g.forge ? ', in Forge' : ''}</p>
            {g.rows.map((r) => (
              <div key={r.exerciseKey} className="flex min-h-[44px] items-center gap-3 border-t py-1.5" style={{ borderColor: 'var(--color-card-border)' }}>
                <p className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{r.exerciseName}</p>
                <div className="flex shrink-0 flex-col gap-0.5 font-sans text-xs tabular-nums leading-snug">
                  <HitLine label={`ASCEND ${kg(r.prescribedKg)}`} hit={r.check?.ascend.hit} />
                  <HitLine label={`jij ${kg(r.actualKg)}`} hit={r.check?.did.hit} strong />
                </div>
              </div>
            ))}
          </div>
        ))}
        {!showAll && checked.length > SHOWN_AT_FIRST && <SecondaryButton onClick={() => setShowAll(true)}>Toon alles ({checked.length})</SecondaryButton>}
      </div>
    </Sheet>
  );
}

// Een regel met het gewicht en, als het voorstel of wat je deed raak was, een vinkje.
function HitLine({ label, hit, strong }: { label: string; hit: boolean | undefined; strong?: boolean }) {
  return (
    <span className="flex items-center justify-end gap-1" style={{ color: strong ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
      {label}
      <span className="flex w-4 justify-center" style={{ color: 'var(--color-progress)' }} role="img" aria-label={hit === undefined ? 'Niet te beoordelen' : hit ? 'Raak' : 'Niet raak'}>
        {hit ? <Icon name="vinkje" size={14} /> : null}
      </span>
    </span>
  );
}
