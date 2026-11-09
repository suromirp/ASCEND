import { useEffect, useMemo, useState } from 'react';
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
import { APPLIED_NOTE, useHorizonChange } from '../components/useHorizonChange';
import { SeasonStripCard } from '../components/ascend/SeasonStrip';
import { GoalList } from '../components/ascend/GoalList';
import { GoalLabelSheet } from '../components/ascend/GoalLabelSheet';
import { GoalSheet } from '../components/ascend/GoalSheet';
import { GoalFormSheet } from '../components/ascend/GoalFormSheet';
import { YourDirectionCard, YourWeekCard, YourWeekSheet, DirectionSheet } from '../components/ascend/YourWeek';
import { useDirectionChange } from '../components/ascend/useDirectionChange';
import { GoalMenuSheet } from '../components/ascend/GoalMenuSheet';
import { EarlierGoalsSheet } from '../components/ascend/EarlierGoalsSheet';
import { useGoalViews } from '../components/ascend/useGoalViews';
import { goalsSentence, listedGoals, marathonSettingsFor, moveGoal, moveOutcome, seasonStrip, stepAvailability, type MoveResult } from '../engine/goalList';
import { needsFirstPlan } from '../engine/freshStart';
import { countOptions, plannedRestFor, yourWeek } from '../engine/yourWeek';
import { waveReviewCard } from '../engine/waveReviewCard';
import { WaveReviewCard } from '../components/ascend/WaveReview';
import type { AddTileId } from '../engine/goalDraft';
import { SkillGoalCard } from '../components/ascend/SkillGoalCard';
import { SkillGoalSheet } from '../components/ascend/SkillGoalSheet';
import { CalisthenicsChoiceSheet } from '../components/ascend/CalisthenicsChoiceSheet';
import { GeneralStrengthCard } from '../components/ascend/GeneralStrengthCard';
import { useSkillGoals } from '../components/ascend/useSkillGoals';
import { buildGeneralGoal, liveGeneralGoal, liveSkillGoals, planStartSteps, takenSkillSteps } from '../engine/skillGoal';
import { TimeoutError } from '../utils/withTimeout';
import { skillLadderById } from '../data/skillLadders';
import { generalReadinessFor, skillReadinessFor } from '../engine/goalReadinessFor';
import type { SkillGoal } from '../models/skillGoals';
import { makeId } from '../utils/id';
import { todayISO } from '../utils/dates';

// Ascend is de plek van je doelen (docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md): op de
// lucht je seizoen met een vlag per doel, daaronder de doelen in de volgorde die jij kiest, het
// eerste open en de andere als compacte rij. Alles wat je planning inhoudelijk verandert (een label,
// een nieuw doel, een volgorde die een botsing verschuift) gaat via een voorstel met Akkoord.
// De enige gevulde mint knop is die van de lege staat ("Nieuw beginnen"); met doelen op de tab is het
// de gevulde knop van het voorstel, en de tab zelf heeft er dan geen.

const KEEP = 'Alles blijft zoals het was.';
// Een blad sluit eerst (200 ms) voordat het voorstel opent, zodat de terugknop twee lagen niet door
// elkaar haalt.
const AFTER_SHEET_MS = 280;
const later = (fn: () => void) => { window.setTimeout(fn, AFTER_SHEET_MS); };
// Een regel onderaan de tab blijft een paar seconden staan, net als de meldingsbalk, en gaat weg bij de
// volgende handeling.
const NOTE_MS = 8000;
const RESTORED_NOTE = 'Teruggehaald, zonder datum. Geef het een datum om ernaartoe te trainen.';
const MAIN_STAYS_NOTE = 'Dat kon niet: je hoofddoel blijft bij de Top-doelen.';

const skillLadderName = (id: string) => skillLadderById(id)?.name ?? id;

const START_CHIPS: { label: string; tile: AddTileId; details?: GoalDetails }[] = [
  { label: 'Trektocht', tile: 'trek' },
  { label: 'Bergtocht', tile: 'day_hike' },
  { label: '10 km', tile: 'run_race', details: { variant: '10k' } },
  { label: 'Sterker worden', tile: 'stronger' },
  { label: 'Fit blijven', tile: 'fit' },
];

function AscentTabPlusButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Doel toevoegen" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-on-light)' }}>
      <Icon name="plus" size={24} />
    </button>
  );
}

export function AscendPage() {
  const { trainingGoals, goalMilestones, unarchiveGoal, planGoalChange, planGoalPriority, planHorizonChange, setGoalOrder, program, plannedSessions, settings, sessionLogs, templates } = useAppData();
  const navigate = useNavigate();
  const horizon = useHorizonChange();
  const direction = useDirectionChange();
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
    clearNotes();
    const current = openIds ?? listed.slice(0, 1).map((l) => l.goal.id);
    setOpenIds(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const [detailId, setDetailId] = useState<string | null>(null);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [extra, setExtra] = useState<'treks' | 'strength' | null>(null);
  const [adding, setAdding] = useState<{ tile?: AddTileId; details?: GoalDetails } | null>(null);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [weekSheet, setWeekSheet] = useState<'week' | 'direction' | null>(null);
  const [editing, setEditing] = useState<TrainingGoal | null>(null);
  const [archiving, setArchiving] = useState<TrainingGoal | null>(null);
  const [orderNote, setOrderNote] = useState<{ before: { id: string; order: number | undefined }[] } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // Vaardigheden (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md): geen TrainingGoal, plannen niets.
  const skillsOn = settings.showSkillGoals !== false;
  const skills = useSkillGoals(sessionLogs, today, skillsOn);
  const skillViews = useMemo(
    () => (skillsOn ? liveSkillGoals(skills.store).flatMap((g) => { const r = skillReadinessFor(g, sessionLogs, today, skills.store.progress); return r ? [{ goal: g, readiness: r }] : []; }) : []),
    [skillsOn, skills.store, sessionLogs, today],
  );
  // Algemeen sterk met eigen gewicht (docs/beslissingen/2026-11-09-calisthenics-algemeen.md): één doel, vijf ladders.
  const generalGoal = skillsOn ? liveGeneralGoal(skills.store) : undefined;
  const ladderStarts = useMemo(() => planStartSteps(templates, settings.strengthModel, today), [templates, settings.strengthModel, today]);
  const generalView = useMemo(
    () => (generalGoal ? generalReadinessFor(generalGoal, sessionLogs, today, ladderStarts) : undefined),
    [generalGoal, sessionLogs, today, ladderStarts],
  );
  const [calisthenicsChoosing, setCalisthenicsChoosing] = useState(false);
  const [generalProposal, setGeneralProposal] = useState<SkillGoal | null>(null);
  const [skillChoosing, setSkillChoosing] = useState(false);
  const [skillProposal, setSkillProposal] = useState<SkillGoal | null>(null);
  const [skillRemoving, setSkillRemoving] = useState<SkillGoal | null>(null);
  const [skillBusy, setSkillBusy] = useState(false);
  const skillWrite = (write: () => Promise<void>, done: string, close: () => void) => {
    setSkillBusy(true);
    write()
      .then(() => setFlash(done))
      // Bij een time-out kan de put nog doorlopen; de hook leest de opslag daarna opnieuw.
      .catch((err) => setFlash(err instanceof TimeoutError ? 'Dat lukte niet op tijd.' : 'Dat lukte niet. Er is niets veranderd.'))
      .finally(() => { setSkillBusy(false); close(); });
  };
  // Alleen de balk of de regel: na een voorstel dat is doorgevoerd laat de balk onderin zien wat er
  // veranderde, dus dan blijft de regel erboven weg.
  const horizonNote = [horizon.note, direction.note].find((n) => n && n !== APPLIED_NOTE) ?? null;
  const clearNotes = () => { horizon.clearNote(); direction.clearNote(); setOrderNote(null); setFlash(null); };
  const shownNote = horizonNote ?? flash ?? (orderNote ? 'Volgorde opgeslagen.' : null);
  useEffect(() => {
    if (!shownNote) return;
    const t = window.setTimeout(clearNotes, NOTE_MS);
    return () => window.clearTimeout(t);
    // clearNotes verandert elke render; alleen een nieuwe regel zet de tijd opnieuw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownNote]);

  const detail = views.find((v) => v.item.goal.id === detailId);
  const labelView = views.find((v) => v.item.goal.id === labelId);
  const menuView = views.find((v) => v.item.goal.id === menuId);
  const emptyInstall = needsFirstPlan({ programs: program ? 1 : 0, plannedSessions: plannedSessions.length });

  const startAdd = (tile?: AddTileId, details?: GoalDetails) => {
    clearNotes();
    // Een nieuwe installatie plant niets zonder dat je eerst zegt wat je wilt: de vragen staan op Vandaag.
    if (emptyInstall && listed.length === 0) { navigate('/'); return; }
    setAdding({ tile, details });
  };

  // Een ander label is altijd een voorstel met Akkoord, ook als je planning niet verandert (CLAUDE.md).
  const proposeLabel = (goalId: string, priority: GoalPriority, orderIds?: string[]) =>
    horizon.propose(() => planGoalPriority(goalId, priority, orderIds), { eyebrow: 'Label van je doel', ask: 'always', alwaysAsk: true, declined: KEEP });

  // Het resultaat van slepen of Hoger en Lager. Een ander label, of een volgorde die een botsing
  // tussen doelen verschuift, is een voorstel; anders wordt alleen de volgorde bewaard.
  const handleMove = (id: string, result: MoveResult) => {
    clearNotes();
    const outcome = moveOutcome(trainingGoals, listed, result, ladder, today);
    if (outcome.kind === 'label') { void proposeLabel(id, result.priority, result.ids); return; }
    if (outcome.kind === 'nothing') return;
    if (outcome.kind === 'proposal') {
      const now = new Date().toISOString();
      void horizon.propose(
        () => planHorizonChange({
          title: 'Volgorde van je doelen',
          why: 'Je koos een andere volgorde.',
          explanation: 'Hebben twee doelen hetzelfde label, dan wijkt het doel dat lager staat. Een andere volgorde verandert dus wat er bij een botsing gebeurt. Eerst een voorstel, pas na Akkoord verandert er iets.',
          trigger: 'goal_changed',
          goals: outcome.goals.map((g) => ({ ...g, updatedAt: now })),
        }),
        { eyebrow: 'Volgorde van je doelen', ask: 'always', declined: KEEP },
      );
      return;
    }
    void setGoalOrder(outcome.patch).then((before) => setOrderNote({ before }));
  };

  const archive = (g: TrainingGoal) => {
    clearNotes();
    setArchiving(null);
    void horizon.propose(() => planGoalChange(g.id, { archive: true }), { eyebrow: 'Doel archiveren', ask: 'always', declined: KEEP });
  };

  const emptyList = listed.length === 0;
  // Zonder doel maar met een plan: Je week en je richting in plaats van de lege kaart. Een nieuwe
  // installatie zonder plan houdt de lege kaart. Met een doel verandert er niets.
  const week = useMemo(
    () => (emptyList && !emptyInstall
      ? yourWeek({
          settings, goals: listed.map((l) => l.goal), milestones: ladder, logs: sessionLogs, templates, plannedSessions, today,
          plannedRest: plannedRestFor({ plannedSessions, templates, logs: sessionLogs, program, settings, today }),
        })
      : undefined),
    [emptyList, emptyInstall, settings, listed, ladder, sessionLogs, templates, plannedSessions, today, program],
  );
  const plain = emptyList && !week;
  // De terugblik na een golf, alleen zonder doel en de eerste tien dagen van een nieuwe golf.
  const review = useMemo(
    () => (week ? waveReviewCard({ settings, logs: sessionLogs, today, noGoal: true, countOptions: countOptions(settings, templates, plannedSessions) }) : undefined),
    [week, settings, sessionLogs, today, templates, plannedSessions],
  );
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10">
      <SkyBand actions={plain ? undefined : <AscentTabPlusButton onClick={() => startAdd()} />}>
        <div className="min-w-0">
          <Eyebrow>Ascend</Eyebrow>
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Waar je naartoe werkt</h1>
          {!emptyList && <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{goalsSentence(listed, today)}</p>}
          {week && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.chosen ? `Geen doel, wel een richting: ${week.label.toLowerCase()}.` : 'Nog geen doel en nog geen richting.'}</p>}
        </div>
        {strip && !emptyList && settings.showSeasonStrip !== false && <SeasonStripCard strip={strip} />}
        {week && <YourWeekCard week={week} onOpen={() => setWeekSheet('week')} />}
        {plain && (
          <Card className="flex flex-col gap-3">
            {/* Alleen een lege installatie: de vragen staan op Vandaag, met een richting of een doel. */}
            <p className="text-base" style={{ color: 'var(--color-ink)' }}>Nog niets gepland. Kies een richting of een doel, dan zie je je eerste week.</p>
            <PrimaryButton onClick={() => startAdd()}>Nieuw beginnen</PrimaryButton>
          </Card>
        )}
      </SkyBand>

      {review && (
        <WaveReviewCard
          review={review}
          busy={direction.busy}
          onChoose={(choice) => {
            clearNotes();
            void direction.reviewChoice(review, choice).then(() => { if (choice === 'goal') startAdd(); });
          }}
        />
      )}

      {week && <YourDirectionCard week={week} onChoose={() => setWeekSheet('direction')} />}

      {plain && (
        <section className="flex flex-col gap-3" aria-label="Of pak er eentje">
          <p className="text-base" style={{ color: 'var(--color-ink-dim)' }}>Of pak er eentje</p>
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
          onDetails={(id) => { clearNotes(); setDetailId(id); }}
          onLabel={(id) => { clearNotes(); setLabelId(id); }}
          onMove={handleMove}
          onBlocked={() => setFlash(MAIN_STAYS_NOTE)}
        />
      )}

      {generalGoal && generalView && (
        <GeneralStrengthCard name={generalGoal.name} readiness={generalView} onRemove={() => { clearNotes(); setSkillRemoving(generalGoal); }} />
      )}

      {skillViews.map(({ goal, readiness }) => (
        <SkillGoalCard key={goal.id} name={goal.name || readiness.targetName} readiness={readiness} onRemove={() => { clearNotes(); setSkillRemoving(goal); }} />
      ))}

      {shownNote && (
        <p className="flex items-center justify-between gap-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">
          {shownNote}
          {!horizonNote && !flash && orderNote && <TextButton onClick={() => { void setGoalOrder(orderNote.before); setOrderNote(null); }}>Ongedaan maken</TextButton>}
        </p>
      )}

      {(!emptyList || week) && <SecondaryButton onClick={() => startAdd()}>Doel toevoegen</SecondaryButton>}

      <Card className="flex flex-col p-0! overflow-hidden">
        {([['treks', 'Tochten', 'Een tocht erbij? Er komen vrije dagen omheen.'], ['strength', 'Krachtblok', 'Hoe kracht in je week past']] as const).map(([id, title, line]) => (
          <button key={id} type="button" onClick={() => setExtra(id)} className="flex min-h-[56px] items-center justify-between gap-3 border-b px-4 py-2 text-left last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span className="min-w-0">
              <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{title}</span>
              <span className="block text-sm" style={{ color: 'var(--color-ink-dim)' }}>{line}</span>
            </span>
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
        ))}
      </Card>

      {(earlier.length > 0 || !plain) && (
        <Card className="p-0! overflow-hidden">
          <button type="button" onClick={() => setEarlierOpen(true)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left">
            <span className="text-base" style={{ color: 'var(--color-ink)' }}>
              Eerdere doelen
              {earlier.length > 0 && <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}> · {earlier.length} {earlier.length === 1 ? 'doel' : 'doelen'}</span>}
            </span>
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
        </Card>
      )}

      {week && weekSheet === 'week' && <YourWeekSheet week={week} onClose={() => setWeekSheet(null)} />}
      {week && weekSheet === 'direction' && (
        <DirectionSheet
          current={week.chosen ? week.directionId : undefined}
          hasPlan={!!program}
          onChoose={(id) => { clearNotes(); void direction.choose(id); }}
          onGoal={() => startAdd()}
          onClose={() => setWeekSheet(null)}
        />
      )}
      {direction.sheet}

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
          up={stepAvailability(listed, menuView.item.goal.id, 'up')}
          down={stepAvailability(listed, menuView.item.goal.id, 'down')}
          onEdit={() => setEditing(menuView.item.goal)}
          onLabel={() => setLabelId(menuView.item.goal.id)}
          onStep={(dir) => {
            const result = moveGoal(listed, menuView.item.goal.id, dir);
            handleMove(menuView.item.goal.id, result);
            // Een stap die niets verandert zegt dat, in plaats van stil te blijven.
            if (!result.changed) {
              const can = stepAvailability(listed, menuView.item.goal.id, dir);
              setFlash(can.can ? 'De volgorde is niet veranderd.' : can.reason);
            }
          }}
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
          onSkill={skillsOn ? (close) => { close(); later(() => setCalisthenicsChoosing(true)); } : undefined}
          onSubmit={(draft, close) => {
            close();
            later(() => void horizon.propose(
              () => planHorizonChange({
                title: `${draft.name || 'Je doel'}: zo verandert je planning`,
                why: 'Volgt je nieuwe doel.',
                explanation: 'Een doel bepaalt de fasen van je planning en de dag waarop het eindigt. Eerst een voorstel, pas na Akkoord verandert er iets. Wat je al deed en zelf vastzette, blijft staan.',
                trigger: 'goal_created',
                goals: [draft],
              }),
              { eyebrow: 'Doel toevoegen · stap 3 van 3', ask: 'always', alwaysAsk: true, declined: 'Niets toegevoegd. Je planning blijft zoals ze was.' },
            ));
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {calisthenicsChoosing && (
        <CalisthenicsChoiceSheet
          generalTaken={!!liveGeneralGoal(skills.store)}
          onSubmit={(choice, close) => {
            close();
            later(() => {
              if (choice === 'skill') setSkillChoosing(true);
              else setGeneralProposal(buildGeneralGoal({ id: makeId('skill'), now: new Date().toISOString(), today, logs: sessionLogs }));
            });
          }}
          onClose={() => setCalisthenicsChoosing(false)}
        />
      )}

      {generalProposal && (
        <ImpactSheet
          eyebrow="Doel toevoegen · stap 3 van 3"
          title={`${generalProposal.name}?`}
          lines={['Ascend volgt vijf ladders: push-up, optrekken, dip, squat op één been en L-sit.', 'Je planning blijft zoals ze is.']}
          why="Dit doel heeft geen datum en wordt nooit je hoofddoel. Staat een ladder in je trainingen, dan stelt Forge de volgende stap voor zodra je de toets haalt. Dat gaat altijd met Akkoord."
          primaryLabel="Akkoord"
          secondaryLabel="Liever niet"
          onPrimary={() => { const g = generalProposal; skillWrite(() => skills.add(g), `${g.name} staat op Ascend.`, () => setGeneralProposal(null)); }}
          onSecondary={() => { setGeneralProposal(null); setFlash('Niets toegevoegd.'); }}
          onClose={() => setGeneralProposal(null)}
          busy={skillBusy}
        />
      )}

      {skillChoosing && (
        <SkillGoalSheet
          logs={sessionLogs}
          today={today}
          taken={takenSkillSteps(skills.store)}
          starts={ladderStarts}
          onSubmit={(goal, close) => { close(); later(() => setSkillProposal(goal)); }}
          onClose={() => setSkillChoosing(false)}
        />
      )}

      {skillProposal && (
        <ImpactSheet
          eyebrow="Doel toevoegen · stap 3 van 3"
          title={`${skillProposal.name} als vaardigheid?`}
          lines={[`Ladder ${skillLadderName(skillProposal.ladderId)}, doelstap ${skillProposal.targetStep}: ${skillProposal.name}.`, 'Je planning blijft zoals ze is.']}
          why="Een vaardigheid heeft geen datum en wordt nooit je hoofddoel. Ascend toont de ladder en wat je al haalde."
          primaryLabel="Akkoord"
          secondaryLabel="Liever niet"
          onPrimary={() => { const g = skillProposal; skillWrite(() => skills.add(g), `${g.name} staat op Ascend.`, () => setSkillProposal(null)); }}
          onSecondary={() => { setSkillProposal(null); setFlash('Niets toegevoegd.'); }}
          onClose={() => setSkillProposal(null)}
          busy={skillBusy}
        />
      )}

      {skillRemoving && (
        <ImpactSheet
          eyebrow={skillRemoving.general ? 'Doel weghalen' : 'Vaardigheid weghalen'}
          title={`${skillRemoving.name} weghalen?`}
          lines={[]}
          why="De kaart verdwijnt van Ascend. Je trainingen en de stappen die je haalde blijven bewaard."
          primaryLabel="Weghalen"
          secondaryLabel="Annuleren"
          onPrimary={() => { const g = skillRemoving; skillWrite(() => skills.remove(g.id), `${g.name} is weggehaald.`, () => setSkillRemoving(null)); }}
          onSecondary={() => setSkillRemoving(null)}
          onClose={() => setSkillRemoving(null)}
          busy={skillBusy}
        />
      )}

      {earlierOpen && (
        <EarlierGoalsSheet
          goals={earlier}
          note={flash}
          onUnarchive={(id) => { clearNotes(); void unarchiveGoal(id).then(() => setFlash(RESTORED_NOTE)); }}
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
            const settings = marathonSettingsFor(was, next);
            later(() => void horizon.propose(
              () => planHorizonChange({
                title: `${next.name || 'Je doel'}: zo verandert je planning`,
                why: 'Volgt wat je aanpaste.',
                explanation: 'Een andere datum, soort of tent in plaats van hutten verandert je planning nooit ongemerkt. Eerst een voorstel, pas na Akkoord verandert er iets. Wat je al deed en zelf vastzette, blijft staan.',
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
        <Sheet eyebrow="Ascend" title={extra === 'treks' ? 'Tochten' : 'Krachtblok'} line={extra === 'treks' ? 'Een tocht erbij? Er komen vrije dagen omheen.' : 'Hoe kracht in je week past.'} onClose={() => setExtra(null)}>
          {extra === 'treks' ? <TrekGoalsCard /> : <StrengthProgramCard />}
        </Sheet>
      )}

      {archiving && (
        <ImpactSheet
          eyebrow="Doel archiveren"
          title={`${archiving.name} archiveren?`}
          lines={[]}
          why="Het doel telt dan niet meer mee in je planning. Raakt dat je trainingen, dan komt er eerst een voorstel. Terughalen kan, maar zonder datum."
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
