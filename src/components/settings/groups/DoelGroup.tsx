import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { ImpactSheet } from '../../ImpactSheet';
import { afterMainGoalChange } from '../../../engine/programLayout';
import { bootGoalKm } from '../../../engine/bootBreakIn';
import { todayISO } from '../../../utils/dates';
import { SettingsSection } from '../SettingsList';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { usePlanSettingChange } from '../usePlanSettingChange';
import { choiceShort } from '../../../data/settingsChoices';
import { ProgramSheet, RestartSheet } from './DoelSheets';
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
      {(note || plan.note) && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{note ?? plan.note}</p>}
      <SettingsSection title="Doel">
        <SummaryRow id="doelen" title="Hoofddoel" facts={facts} onClick={() => navigate('/ascend/doelen')} />
        <SummaryRow id="programma" title="Programma" facts={facts} onClick={() => setSheet('programma')} />
        <SummaryRow id="lange-zondag" title="De lange zondag" facts={facts} onClick={() => setSheet('lange-zondag')} />
        <SummaryRow id="na-hoofddoel" title="Na je hoofddoel" facts={facts} onClick={() => setSheet('na-hoofddoel')} />
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
      {sheet === 'lange-zondag' && (
        <ChoiceFromDef def={CHOICES.langeZondag} value={settings.longSundaySession ?? 'hike'} onPick={(v) => { if (v !== (settings.longSundaySession ?? 'hike')) { setNote(null); void plan.changeSetting(`De lange zondag: ${choiceShort('langeZondag', v)}`, { longSundaySession: v }, 'Volgt je keuze voor de lange zondag.'); } }} onClose={close} />
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
                setNote(v === 'stop' ? 'Gelukt: na je hoofddoel plant ASCEND niets meer.' : 'Gelukt: ASCEND plant weer onderhoudsweken.');
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
    </>
  );
}
