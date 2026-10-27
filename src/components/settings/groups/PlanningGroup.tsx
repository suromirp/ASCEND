import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { ProposalSheet } from '../../ProposalSheet';
import type { RestDayPlan } from '../../../engine/restDayProposal';
import { addDays, mondayOfWeek, todayISO } from '../../../utils/dates';
import { CHOICES, choiceShort } from '../../../data/settingsChoices';
import { SPORT_LABEL, SPORT_LIST, type Sport } from '../../../engine/sports';
import { SettingsList, SettingsSection } from '../SettingsList';
import { usePlanSettingChange } from '../usePlanSettingChange';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { BudgetSheet, SportSheet } from './PlanningSheets';
import { SummaryRow } from './SummaryRow';
import { rowShown } from './rowShown';
import type { GroupProps } from './types';
import { FAST_GROWTH_WARNING, resolveLongRunGrowth } from '../../../engine/runGrowth';
import { REST_DAY_OPTIONS } from '../../../engine/restDay';
import { ChoiceList, ChoiceSheet } from '../Sheet';

const SPORTS: Sport[] = SPORT_LIST;
const WEEKDAYS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

// Planning: je week, je sporten en hoe ASCEND plant. Alles wat de planning verandert gaat via
// een voorstel met Akkoord of een melding met ongedaan maken (usePlanSettingChange).
export function PlanningGroup({ facts, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings, goalEngineConfig, refresh, planRestDay, applyRestDay, planPreviewPass } = useAppData();
  const [restPlan, setRestPlan] = useState<RestDayPlan | null>(null);
  const [restNote, setRestNote] = useState<string | null>(null);
  const plan = usePlanSettingChange();
  const close = () => setSheet(null);
  // Een keuze in het blad Dagen en tijd opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  const closeInner = () => setInner(null);
  const [advancedGrowth, setAdvancedGrowth] = useState(false);
  const sport = SPORTS.find((s) => sheet === `sport-${s}`);
  const restDay = settings.restDay ?? 1;

  // Een andere rustdag is altijd een voorstel met Akkoord (engine/restDayProposal.ts).
  function chooseRestDay(day: number) {
    if (restDay === day) return;
    const plan = planRestDay(day);
    if (plan.proposal.changes.length === 0) {
      void applyRestDay(plan).then(() => setRestNote('Opgeslagen. Je planning kon gewoon blijven zoals ze was.'));
      return;
    }
    setRestPlan(plan);
  }

  return (
    <>
      {(restNote || (plan.note && !sport)) && (
        <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{restNote ?? plan.note}</p>
      )}

      <SettingsSection title="Je week">
        <SummaryRow id="bundel-dagen" title="Dagen en tijd" facts={facts} onClick={() => setSheet('bundel-dagen')} />
      </SettingsSection>

      <SettingsSection title="Sporten">
        {SPORTS.map((s) => (
          <SummaryRow key={s} id={`sport-${s}`} title={SPORT_LABEL[s]} facts={facts} onClick={() => setSheet(`sport-${s}`)} />
        ))}
      </SettingsSection>

      <SettingsSection title="Hoe ASCEND plant">
        <SummaryRow id="meerdere" title="Twee trainingen per dag" facts={facts} onClick={() => setSheet('meerdere')} />
        <SummaryRow id="wijzigingen" title="Wijzigingen" facts={facts} info="wijzigingen" onClick={() => setSheet('wijzigingen')} />
        <SummaryRow id="ambitie" title="Ambitie" facts={facts} info="ambitie" onClick={() => setSheet('ambitie')} />
        <SummaryRow id="twijfeltest" title="Twijfeltest eerst vragen" facts={facts} info="twijfeltest" onChange={(on) => void updateSettings({ askDoubtTest: on })} />
      </SettingsSection>

      {sheet === 'bundel-dagen' && (
        <BundleSheet eyebrow="Planning" title="Dagen en tijd" line="Hoeveel tijd je hebt en wanneer je rust." onClose={close}>
          <SummaryRow id="trainingstijd" title="Trainingstijd per dag" facts={facts} onClick={() => setInner('trainingstijd')} />
          <SummaryRow id="rustdag" title="Rustdag" facts={facts} onClick={() => setInner('rustdag')} />
          <SummaryRow id="rustdag-doen" title="Op je rustdag" facts={facts} onClick={() => setInner('rustdag-doen')} />
        </BundleSheet>
      )}
      {inner === 'trainingstijd' && (
        <BudgetSheet dailyTimeBudget={goalEngineConfig.availability.dailyTimeBudget} onSave={plan.saveBudget} onClose={closeInner} />
      )}
      {inner === 'rustdag' && (
        <ChoiceSheet<number>
          eyebrow="Planning"
          title="Rustdag"
          line="Je ziet eerst wat er verschuift."
          options={REST_DAY_OPTIONS.map((d) => ({ value: d, label: WEEKDAYS_NL[d - 1] }))}
          value={restDay}
          advice={1}
          onPick={(d) => chooseRestDay(d)}
          onClose={closeInner}
          footer={<p className="st-hint" style={{ marginLeft: 0 }}>Het geldt pas na Akkoord, ook deze week. Wat je zelf verplaatste of afvinkte blijft staan. Het weekend blijft voor de lange trainingen.</p>}
        />
      )}
      {inner === 'rustdag-doen' && (
        <ChoiceFromDef def={CHOICES.rustdagDoen} value={settings.restDayMode ?? 'rest'} onPick={(v) => void updateSettings({ restDayMode: v }).then(() => refresh())} onClose={closeInner} />
      )}
      {sheet === 'meerdere' && (
        <ChoiceFromDef
          def={CHOICES.meerdere}
          value={facts.pairing}
          onPick={(v) => void plan.setPairing(v)}
          onClose={close}
          footer={
            rowShown('zware-dingen', facts) ? (
              <div style={{ marginTop: 16 }}>
                <SettingsList>
                  <SummaryRow id="zware-dingen" title="Benen en een zware loop" facts={facts} onChange={(on) => void plan.changeSetting('Benen en een zware loop', { hardSameDay: on }, on ? 'Je laat benen en een zware loop op één dag toe.' : 'Je zet benen en een zware loop op één dag uit.')} />
                </SettingsList>
              </div>
            ) : undefined
          }
        />
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
          footer={
            <>
              {facts.ambition.chosen !== facts.ambition.effective && facts.ambition.reason && (
                <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-warning)' }}>{`Nu tijdelijk Standaard. ${facts.ambition.reason} Gaat het weer goed, dan staat Stevig vanzelf weer aan.`}</p>
              )}
              <div style={{ marginTop: 16 }}>
                <SettingsList>
                  <SummaryRow id="lange-loop" title="Groei van de lange loop" facts={facts} info="langeLoopGroei" onClick={() => setInner('lange-loop')} />
                </SettingsList>
              </div>
            </>
          }
        />
      )}
      {inner === 'lange-loop' && (() => {
        const current = resolveLongRunGrowth(settings.longRunGrowth);
        const pick = (v: ReturnType<typeof resolveLongRunGrowth>) => {
          if (v === current) return;
          void plan.changeSetting(
            `Groei van de lange loop: ${choiceShort('langeLoopGroei', v)}`,
            { longRunGrowth: v },
            v === 'fast' ? FAST_GROWTH_WARNING : 'Volgt je keuze voor de groei van de lange loop.',
          );
        };
        const main = { ...CHOICES.langeLoopGroei, options: CHOICES.langeLoopGroei.options.filter((o) => o.value !== 'fast') };
        const fast = CHOICES.langeLoopGroei.options.filter((o) => o.value === 'fast').map((o) => ({ value: o.value, label: o.label, note: o.note }));
        return (
          <ChoiceFromDef
            def={main}
            value={current}
            onPick={pick}
            onClose={closeInner}
            footer={
              <div style={{ marginTop: 16 }}>
                <button type="button" className="st-more" aria-expanded={advancedGrowth || current === 'fast'} onClick={() => setAdvancedGrowth((v) => !v)}>
                  <span>Geavanceerd</span>
                </button>
                {(advancedGrowth || current === 'fast') && (
                  <>
                    <ChoiceList label="Geavanceerd" options={fast} value={current} onPick={pick} />
                    <p className="st-hint" style={{ marginLeft: 0 }}>{FAST_GROWTH_WARNING}</p>
                  </>
                )}
              </div>
            }
          />
        );
      })()}
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
              setRestNote('Gelukt, het staat in je planning. Onderin zie je wat er veranderde en kun je het ongedaan maken.');
            } else setRestNote('Je rustdag en je planning blijven zoals ze waren.');
          }}
          onClose={() => setRestPlan(null)}
        />
      )}
    </>
  );
}
