import { useState } from 'react';
import { OrderSheet } from '../../stand/OrderSheet';
import { useAppData } from '../../../state/AppDataContext';
import { ProposalSheet } from '../../ProposalSheet';
import type { RestDayPlan } from '../../../engine/restDayProposal';
import { addDays, mondayOfWeek, todayISO } from '../../../utils/dates';
import { CHOICES, choiceShort } from '../../../data/settingsChoices';
import { SettingsList, SettingsSection } from '../SettingsList';
import { usePlanSettingChange } from '../usePlanSettingChange';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { BudgetSheet } from './PlanningSheets';
import { SportCountingSheet } from './SportCountingSheet';
import { useNavigate } from 'react-router-dom';
import { KIND_AMOUNT_ROUTE, SPORTS_ROUTE } from '../../../pages/settings/sportsRoute';
import { SummaryRow } from './SummaryRow';
import { rowShown } from './rowShown';
import type { GroupProps } from './types';
import { FAST_GROWTH_WARNING, resolveLongRunGrowth } from '../../../engine/runGrowth';
import { resolveTestStops } from '../../../engine/bestEffort';
import { resolveTestRest } from '../../../engine/testRest';
import { REST_DAY_OPTIONS } from '../../../engine/restDay';
import { resolveMissedSettings } from '../../../engine/missedTraining';
import { ChoiceList, ChoiceSheet } from '../Sheet';
import { resolveDropOnTraining } from '../../../engine/dropOnTraining';

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
  const navigate = useNavigate();
  const restDay = settings.restDay ?? 1;
  const missed = resolveMissedSettings(settings);

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
      {(restNote || plan.note) && (
        <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{restNote ?? plan.note}</p>
      )}

      <SettingsSection title="Je week">
        <SummaryRow id="bundel-dagen" title="Dagen en tijd" facts={facts} onClick={() => setSheet('bundel-dagen')} />
      </SettingsSection>

      <SettingsSection title="Sporten">
        <SummaryRow id="sporten" title="Sporten" facts={facts} info="sporten" onClick={() => navigate(SPORTS_ROUTE)} />
        <SummaryRow id="hoeveel-per-soort" title="Hoeveel per soort" facts={facts} info="hoeveelPerSoort" onClick={() => navigate(KIND_AMOUNT_ROUTE)} />
        <SummaryRow id="bundel-sporten-tellen" title="Hoe sporten meetellen" facts={facts} info="sportenTellen" onClick={() => setSheet('bundel-sporten-tellen')} />
      </SettingsSection>

      <SettingsSection
        title="Hoe ASCEND plant"
        advancedTitles="Training die niet doorging, Beenkracht de dag na de lange duurloop, Trainingen slepen in Week, Volgorde van Je stand, Opzij voor een vakantie, Zones bijwerken na een test"
        advanced={
          <>
            <SummaryRow id="bundel-niet-doorgegaan" title="Training die niet doorging" facts={facts} info="nietDoorgegaan" onClick={() => setSheet('bundel-niet-doorgegaan')} />
            <SummaryRow id="lange-loop-benen" title="Beenkracht de dag na de lange duurloop" facts={facts} info="langeLoopBenen" onChange={(on) => void plan.changeSetting('Beenkracht de dag na de lange duurloop', { longRunThenLegs: on }, on ? 'Beenkracht mag de dag na de lange duurloop.' : 'Weer 48 uur tussen de lange duurloop en beenkracht.')} />
            <SummaryRow id="bundel-slepen" title="Trainingen slepen in Week" facts={facts} info="slepenWeek" onClick={() => setSheet('bundel-slepen')} />
            <SummaryRow id="volgorde-stand" title="Volgorde van Je stand" facts={facts} info="volgordeStand" onClick={() => setSheet('volgorde-stand')} />
            <SummaryRow id="vakantie-opzij" title="Opzij voor een vakantie" facts={facts} info="vakantieOpzij" onClick={() => setSheet('vakantie-opzij')} />
            <SummaryRow id="zones-na-test" title="Zones bijwerken na een test" facts={facts} info="zonesNaTest" onChange={(on) => void updateSettings({ zonesAfterTest: on })} />
          </>
        }
      >
        <SummaryRow id="meerdere" title="Twee trainingen per dag" facts={facts} info="meerdere" onClick={() => setSheet('meerdere')} />
        <SummaryRow id="wijzigingen" title="Wijzigingen" facts={facts} info="wijzigingen" onClick={() => setSheet('wijzigingen')} />
        <SummaryRow id="ambitie" title="Ambitie" facts={facts} info="ambitie" onClick={() => setSheet('ambitie')} />
        <SummaryRow id="bundel-testloop" title="Testloop" facts={facts} onClick={() => setSheet('bundel-testloop')} />
        <SummaryRow id="rustdag-terug" title="Rustdag terugzetten voorstellen" facts={facts} info="rustdagTerug" onChange={(on) => void updateSettings({ restDayBack: on })} />
        <SummaryRow id="weekvoorstel" title="Voorstel bij een probleem in de week" facts={facts} info="weekVoorstel" onChange={(on) => void updateSettings({ weekFixProposal: on })} />
        <SummaryRow id="zonder-sportschool" title="Kracht zonder sportschool" facts={facts} info="zonderSportschool" onClick={() => setSheet('zonder-sportschool')} />
      </SettingsSection>

      {sheet === 'bundel-dagen' && (
        <BundleSheet eyebrow="Planning" title="Dagen en tijd" line="Hoeveel tijd je hebt en wanneer je rust." onClose={close}>
          <SummaryRow id="trainingstijd" title="Trainingstijd per dag" facts={facts} info="trainingstijd" onClick={() => setInner('trainingstijd')} />
          <SummaryRow id="rustdag" title="Rustdag" facts={facts} info="rustdag" onClick={() => setInner('rustdag')} />
          <SummaryRow id="rustdag-doen" title="Op je rustdag" facts={facts} onClick={() => setInner('rustdag-doen')} />
        </BundleSheet>
      )}
      {sheet === 'bundel-niet-doorgegaan' && (
        <BundleSheet eyebrow="Planning" title="Training die niet doorging" line="Een training die voorbij is zonder log." onClose={close}>
          <SummaryRow id="niet-doorgegaan" title="Wat ASCEND doet" facts={facts} info="nietDoorgegaan" onClick={() => setInner('niet-doorgegaan')} />
          {rowShown('niet-doorgegaan-dagen', facts) && <SummaryRow id="niet-doorgegaan-dagen" title="Na hoeveel dagen" facts={facts} onClick={() => setInner('niet-doorgegaan-dagen')} />}
          <SummaryRow id="log-koppelen" title="Log op een andere dag koppelen" facts={facts} onChange={(on) => void updateSettings({ missedLink: on })} />
        </BundleSheet>
      )}
      {sheet === 'bundel-slepen' && (
        <BundleSheet eyebrow="Planning" title="Trainingen slepen in Week" line="Een training met het greepje naar een andere dag." onClose={close}>
          <SummaryRow id="slepen-week" title="Trainingen slepen in Week" facts={facts} info="slepenWeek" onChange={(on) => void updateSettings({ dragWeek: on })} />
          <SummaryRow id="loslaten-training" title="Loslaten op een training" facts={facts} info="loslatenTraining" onClick={() => setInner('loslaten-training')} />
        </BundleSheet>
      )}
      {inner === 'loslaten-training' && (
        <ChoiceFromDef def={CHOICES.loslaten} value={resolveDropOnTraining(settings)} onPick={(v) => void updateSettings({ dropOnTraining: v })} onClose={closeInner} />
      )}
      {sheet === 'bundel-sporten-tellen' && <SportCountingSheet facts={facts} plan={plan} onClose={close} />}
      {inner === 'niet-doorgegaan' && (
        <ChoiceFromDef def={CHOICES.nietDoorgegaan} value={missed.choice} onPick={(v) => void updateSettings({ missedTraining: v })} onClose={closeInner} />
      )}
      {inner === 'niet-doorgegaan-dagen' && (
        <ChoiceFromDef def={CHOICES.nietDoorgegaanDagen} value={missed.days} onPick={(v) => void updateSettings({ missedTrainingDays: v })} onClose={closeInner} />
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
      {sheet === 'wijzigingen' && (
        <ChoiceFromDef def={CHOICES.wijzigingen} value={plan.applyMode} onPick={(v) => void updateSettings({ changeApplyMode: v })} onClose={close} />
      )}
      {sheet === 'volgorde-stand' && <OrderSheet onClose={close} />}
      {sheet === 'vakantie-opzij' && (
        <ChoiceFromDef
          def={CHOICES.vakantieOpzij}
          value={settings.leaveCrowding ?? 'drop'}
          onPick={(v) => { if (v !== (settings.leaveCrowding ?? 'drop')) void plan.changeSetting(`Opzij voor een vakantie: ${choiceShort('vakantieOpzij', v)}`, { leaveCrowding: v }, 'Volgt je keuze voor trainingen die moeten wijken voor een vakantie.'); }}
          onClose={close}
        />
      )}
      {/* Alleen de eerste keuze voor een nieuwe periode: verandert geen planning, dus meteen bewaard. */}
      {sheet === 'zonder-sportschool' && (
        <ChoiceFromDef def={CHOICES.zonderSportschool} value={settings.noGymStrength ?? 'bodyweight'} onPick={(v) => void updateSettings({ noGymStrength: v })} onClose={close} />
      )}
      {sheet === 'bundel-testloop' && (
        <BundleSheet eyebrow="Planning" title="Testloop" line="Hoe ASCEND een test leest en plant." onClose={close}>
          <SummaryRow id="twijfeltest" title="Twijfeltest eerst vragen" facts={facts} info="twijfeltest" onChange={(on) => void updateSettings({ askDoubtTest: on })} />
          <SummaryRow id="test-stilstaan" title="Stilstaan bij een testloop" facts={facts} info="testStilstaan" onClick={() => setInner('test-stilstaan')} />
          <SummaryRow id="nieuwe-test" title="Nieuwe test voorstellen bij stilstand" facts={facts} info="nieuweTest" onChange={(on) => void updateSettings({ newTestOnStops: on })} />
          <SummaryRow id="test-rust" title="Rust voor een test" facts={facts} info="testRust" onClick={() => setInner('test-rust')} />
        </BundleSheet>
      )}
      {inner === 'test-rust' && (
        <ChoiceFromDef def={CHOICES.testRust} value={resolveTestRest(settings.testRest)} onPick={(v) => { if (v !== resolveTestRest(settings.testRest)) void plan.changeSetting(`Rust voor een test: ${choiceShort('testRust', v)}`, { testRest: v }, `Een testloop staat nu minstens ${v} uur na een zware loop- of beendag.`); }} onClose={closeInner} />
      )}
      {inner === 'test-stilstaan' && (
        <ChoiceFromDef def={CHOICES.testStilstaan} value={resolveTestStops(settings.testStops)} onPick={(v) => void updateSettings({ testStops: v })} onClose={closeInner} />
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
