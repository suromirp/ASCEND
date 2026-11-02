// Het scherm Sporten (docs/visie/Sporten die meetellen.md, 2.1 en 2.2): per sport een kaart met de rol, één
// regel met wat die rol nu betekent en een weekstrook. Een tik op een kaart opent een blad met de keuzes.
// Wat de planning verandert gaat via het voorstel met Akkoord (usePlanSettingChange); wat niets verandert
// wordt meteen bewaard. De inhoud komt uit engine/sportsScreen.ts.

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../../state/AppDataContext';
import { SkyBand } from '../../components/SkyBand';
import { Icon } from '../../components/icons';
import { Pictogram } from '../../components/pictograms';
import { Card, Eyebrow, Segmented } from '../../components/ui';
import { ChoiceList, Sheet } from '../../components/settings/Sheet';
import { SettingsList } from '../../components/settings/SettingsList';
import { SummaryRow } from '../../components/settings/groups/SummaryRow';
import { useSettingsFacts } from '../../components/settings/useSettingsFacts';
import { usePlanSettingChange } from '../../components/settings/usePlanSettingChange';
import { ROLE_LABEL, ROLE_NOTE, dayName, roleChoices, sportCards, sportWeekDots, weekDotsLabel, type SportCardInfo, type WeekDot } from '../../engine/sportsScreen';
import { parseSportHandling, type FixedSlot } from '../../engine/sportRole';
import { FixedDaysStep } from '../../components/sports/FixedDaysStep';
import { anySportDefinition, SPORT_IDS, type AnySportId, type SportId, type SportRole } from '../../data/sports';
import { addDays, mondayOfWeek, todayISO } from '../../utils/dates';
import { SportCountingSheet } from '../../components/settings/groups/SportCountingSheet';
import { settingsPageRoute } from '../../data/settingsLayout';
import '../../components/settings/settings.css';

const DAY_LETTER = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'];

function DotStrip({ dots }: { dots: WeekDot[] }) {
  return (
    <div className="mt-3 flex justify-between" role="img" aria-label={weekDotsLabel(dots)}>
      {dots.map((d, i) => (
        <div key={i} className="flex w-6 flex-col items-center gap-1" aria-hidden>
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{DAY_LETTER[i]}</span>
          <span
            className="block rounded-full"
            style={{
              width: 12,
              height: 12,
              background: d === 'fixed' ? 'var(--color-action)' : d === 'none' ? 'var(--color-track)' : 'transparent',
              border: d === 'planned' ? '2px solid var(--color-action)' : d === 'rest' ? '2px solid var(--color-control-border)' : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SportCard({ info, dots, onOpen }: { info: SportCardInfo; dots: WeekDot[]; onOpen: () => void }) {
  const def = anySportDefinition(info.sport);
  return (
    <Card className="p-0">
      <button type="button" onClick={onOpen} data-sheet-from className="block min-h-[44px] w-full p-4 text-left active:opacity-80">
        <div className="flex items-center gap-3">
          {def.pictogram && <span style={{ color: def.colorToken }}><Pictogram name={def.pictogram} size={32} /></span>}
          <span className="font-display min-w-0 flex-1 text-xl" style={{ color: 'var(--color-ink)' }}>{info.label}</span>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              color: info.role && info.role !== 'off' ? 'var(--color-action)' : 'var(--color-ink-dim)',
              border: `1px solid ${info.role && info.role !== 'off' ? 'var(--color-action)' : 'var(--color-control-border)'}`,
            }}
          >
            {info.pill}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{info.line}</p>
        <DotStrip dots={dots} />
      </button>
    </Card>
  );
}

export function SportsPage() {
  const navigate = useNavigate();
  const { settings, plannedSessions, templates } = useAppData();
  const { facts } = useSettingsFacts();
  const plan = usePlanSettingChange();
  const location = useLocation();
  // Vanuit de vraag op Vandaag: meteen het blad van die sport.
  const asked = location.state as { openSport?: AnySportId; fixed?: boolean } | null;
  const [open, setOpen] = useState<AnySportId | null>(() => asked?.openSport ?? null);
  const [counting, setCounting] = useState(false);
  const weekStart = mondayOfWeek(todayISO());
  const cards = useMemo(() => sportCards(settings), [settings]);
  const weekSessions = useMemo(() => plannedSessions.filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= addDays(weekStart, 6)), [plannedSessions, weekStart]);

  return (
    <div className="st-page animate-page-in">
      <SkyBand variant="low" gear={false}>
        <button type="button" className="st-back" onClick={() => navigate(settingsPageRoute('planning'))}>
          <Icon name="terug" size={20} />
          Planning
        </button>
        <h1 className="st-title">Sporten</h1>
      </SkyBand>
      <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }}>Kies per sport hoe ASCEND ermee omgaat. Sporten die je doet tellen mee voor je benen en je week.</p>
      {plan.note && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{plan.note}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {cards.map((c) => (
          <SportCard key={c.sport} info={c} dots={sportWeekDots({ sport: c.sport, settings, weekStart, sessions: weekSessions, templates })} onOpen={() => setOpen(c.sport)} />
        ))}
      </div>
      <div className="mt-6">
        <Eyebrow>Hoe het meetelt</Eyebrow>
        <div className="mt-2">
          <SettingsList>
            <SummaryRow id="bundel-sporten-tellen" title="Hoe sporten meetellen" facts={facts} info="sportenTellen" onClick={() => setCounting(true)} />
          </SettingsList>
        </div>
      </div>
      {counting && <SportCountingSheet facts={facts} plan={plan} onClose={() => setCounting(false)} />}
      {open && <SportRoleSheet sport={open} plan={plan} startFixed={!!asked?.fixed && asked.openSport === open} onClose={() => setOpen(null)} />}
      {plan.impact}
    </div>
  );
}

function SportRoleSheet({ sport, plan, startFixed = false, onClose }: { sport: AnySportId; plan: ReturnType<typeof usePlanSettingChange>; startFixed?: boolean; onClose: () => void }) {
  const { settings } = useAppData();
  const def = anySportDefinition(sport);
  const card = sportCards(settings).find((c) => c.sport === sport)!;
  const choices = roleChoices(sport);
  // Vaste dag opent de tweede stap in hetzelfde blad; bewaard wordt pas met Akkoord op het voorstel.
  const [fixedStep, setFixedStep] = useState(card.role === 'fixed' || startFixed);
  const current = parseSportHandling(settings.sportHandling).value ?? {};
  const planned = SPORT_IDS.find((s): s is SportId => s === sport);
  const perWeek = planned ? settings.sportFrequency?.[planned] : undefined;

  function pick(role: SportRole, close: () => void) {
    if (role === 'fixed') { setFixedStep(true); return; }
    setFixedStep(false);
    if (role === card.role) return;
    const handling = { ...current, [sport]: { role } };
    close();
    if (planned) {
      // Een sport die ASCEND plant: Plan dit voor mij is hem aanzetten. Hetzelfde voorstel als altijd, met de
      // rol erbij in hetzelfde Akkoord.
      void plan.toggleSport(planned, role === 'plan', { sportHandling: handling });
      return;
    }
    void plan.changeSetting(`${def.label}: ${ROLE_LABEL[role].toLowerCase()}`, { sportHandling: handling }, role === 'off' ? `${def.label} telt niet meer mee.` : `${def.label} telt mee als je het doet.`);
  }

  function saveFixed(slots: FixedSlot[], close: () => void) {
    close();
    const handling = { ...current, [sport]: { role: 'fixed' as const, fixed: slots } };
    const days = slots.map((s) => dayName(s.day)).join(' en ');
    void plan.changeSetting(`${def.label} vast op ${days}`, { sportHandling: handling }, `${def.label} staat vast op ${days}. ASCEND plant de rest eromheen.`, { alwaysAsk: true });
  }

  return (
    <Sheet eyebrow="Sporten" title={def.label} line="Wat past bij jou?" onClose={onClose}>
      {(close) => (
        <>
          <ChoiceList<SportRole>
            label={`Hoe ASCEND met ${def.label.toLowerCase()} omgaat`}
            options={choices.map((r) => ({ value: r, label: ROLE_LABEL[r], note: ROLE_NOTE[r] }))}
            value={fixedStep ? 'fixed' : card.role ?? ('' as SportRole)}
            onPick={(r) => pick(r, close)}
          />
          {!def.plannable && !fixedStep && <p className="st-hint" style={{ marginLeft: 0 }}>ASCEND kan dit nog niet voor je plannen. Een vaste dag of meetellen kan wel.</p>}
          {fixedStep && (
            <div style={{ marginTop: 20 }}>
              <FixedDaysStep initial={current[sport]?.fixed ?? []} busy={plan.busy} onSubmit={(slots) => saveFixed(slots, close)} />
            </div>
          )}
          {planned && card.role === 'plan' && (
            <>
              <p className="st-lab" style={{ marginTop: 24 }}>Per week</p>
              <Segmented<number>
                tall
                label={`${def.label} per week`}
                value={perWeek ?? 0}
                options={[{ value: 0, label: 'Auto' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}×` }))]}
                onChange={(n) => void plan.setFrequency(planned, n === 0 ? undefined : n)}
              />
              <p className="st-hint" style={{ marginLeft: 0 }}>{perWeek ? `ASCEND houdt ${perWeek}× aan en kiest zelf de dagen.` : 'Je weekschema bepaalt hoe vaak.'}</p>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
