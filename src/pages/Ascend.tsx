import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import type { GoalDetails, GoalPriority, TrainingGoal } from '../models/goals';
import { Icon } from '../components/icons';
import { Card, Chip, Eyebrow, PrimaryButton, SecondaryButton } from '../components/ui';
import { SkyBand } from '../components/SkyBand';
import { TextButton } from '../components/TextButton';
import { ImpactSheet } from '../components/ImpactSheet';
import { TrekGoalsCard } from '../components/TrekGoals';
import { StrengthProgramCard } from '../components/StrengthProgramCard';
import { Sheet } from '../components/settings/Sheet';
import { usePageState } from '../components/usePageState';
import { useHorizonChange } from '../components/useHorizonChange';
import { SeasonStripCard } from '../components/ascend/SeasonStrip';
import { GoalList } from '../components/ascend/GoalList';
import { GoalLabelSheet } from '../components/ascend/GoalLabelSheet';
import { GoalSheet } from '../components/ascend/GoalSheet';
import { GoalFormSheet } from '../components/ascend/GoalFormSheet';
import { GoalMenuSheet } from '../components/ascend/GoalMenuSheet';
import { EarlierGoalsSheet } from '../components/ascend/EarlierGoalsSheet';
import { useGoalViews } from '../components/ascend/useGoalViews';
import { goalsSentence, listedGoals, moveGoal, orderPatch, seasonStrip, type MoveResult } from '../engine/goalList';
import { conflictsForGoals } from '../engine/goalConflicts';
import { needsFirstPlan } from '../engine/freshStart';
import type { AddTileId } from '../engine/goalDraft';
import { RACE_KM } from '../engine/goalDraft';
import { isMarathonGoal } from '../engine/mainGoal';
import { todayISO } from '../utils/dates';

// Ascend is de plek van je doelen (docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md): op de
// lucht je seizoen met een vlag per doel, daaronder de doelen in de volgorde die jij kiest, het
// eerste open en de andere als compacte rij. Alles wat je planning inhoudelijk verandert (een label,
// een nieuw doel, een volgorde die een botsing verschuift) gaat via een voorstel met Akkoord.
// Op deze tab staat geen gevulde mint knop: die is van het voorstel.

const KEEP = 'Je doel en je planning blijven zoals ze waren.';
// Een blad sluit eerst (200 ms) voordat het voorstel opent, zodat de terugknop twee lagen niet door
// elkaar haalt.
const AFTER_SHEET_MS = 280;
const later = (fn: () => void) => { window.setTimeout(fn, AFTER_SHEET_MS); };

const START_CHIPS: { label: string; tile: AddTileId; details?: GoalDetails }[] = [
  { label: 'Trektocht', tile: 'trek' },
  { label: 'Bergtocht', tile: 'day_hike' },
  { label: '10 km', tile: 'run_race', details: { variant: '10k' } },
  { label: 'Sterker worden', tile: 'stronger' },
  { label: 'Fit blijven', tile: 'fit' },
];

export function AscentTabPlusButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Doel toevoegen" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-on-light)' }}>
      <Icon name="plus" size={24} />
    </button>
  );
}

export function AscendPage() {
  const { trainingGoals, goalMilestones, unarchiveGoal, planGoalChange, planGoalPriority, planHorizonChange, setGoalOrder, program, plannedSessions } = useAppData();
  const navigate = useNavigate();
  const horizon = useHorizonChange();
  const today = todayISO();
  const ladder = useMemo(() => new Set(goalMilestones.map((m) => m.goalId)), [goalMilestones]);
  const listed = useMemo(() => listedGoals(trainingGoals, ladder, today), [trainingGoals, ladder, today]);
  const earlier = useMemo(() => listedGoals(trainingGoals, ladder, today, { earlier: true }).map((l) => l.goal), [trainingGoals, ladder, today]);
  const { views, next } = useGoalViews(listed);
  const strip = useMemo(() => seasonStrip(listed, today), [listed, today]);

  // Welke doelen openstaan: zonder keuze alleen het eerste. Het overleeft een bezoek aan een andere pagina.
  const [openIds, setOpenIds] = usePageState<string[] | null>('ascendOpen', null, (v) => v === null || Array.isArray(v));
  const isOpen = (id: string, index: number) => (openIds === null ? index === 0 : openIds.includes(id));
  const toggle = (id: string) => {
    const current = openIds ?? listed.slice(0, 1).map((l) => l.goal.id);
    setOpenIds(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const [detailId, setDetailId] = useState<string | null>(null);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [extra, setExtra] = useState<'treks' | 'strength' | null>(null);
  const [adding, setAdding] = useState<{ tile?: AddTileId; details?: GoalDetails } | null>(null);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingGoal | null>(null);
  const [archiving, setArchiving] = useState<TrainingGoal | null>(null);
  const [orderNote, setOrderNote] = useState<{ before: { id: string; order: number | undefined }[] } | null>(null);

  const detail = views.find((v) => v.item.goal.id === detailId);
  const labelView = views.find((v) => v.item.goal.id === labelId);
  const menuView = views.find((v) => v.item.goal.id === menuId);
  const emptyInstall = needsFirstPlan({ programs: program ? 1 : 0, plannedSessions: plannedSessions.length });

  const startAdd = (tile?: AddTileId, details?: GoalDetails) => {
    // Een nieuwe installatie plant niets zonder dat je eerst zegt wat je wilt: de vragen staan op Vandaag.
    if (emptyInstall && listed.length === 0) { navigate('/'); return; }
    setAdding({ tile, details });
  };

  const proposeLabel = (goalId: string, priority: GoalPriority, orderIds?: string[]) =>
    horizon.propose(() => planGoalPriority(goalId, priority, orderIds), { eyebrow: 'Label van je doel', ask: 'always', declined: KEEP });

  // Het resultaat van slepen of Hoger en Lager. Een ander label, of een volgorde die een botsing
  // tussen doelen verschuift, is een voorstel; anders wordt alleen de volgorde bewaard.
  const handleMove = (id: string, result: MoveResult) => {
    if (result.changesLabel) { void proposeLabel(id, result.priority, result.ids); return; }
    const patch = orderPatch(listed.map((l) => l), result.ids);
    if (patch.length === 0) return;
    const byId = new Map(patch.map((p) => [p.id, p.order]));
    const after = trainingGoals.map((g) => (byId.has(g.id) ? { ...g, order: byId.get(g.id) } : g));
    const key = (goals: TrainingGoal[]) => conflictsForGoals(goals, ladder, today).map((c) => `${c.rule}:${c.goalId}:${c.otherGoalId}`).sort().join('|');
    if (key(after) !== key(trainingGoals)) {
      const now = new Date().toISOString();
      void horizon.propose(
        () => planHorizonChange({
          title: 'Volgorde van je doelen',
          why: 'Je koos een andere volgorde.',
          explanation: 'Bij twee doelen met hetzelfde label wijkt het doel dat lager in de lijst staat. Een andere volgorde verandert dus wat er bij een botsing gebeurt. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord.',
          trigger: 'goal_changed',
          goals: after.filter((g) => byId.has(g.id)).map((g) => ({ ...g, updatedAt: now })),
        }),
        { eyebrow: 'Volgorde van je doelen', ask: 'always', declined: KEEP },
      );
      return;
    }
    void setGoalOrder(patch).then((before) => setOrderNote({ before }));
  };

  const archive = (g: TrainingGoal) => {
    setArchiving(null);
    void horizon.propose(() => planGoalChange(g.id, { archive: true }), { eyebrow: 'Doel archiveren', ask: 'always', declined: KEEP });
  };

  const emptyList = listed.length === 0;
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10">
      <SkyBand actions={emptyList ? undefined : <AscentTabPlusButton onClick={() => startAdd()} />}>
        <div className="min-w-0">
          <Eyebrow>Ascend</Eyebrow>
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Je doelen</h1>
          {!emptyList && <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{goalsSentence(listed, today)}</p>}
        </div>
        {strip && !emptyList && <SeasonStripCard strip={strip} />}
        {emptyList && (
          <Card className="flex flex-col gap-3">
            <p className="text-base" style={{ color: 'var(--color-ink)' }}>Nog geen doel. Wat wil je bereiken?</p>
            <PrimaryButton onClick={() => startAdd()}>Doel toevoegen</PrimaryButton>
          </Card>
        )}
      </SkyBand>

      {emptyList && (
        <section className="flex flex-col gap-3" aria-label="Of begin met">
          <p className="text-base" style={{ color: 'var(--color-ink-dim)' }}>Of begin met</p>
          <div className="st-chips">
            {START_CHIPS.map((c) => <Chip key={c.label} onClick={() => startAdd(c.tile, c.details)}>{c.label}</Chip>)}
          </div>
        </section>
      )}

      {!emptyList && (
        <GoalList
          views={views}
          isOpen={isOpen}
          next={next}
          onToggle={toggle}
          onDetails={setDetailId}
          onLabel={setLabelId}
          onMove={handleMove}
        />
      )}

      {horizon.note && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>}
      {orderNote && (
        <p className="flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--color-ink)' }} role="status">
          Volgorde opgeslagen.
          <TextButton onClick={() => { void setGoalOrder(orderNote.before); setOrderNote(null); }}>Ongedaan maken</TextButton>
        </p>
      )}

      {!emptyList && <SecondaryButton onClick={() => startAdd()}>Doel toevoegen</SecondaryButton>}

      <div className="flex flex-col overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
        {([['treks', 'Tochten', 'Een tocht naast je doelen, met vrije dagen eromheen'], ['strength', 'Krachtblok', 'Hoe je krachttraining in je plan zit']] as const).map(([id, title, line]) => (
          <button key={id} type="button" onClick={() => setExtra(id)} className="flex min-h-[56px] items-center justify-between gap-3 border-b px-4 py-2 text-left last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span className="min-w-0">
              <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{title}</span>
              <span className="block text-sm" style={{ color: 'var(--color-ink-dim)' }}>{line}</span>
            </span>
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
        ))}
      </div>

      {(earlier.length > 0 || !emptyList) && <button type="button" onClick={() => setEarlierOpen(true)} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 text-left" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
        <span className="text-base" style={{ color: 'var(--color-ink)' }}>
          Eerder, afgerond of weggelegd
          {earlier.length > 0 && <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}> · {earlier.length} {earlier.length === 1 ? 'doel' : 'doelen'}</span>}
        </span>
        <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
      </button>}

      {detail && (
        <GoalSheet
          view={detail}
          index={views.indexOf(detail)}
          next={next}
          onLabel={() => setLabelId(detail.item.goal.id)}
          onMenu={() => setMenuId(detail.item.goal.id)}
          onClose={() => setDetailId(null)}
        />
      )}

      {menuView && (
        <GoalMenuSheet
          name={menuView.item.goal.name}
          index={views.indexOf(menuView)}
          count={views.length}
          onEdit={() => setEditing(menuView.item.goal)}
          onLabel={() => setLabelId(menuView.item.goal.id)}
          onStep={(dir) => handleMove(menuView.item.goal.id, moveGoal(listed, menuView.item.goal.id, dir))}
          onArchive={() => setArchiving(menuView.item.goal)}
          onClose={() => setMenuId(null)}
        />
      )}

      {labelView && (
        <GoalLabelSheet
          goal={labelView.item.goal}
          priority={labelView.item.priority}
          isMain={labelView.item.isMain}
          onChoose={(priority, close) => { close(); later(() => void proposeLabel(labelView.item.goal.id, priority)); }}
          onClose={() => setLabelId(null)}
        />
      )}

      {adding && (
        <GoalFormSheet
          existing={trainingGoals}
          mainGoalId={listed.find((l) => l.isMain)?.goal.id}
          initialTile={adding.tile}
          initialDetails={adding.details}
          onSubmit={(draft, close) => {
            close();
            later(() => void horizon.propose(
              () => planHorizonChange({
                title: `${draft.name || 'Je doel'}: zo verandert je planning`,
                why: 'Volgt je nieuwe doel.',
                explanation: 'Een doel bepaalt de fasen van je planning en de dag waarop hij eindigt. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord. Wat je al deed en wat je zelf vastzette blijft staan.',
                trigger: 'goal_created',
                goals: [draft],
              }),
              { eyebrow: 'Doel toevoegen · stap 3 van 3', ask: 'always', alwaysAsk: true, declined: 'Er is niets toegevoegd. Je planning blijft zoals ze was.' },
            ));
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {earlierOpen && (
        <EarlierGoalsSheet
          goals={earlier}
          onUnarchive={(id) => void unarchiveGoal(id)}
          onArchive={(g) => { setEarlierOpen(false); later(() => setArchiving(g)); }}
          onClose={() => setEarlierOpen(false)}
        />
      )}

      {editing && (
        <GoalFormSheet
          existing={trainingGoals}
          goal={editing}
          initialTile={listed.find((l) => l.goal.id === editing.id)?.isMain ? 'trek' : undefined}
          onSubmit={(next, close) => {
            const was = editing;
            close();
            // Het oude marathondoel leest zijn soort, datum en tijd ook uit de instellingen.
            const km = next.details?.distanceKm;
            const settings = isMarathonGoal(was)
              ? { marathonRaceType: km !== undefined && Math.abs(km - RACE_KM.marathon) < 0.5 ? ('full' as const) : km !== undefined && Math.abs(km - RACE_KM.half) < 0.5 ? ('half' as const) : undefined, marathonTargetDate: next.targetDate, marathonTargetTimeMinutes: next.details?.targetMinutes }
              : undefined;
            later(() => void horizon.propose(
              () => planHorizonChange({
                title: `${next.name || 'Je doel'} aangepast`,
                why: 'Volgt wat je aanpaste.',
                explanation: 'Een doel bepaalt de fasen van je planning en de dag waarop hij eindigt. Een andere datum, soort of tent in plaats van hutten verandert je planning nooit ongemerkt: ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord. Wat je al deed en wat je zelf vastzette blijft staan.',
                trigger: 'goal_changed',
                goals: [next],
                ...(settings ? { settings } : {}),
              }),
              { eyebrow: 'Doel aanpassen', ask: 'always', alwaysAsk: true, declined: KEEP },
            ));
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {extra && (
        <Sheet eyebrow="Ascend" title={extra === 'treks' ? 'Tochten' : 'Krachtblok'} line={extra === 'treks' ? 'Een tocht naast je doelen, met vrije dagen eromheen.' : 'Hoe je krachttraining in je plan zit.'} onClose={() => setExtra(null)}>
          {extra === 'treks' ? <TrekGoalsCard /> : <StrengthProgramCard />}
        </Sheet>
      )}

      {archiving && (
        <ImpactSheet
          eyebrow="DOEL ARCHIVEREN"
          title={`${archiving.name} archiveren?`}
          lines={[]}
          why="Een gearchiveerd doel telt niet meer mee voor je planning. Heeft dat gevolgen voor je trainingen, dan zie je eerst wat er verandert en beslis je daarna. Je kunt het doel later terughalen."
          primaryLabel="Archiveren"
          secondaryLabel="Annuleren"
          onPrimary={() => archive(archiving)}
          onSecondary={() => setArchiving(null)}
          onClose={() => setArchiving(null)}
          busy={horizon.busy}
        />
      )}
      {horizon.sheet}
    </div>
  );
}
