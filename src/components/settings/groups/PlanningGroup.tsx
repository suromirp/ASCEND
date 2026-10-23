import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { ProposalSheet } from '../../ProposalSheet';
import type { RestDayPlan } from '../../../engine/restDayProposal';
import { addDays, mondayOfWeek, todayISO } from '../../../utils/dates';
import { CHOICES, choiceShort } from '../../../data/settingsChoices';
import { SPORT_LABEL, type Sport } from '../../../engine/sports';
import { SettingsSection } from '../SettingsList';
import { usePlanSettingChange } from '../usePlanSettingChange';
import { ChoiceFromDef } from './ChoiceFromDef';
import { BudgetSheet, SportSheet } from './PlanningSheets';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';
import { REST_DAY_OPTIONS } from '../../../engine/restDay';
import { ChoiceSheet } from '../Sheet';

const SPORTS: Sport[] = ['running', 'hiking', 'cycling'];
const WEEKDAYS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

// Planning: je week, je sporten en hoe ASCEND plant. Alles wat de planning verandert gaat via
// een voorstel met Akkoord of een melding met ongedaan maken (usePlanSettingChange).
export function PlanningGroup({ facts, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings, goalEngineConfig, refresh, planRestDay, applyRestDay, planPreviewPass } = useAppData();
  const [restPlan, setRestPlan] = useState<RestDayPlan | null>(null);
  const [restNote, setRestNote] = useState<string | null>(null);
  const plan = usePlanSettingChange();
  const close = () => setSheet(null);
  const sport = SPORTS.find((s) => sheet === `sport-${s}`);
  const restDay = settings.restDay ?? 1;

  // Een andere rustdag is altijd een voorstel met Akkoord (engine/restDayProposal.ts).
  function chooseRestDay(day: number) {
    if (restDay === day) return;
    const plan = planRestDay(day);
    if (plan.proposal.changes.length === 0) {
      void applyRestDay(plan).then(() => setRestNote('Opgeslagen. Je planning hoefde niet te veranderen.'));
      return;
    }
    setRestPlan(plan);
  }

  return (
    <>
      {(restNote || (plan.note && !sport)) && (
        <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{restNote ?? plan.note}</p>
      )}

      <SettingsSection title="Mijn week">
        <SummaryRow id="trainingstijd" title="Trainingstijd per dag" facts={facts} onClick={() => setSheet('trainingstijd')} />
        <SummaryRow id="rustdag" title="Rustdag" facts={facts} onClick={() => setSheet('rustdag')} />
        <SummaryRow id="rustdag-doen" title="Op je rustdag" facts={facts} onClick={() => setSheet('rustdag-doen')} />
        <SummaryRow id="meerdere" title="Twee trainingen per dag" facts={facts} onClick={() => setSheet('meerdere')} />
      </SettingsSection>

      <SettingsSection title="Sporten">
        {SPORTS.map((s) => (
          <SummaryRow key={s} id={`sport-${s}`} title={SPORT_LABEL[s]} facts={facts} onClick={() => setSheet(`sport-${s}`)} />
        ))}
      </SettingsSection>

      <SettingsSection
        title="Hoe ASCEND plant"
        advancedIds={['zware-dingen']}
        storageKey="planning-plant"
        advanced={<SummaryRow id="zware-dingen" title="Benen en een zware loop" facts={facts} onChange={(on) => void updateSettings({ hardSameDay: on }).then(() => refresh())} />}
      >
        <SummaryRow id="wijzigingen" title="Wijzigingen" facts={facts} info="wijzigingen" onClick={() => setSheet('wijzigingen')} />
        <SummaryRow id="ambitie" title="Ambitie" facts={facts} info="ambitie" onClick={() => setSheet('ambitie')} />
      </SettingsSection>

      {sheet === 'trainingstijd' && (
        <BudgetSheet dailyTimeBudget={goalEngineConfig.availability.dailyTimeBudget} onSave={plan.saveBudget} onClose={close} />
      )}
      {sheet === 'rustdag' && (
        <ChoiceSheet<number>
          eyebrow="Planning"
          title="Rustdag"
          line="Je ziet eerst wat er verschuift."
          options={REST_DAY_OPTIONS.map((d) => ({ value: d, label: WEEKDAYS_NL[d - 1] }))}
          value={restDay}
          advice={1}
          onPick={(d) => chooseRestDay(d)}
          onClose={close}
          footer={<p className="st-hint" style={{ marginLeft: 0 }}>Het geldt pas na Akkoord, ook deze week. Wat je zelf verplaatste of afvinkte blijft staan. Het weekend blijft voor de lange trainingen.</p>}
        />
      )}
      {sheet === 'rustdag-doen' && (
        <ChoiceFromDef def={CHOICES.rustdagDoen} value={settings.restDayMode ?? 'rest'} onPick={(v) => void updateSettings({ restDayMode: v }).then(() => refresh())} onClose={close} />
      )}
      {sheet === 'meerdere' && (
        <ChoiceFromDef def={CHOICES.meerdere} value={facts.pairing} onPick={(v) => void plan.setPairing(v)} onClose={close} />
      )}
      {sport && <SportSheet sport={sport} note={plan.note} onToggle={(s, on) => void plan.toggleSport(s, on)} onFrequency={(s, n) => void plan.setFrequency(s, n)} onClose={close} />}
      {sheet === 'wijzigingen' && (
        <ChoiceFromDef def={CHOICES.wijzigingen} value={plan.applyMode} onPick={(v) => void updateSettings({ changeApplyMode: v })} onClose={close} />
      )}
      {sheet === 'ambitie' && (
        <ChoiceFromDef
          def={CHOICES.ambitie}
          value={facts.ambition.chosen}
          onPick={(v) => { if (v !== facts.ambition.chosen) void plan.changeSetting(`Ambitie: ${choiceShort('ambitie', v)}`, { ambition: v }, 'Volgt je nieuwe ambitie.'); }}
          onClose={close}
          footer={facts.ambition.chosen !== facts.ambition.effective && facts.ambition.reason
            ? <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-warning)' }}>{`Nu tijdelijk Standaard. ${facts.ambition.reason} Gaat het weer goed, dan staat Stevig vanzelf weer aan.`}</p>
            : undefined}
        />
      )}
      {plan.impact}
      {restPlan && (
        <ProposalSheet
          advice={{
            id: `restday:${restPlan.restDay}`,
            trigger: 'plan_update',
            ruleId: 'REST-DAY',
            title: 'Zo ziet je planning eruit',
            effect: restPlan.proposal.consequences,
            why: restPlan.proposal.explanation,
            priority: 0,
            proposal: restPlan.proposal,
          }}
          eyebrow={`Rustdag · ${WEEKDAYS_NL[restPlan.restDay - 1]}`}
          previewPass={(sessions) => planPreviewPass(sessions, undefined, restPlan.restDay)}
          leave={settings.leavePeriods}
          notes={['Wat je zelf verplaatste of al afvinkte, je tochten en een test of wedstrijd die je vastzette.']}
          listUntil={addDays(mondayOfWeek(todayISO()), 13)}
          onRespond={async (response) => {
            if (response === 'accepted') {
              await applyRestDay(restPlan);
              setRestNote('Opgeslagen en toegepast. Onderin zie je wat er veranderde, met ongedaan maken.');
            } else setRestNote('Je rustdag en je planning blijven zoals ze waren.');
          }}
          onClose={() => setRestPlan(null)}
        />
      )}
    </>
  );
}
