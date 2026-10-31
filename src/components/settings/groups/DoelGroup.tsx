import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { ImpactSheet } from '../../ImpactSheet';
import { afterMainGoalChange } from '../../../engine/programLayout';
import { bootGoalKm } from '../../../engine/bootBreakIn';
import { resolveReadinessWeighting } from '../../../engine/raceReadiness';
import { resolveGrowthChoice, resolveLimitMargin } from '../../../data/goalGrowth';
import { todayISO } from '../../../utils/dates';
import { SettingsSection } from '../SettingsList';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { usePlanSettingChange } from '../usePlanSettingChange';
import { choiceShort } from '../../../data/settingsChoices';
import { ProgramSheet, RestartSheet } from './DoelSheets';
import { WeekBudgetSheet } from './WeekBudgetSheet';
import { DirectionSheet } from '../../ascend/YourWeek';
import { useDirectionChange } from '../../ascend/useDirectionChange';
import { parseDirection } from '../../../engine/direction';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Doel en tochten: waar je naartoe werkt, de tochten onderweg en wat je nog moet regelen.
// Doelen, vrije dagen, de reisplanner en de paklijst blijven hun eigen pagina; hier staat wat je
// instelt en waar je het vindt.
export function DoelGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { settings, updateSettings, refresh, trainingGoals, goalMilestones, plannedSessions, sessionLogs } = useAppData();
  // Is het hoofddoel al voorbij, dan verandert "Na je hoofddoel" de planning meteen: eerst een voorstel met Akkoord.
  const [afterGoalPlan, setAfterGoalPlan] = useState<{ value: 'stop' | 'maintain'; lines: string[] } | null>(null);
  const [afterGoalBusy, setAfterGoalBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // De lange zondag en Rust na een bergtocht laten de planningsronde anders lopen: eerst het voorstel.
  const plan = usePlanSettingChange();
  // Een andere richting is een voorstel met Akkoord (docs/visie/Zonder doel.md, 3.5).
  const direction = useDirectionChange();
  const { program } = useAppData();

  function chooseAfterGoal(v: 'stop' | 'maintain') {
    const change = afterMainGoalChange(trainingGoals, goalMilestones, todayISO(), plannedSessions, sessionLogs, settings.afterMainGoal ?? 'stop', v);
    if (change.proposal) {
      setAfterGoalPlan({ value: v, lines: change.lines });
      return;
    }
    void updateSettings({ afterMainGoal: v }).then(() => refresh());
  }
  const close = () => setSheet(null);
  // Een keuze in het blad Tochten opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  const closeInner = () => setInner(null);

  return (
    <>
      {(note || plan.note || direction.note) && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{note ?? plan.note ?? direction.note}</p>}
      <SettingsSection title="Doel">
        <SummaryRow id="doelen" title="Hoofddoel" facts={facts} onClick={() => navigate('/ascend/doelen')} />
        <SummaryRow id="programma" title="Programma" facts={facts} onClick={() => setSheet('programma')} />
        <SummaryRow id="bundel-zonder-doel" title="Zonder doel" facts={facts} onClick={() => setSheet('bundel-zonder-doel')} />
        <SummaryRow id="lange-zondag" title="De lange zondag" facts={facts} onClick={() => setSheet('lange-zondag')} />
        <SummaryRow id="na-hoofddoel" title="Na je hoofddoel" facts={facts} onClick={() => setSheet('na-hoofddoel')} />
        <SummaryRow id="klaar-weging" title="Weging bij een doeltijd" facts={facts} info="klaarWeging" onClick={() => setSheet('klaar-weging')} />
        <SummaryRow id="klaar-groei" title="Groei bij het rekenen" facts={facts} info="klaarGroei" onClick={() => setSheet('klaar-groei')} />
        <SummaryRow id="klaar-marge" title="Marge bij een tijdslimiet" facts={facts} info="klaarMarge" onClick={() => setSheet('klaar-marge')} />
        <SummaryRow id="doeltijd-voorstel" title="Doeltijd aanpassen voorstellen" facts={facts} info="doeltijdVoorstel" onChange={(on) => void updateSettings({ proposeTargetTime: on })} />
        <SummaryRow id="seizoensstrook" title="Seizoensstrook tonen" facts={facts} info="seizoensstrook" onChange={(on) => void updateSettings({ showSeasonStrip: on })} />
      </SettingsSection>

      <SettingsSection title="Tochten">
        <SummaryRow id="bundel-tochten" title="Tochten" facts={facts} onClick={() => setSheet('bundel-tochten')} />
        <SummaryRow id="vrije-dagen" title="Vrije dagen en vakanties" facts={facts} onClick={() => navigate('/week')} />
      </SettingsSection>

      {sheet === 'bundel-tochten' && (
        <BundleSheet eyebrow="Doel en tochten" title="Tochten" line="Wat ASCEND doet rond een tocht." onClose={close}>
          <SummaryRow id="volgende-tocht" title="Volgende tocht op Vandaag" facts={facts} onChange={(on) => void updateSettings({ showNextTrek: on })} />
          <SummaryRow id="water-per-etappe" title="Water per etappe tonen" facts={facts} info="waterPerEtappe" onChange={(on) => void updateSettings({ showStageWater: on })} />
          <SummaryRow id="rust-na-tocht" title="Rust na een bergtocht" facts={facts} info="rustNaTocht" onClick={() => setInner('rust-na-tocht')} />
          <SummaryRow id="bergschoenen" title="Bergschoenen inlopen" facts={facts} info="bergschoenen" onClick={() => setInner('bergschoenen')} />
          <SummaryRow id="bergschoenen-herinnering" title="Herinnering bij lange tochten" facts={facts} info="bergschoenenHerinnering" onChange={(on) => void updateSettings({ bootBreakInReminder: on })} />
        </BundleSheet>
      )}
      {sheet === 'programma' && <ProgramSheet onClose={close} onRestart={() => setSheet('opnieuw')} />}
      {sheet === 'opnieuw' && <RestartSheet onClose={close} />}
      {sheet === 'bundel-zonder-doel' && (
        <BundleSheet eyebrow="Doel en tochten" title="Zonder doel" line="Hoe ASCEND je weken plant en telt als je geen doel hebt." onClose={close}>
          <SummaryRow id="richting" title="Richting" facts={facts} info="richting" onClick={() => setInner('richting')} />
          <SummaryRow id="weekbudget" title="Weekbudget" facts={facts} info="weekbudget" onClick={() => setInner('weekbudget')} />
        </BundleSheet>
      )}
      {inner === 'weekbudget' && <WeekBudgetSheet onClose={closeInner} onPropose={(weekBudget) => { setNote(null); plan.clearNote(); void direction.proposeBudget(weekBudget); }} />}
      {inner === 'richting' && (
        <DirectionSheet
          current={parseDirection(settings.direction)}
          hasPlan={!!program}
          onChoose={(id) => { setNote(null); plan.clearNote(); void direction.choose(id); }}
          onClose={closeInner}
        />
      )}
      {sheet === 'lange-zondag' && (
        <ChoiceFromDef def={CHOICES.langeZondag} value={settings.longSundaySession ?? 'hike'} onPick={(v) => { if (v !== (settings.longSundaySession ?? 'hike')) { setNote(null); void plan.changeSetting(`De lange zondag: ${choiceShort('langeZondag', v)}`, { longSundaySession: v }, 'Volgt je keuze voor de lange zondag.'); } }} onClose={close} />
      )}
      {sheet === 'klaar-weging' && (
        <ChoiceFromDef def={CHOICES.klaarWeging} value={resolveReadinessWeighting(settings.readinessWeighting)} onPick={(v) => void updateSettings({ readinessWeighting: v })} onClose={close} />
      )}
      {sheet === 'klaar-groei' && (
        <ChoiceFromDef def={CHOICES.klaarGroei} value={resolveGrowthChoice(settings.goalGrowth)} onPick={(v) => void updateSettings({ goalGrowth: v })} onClose={close} />
      )}
      {sheet === 'klaar-marge' && (
        <ChoiceFromDef def={CHOICES.klaarMarge} value={resolveLimitMargin(settings.limitMargin)} onPick={(v) => void updateSettings({ limitMargin: v })} onClose={close} />
      )}
      {sheet === 'na-hoofddoel' && (
        <ChoiceFromDef def={CHOICES.naHoofddoel} value={settings.afterMainGoal ?? 'stop'} onPick={chooseAfterGoal} onClose={close} />
      )}
      {afterGoalPlan && (
        <ImpactSheet
          eyebrow="Planning aanpassen?"
          title={afterGoalPlan.value === 'stop' ? 'Na je hoofddoel: niets meer plannen' : 'Na je hoofddoel: onderhoudsweken'}
          lines={afterGoalPlan.lines}
          why="Je hoofddoel ligt achter je, dus deze keuze verandert je planning meteen. Daarom eerst je Akkoord."
          primaryLabel="Akkoord"
          secondaryLabel="Liever niet"
          note="Met Liever niet blijven de instelling en je planning zoals ze waren."
          onPrimary={() => {
            const v = afterGoalPlan.value;
            setAfterGoalBusy(true);
            void (async () => {
              try {
                await updateSettings({ afterMainGoal: v });
                await refresh();
                setNote(v === 'stop' ? 'Opgeslagen. Na je hoofddoel plant ASCEND niets meer.' : 'Opgeslagen. ASCEND plant weer onderhoudsweken.');
              } finally {
                setAfterGoalBusy(false);
                setAfterGoalPlan(null);
              }
            })();
          }}
          onSecondary={() => {
            setNote('Je instelling en je planning blijven zoals ze waren.');
            setAfterGoalPlan(null);
          }}
          onClose={() => setAfterGoalPlan(null)}
          busy={afterGoalBusy}
        />
      )}
      {inner === 'bergschoenen' && (
        <ChoiceFromDef def={CHOICES.bergschoenen} value={bootGoalKm(settings.bootBreakInKm) as 50 | 75 | 100 | 150} onPick={(v) => void updateSettings({ bootBreakInKm: v })} onClose={closeInner} />
      )}
      {inner === 'rust-na-tocht' && (
        <ChoiceFromDef def={CHOICES.rustNaTocht} value={settings.trekLegRest ?? 'soft'} onPick={(v) => { if (v !== (settings.trekLegRest ?? 'soft')) { setNote(null); void plan.changeSetting(`Rust na een bergtocht: ${choiceShort('rustNaTocht', v)}`, { trekLegRest: v }, 'Volgt je keuze voor rust na een bergtocht.'); } }} onClose={closeInner} />
      )}
      {plan.impact}
      {direction.sheet}
    </>
  );
}
