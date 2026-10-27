// ASCEND — Etappeplan: de 36 officiële etappes van de GR5 als boek voor
// onderweg, ook zonder bereik. Bovenaan je vijf zwaarste dagen, dan de
// etappes per stuk; een etappe opent een eigen scherm met alles erover en je
// eigen plan (slaapplek, samenvoegen, rustdag). De cijfers zijn vaste data
// (data/gr5Stages.ts), de regels staan in engine/routePlan.ts.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StageSheet } from '../components/StageSheet';
import { Card, Eyebrow, Num, SecondaryButton, PageHeader } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { useTripPlan } from '../state/useTripPlan';
import { GR5_SECTIONS, GR5_STAGES, STAGES_SOURCE, STAGES_SOURCE_URL, STAGES_TAKEN_ON, stagesOfSection, type Gr5Stage } from '../data/gr5Stages';
import { buildItinerary, compareWithBest, dayLabel, formatStageTime, hardestDays, hasHighPass, itineraryTotals, type ItineraryDay } from '../engine/routePlan';
import { SLEEP_KINDS, SLEEP_LABEL } from '../models/routePlan';
import { formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { stageWater, stageWaterShort } from '../engine/stageWater';
import { sweatRateAt, usableSweatEntries } from '../engine/sweat';
import { usePageState } from '../components/usePageState';
import { Icon } from '../components/icons';
import { mainGoal } from '../engine/mainGoal';

// "Nachten: 2 tent, 1 gîte, 33 nog niet gekozen." Alleen wat er is.
function nightsText(nights: ReturnType<typeof itineraryTotals>['nights']): string {
  const chosen = SLEEP_KINDS.filter((k) => nights[k] > 0).map((k) => `${nights[k]} ${SLEEP_LABEL[k].toLowerCase()}`);
  if (chosen.length === 0) return 'Je hebt nog geen slaapplekken gekozen. Kies ze per etappe.';
  return `Nachten: ${[...chosen, ...(nights.open > 0 ? [`${nights.open} nog niet gekozen`] : [])].join(', ')}.`;
}

export function EtappesPage() {
  const navigate = useNavigate();
  const { trainingGoals, goalMilestones, sessionLogs, settings } = useAppData();
  const showWater = settings.showStageWater !== false;
  // Alleen metingen van trainingen die er nog zijn, met de duur uit de log zelf.
  const sweat = useMemo(() => usableSweatEntries(settings.sweatEntries, sessionLogs), [settings.sweatEntries, sessionLogs]);
  const waterUnmeasured = showWater && sweatRateAt(sweat, 20, 'walk').basis === 'default';
  const waterShort = (stage: Gr5Stage): string => {
    const w = stageWater(stage, sweat);
    return w ? stageWaterShort(w) : '';
  };
  const { plan, loaded, choose } = useTripPlan();
  const [openId, setOpenId] = usePageState<string | null>('openId', null, (v) => v === null || GR5_STAGES.some((st) => st.id === v));
  const today = todayISO();

  // Het hoofddoel (het doel met de ladder) bepaalt de startdatum.
  const goal = mainGoal(trainingGoals, goalMilestones, 'live');
  const startDate = goal?.targetDate;

  const days = useMemo(() => buildItinerary(plan, startDate), [plan, startDate]);
  const totals = useMemo(() => itineraryTotals(days), [days]);
  const hardest = useMemo(() => hardestDays(days), [days]);
  const dayOfStage = (stage: Gr5Stage): ItineraryDay => days.find((d) => d.stages.some((s) => s.id === stage.id))!;
  const open = openId ? GR5_STAGES.find((s) => s.id === openId) : undefined;

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-6">
      <PageHeader eyebrow="Ascend" title="Etappes" line="De 36 etappes van de GR5" fallback="/ascend" />
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Van het Meer van Genève naar Nice. Alles staat in de app, dus ook zonder bereik kun je het nalezen. Kies per etappe waar je slaapt, of je haar samenvoegt met de volgende of een rustdag neemt.
      </p>

      <Card className="flex flex-col gap-3" texture>
        <Eyebrow>Je vijf zwaarste dagen</Eyebrow>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Gerangschikt op omhoog plus omlaag samen, volgens jouw plan. Daaronder wat je al kunt: je beste dag van de laatste acht weken.
        </p>
        <div className="flex flex-col">
          {hardest.map((d) => {
            const best = compareWithBest(d, sessionLogs, today);
            const up = best.find((r) => r.key === 'stijgen');
            const down = best.find((r) => r.key === 'dalen');
            return (
              <button
                key={d.dayNumber}
                onClick={() => setOpenId(d.stages[0].id)}
                className="flex min-h-[56px] items-center justify-between gap-3 border-b py-2 text-left last:border-b-0"
                style={{ borderColor: 'var(--color-card-border)' }}
              >
                <span className="min-w-0">
                  <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{dayLabel(d)}: {d.from} naar {d.to}</span>
                  <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                    {formatNumberNL(d.up, 0)} m omhoog en {formatNumberNL(d.down, 0)} m omlaag{d.incomplete ? ' (een waarde ontbreekt bij de site)' : ''}
                  </span>
                  <span className="block text-xs leading-snug" style={{ color: up?.enough && down?.enough ? 'var(--color-success-text)' : 'var(--color-ink-dim)' }}>
                    {up && down && (up.best > 0 || down.best > 0)
                      ? `Jouw beste: ${formatNumberNL(up.best, 0)} m omhoog, ${formatNumberNL(down.best, 0)} m omlaag`
                      : 'Nog geen tocht om mee te vergelijken'}
                  </span>
                </span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <Eyebrow>Je plan in cijfers</Eyebrow>
        <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>
          <Num>{totals.walkDays}</Num> loopdagen{totals.restDays > 0 ? <> en <Num>{totals.restDays}</Num> {totals.restDays === 1 ? 'rustdag' : 'rustdagen'}</> : ''}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Samen {formatNumberNL(totals.km, 1)} km, {formatNumberNL(totals.up, 0)} m omhoog en {formatNumberNL(totals.down, 0)} m omlaag, opgeteld uit de etappes{totals.incomplete ? ' (enkele waarden ontbreken bij de site, dus in werkelijkheid iets meer)' : ''}.
          {startDate && totals.endDate ? ` Start ${formatDateNL(startDate)}, aankomst in Nice ${formatDateNL(totals.endDate)}.` : ' Stel een GR5-doel met datum in om de data per dag te zien.'}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          {nightsText(totals.nights)}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Cijfers van {STAGES_SOURCE}, overgenomen op {formatDateNL(STAGES_TAKEN_ON)}. De route verandert soms, bijvoorbeeld bij Peisey. Controleer de GPX voor vertrek.
        </p>
        <a href={STAGES_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
          Officiële etappes<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
        </a>
      </Card>

      {!loaded && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Je plan wordt geladen.</p>}

      {waterUnmeasured && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Het water per etappe is nog niet jouw eigen meting; het zijn algemene cijfers. Meet je zweetverlies bij een training om het jouwe te zien.
        </p>
      )}

      {GR5_SECTIONS.map((section) => (
        <Card key={section.id} className="flex flex-col gap-1">
          <Eyebrow>{`Stuk ${section.id} · ${section.name}`}</Eyebrow>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{section.count} etappes</p>
          {stagesOfSection(section.id).map((stage) => {
            const day = dayOfStage(stage);
            const choice = plan.choices[stage.id];
            const second = day.stages.length === 2 && day.stages[1].id === stage.id;
            const first = day.stages.length === 2 && day.stages[0].id === stage.id;
            const nextDay = days[days.indexOf(day) + 1];
            const restAfter = nextDay?.kind === 'rest' && day.stages[day.stages.length - 1].id === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setOpenId(stage.id)}
                className="flex min-h-[64px] items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0"
                style={{ borderColor: 'var(--color-card-border)' }}
              >
                <span className="min-w-0">
                  <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                    <span style={{ color: 'var(--color-ink-dim)' }}>{stage.overall}</span> {stage.from} naar {stage.to}
                  </span>
                  <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                    {stage.km === null ? 'afstand onbekend' : `${formatNumberNL(stage.km, 1)} km`}
                    {' · '}{stage.up === null ? 'omhoog onbekend' : `${formatNumberNL(stage.up, 0)} m omhoog`}
                    {' · '}{stage.down === null ? 'omlaag onbekend' : `${formatNumberNL(stage.down, 0)} m omlaag`}
                    {stage.minutes !== null && ` · ${formatStageTime(stage.minutes)}`}
                  </span>
                  <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                    {[
                      !second && day.date ? `${weekdayShortNL(day.date).toLowerCase()} ${formatDateNL(day.date).replace(/ \d{4}$/, '')}` : second ? 'zelfde dag als de vorige' : '',
                      first ? 'met de volgende op één dag' : '',
                      !first && choice?.sleep ? SLEEP_LABEL[choice.sleep] : '',
                      restAfter ? 'rustdag erna' : '',
                      hasHighPass(stage) ? 'hoge pas' : '',
                      showWater ? waterShort(stage) : '',
                    ].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
              </button>
            );
          })}
        </Card>
      ))}

      <Card className="flex flex-col gap-2">
        <Eyebrow>Alleen onderweg</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          Van dit plan maak je een vertrekbrief voor thuis, met de afspraak voor je dagelijkse bericht.
        </p>
        <SecondaryButton onClick={() => navigate('/onderweg')}>Naar alleen onderweg</SecondaryButton>
      </Card>

      {open && (
        <StageSheet
          stage={open}
          plan={plan}
          day={dayOfStage(open)}
          logs={sessionLogs}
          today={today}
          water={showWater ? stageWater(open, sweat) : undefined}
          onChoose={choose}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
