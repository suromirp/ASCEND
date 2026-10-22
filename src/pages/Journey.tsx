// ASCEND — Reisplanner "Op weg naar 1 augustus": the tasks on the way to the
// GR5 that are not training, on a timeline with a tick box each
// (data/journeyTasks.ts, engine/journey.ts). Opened from Ascend.

import { useLayoutEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Card, Eyebrow, PrimaryButton } from '../components/ui';
import { CheckCircle } from '../components/reis/CheckCircle';
import { JourneyTaskSheet } from '../components/reis/JourneyTaskSheet';
import { useJourney } from '../components/reis/useJourney';
import { usePackList } from '../components/reis/usePackList';
import { shortDateNL } from '../components/reis/format';
import { JOURNEY_TASKS } from '../data/journeyTasks';
import { journeyTimeline, journeyWeeksLeft, type TimelineTask } from '../engine/journey';
import { baseWeightGrams, formatKg, packProgress } from '../engine/packList';
import { formatDateNL, formatMonthNL, todayISO } from '../utils/dates';

function rowMeta(row: TimelineTask): string {
  if (row.status === 'done') return row.doneOn ? `gedaan op ${shortDateNL(row.doneOn)}` : 'gedaan';
  if (row.status === 'later') return `vanaf ${shortDateNL(row.opensOn)}`;
  if (row.status === 'lapsed') return 'nog open';
  return `tot en met ${shortDateNL(row.closesOn)}`;
}

export function JourneyPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { goalDate, state, pick, progress, tick, untick } = useJourney();
  const { items } = usePackList();
  const today = todayISO();

  const timeline = goalDate ? journeyTimeline(JOURNEY_TASKS, state, today, goalDate, pick?.task.id) : [];
  // The open task lives in state, not in the address: the sheet takes one
  // step in the history (the back button closes it), and an address that is
  // rewritten under that step would leave a copy of this page behind. A link
  // with ?taak= (from Vandaag) opens the sheet once and the address is cleaned.
  const taakParam = params.get('taak');
  const [selectedId, setSelectedId] = useState<string | null>(taakParam);
  useLayoutEffect(() => {
    if (!taakParam) return;
    setSelectedId(taakParam);
    setParams({}, { replace: true });
    // setParams only sets the address.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [taakParam]);
  const selected = timeline.flatMap((g) => g.tasks).find((r) => r.task.id === selectedId);
  const closeSheet = () => setSelectedId(null);

  const packs = packProgress(items);

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-4">
      <div className="flex items-center gap-1">
        <BackButton fallback="/ascend" />
        <div>
          <Eyebrow>REISPLANNER</Eyebrow>
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
            {goalDate ? `Op weg naar ${formatDateNL(goalDate)}` : 'Op weg naar de start'}
          </p>
        </div>
      </div>

      {!goalDate ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            De taken staan op een tijdlijn tot je hoofddoel. Stel eerst een hoofddoel met een datum in, dan zie je hier wat wanneer aan de beurt is.
          </p>
          <PrimaryButton onClick={() => navigate('/ascend/doelen')}>Doel instellen</PrimaryButton>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2" texture>
            <div className="flex items-baseline justify-between">
              <Eyebrow>JE VOORBEREIDING</Eyebrow>
              <span className="text-xs" style={{ color: 'var(--color-gold)' }}>nog {journeyWeeksLeft(today, goalDate)} weken</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{progress.done} van {progress.total} taken gedaan</p>
            <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--color-card-border)' }} role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Taken gedaan">
              <div className="h-full rounded-full" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: 'var(--color-gold)' }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Elke week komt er één taak naar voren op Vandaag. De rest staat hier op volgorde van wanneer het uiterlijk moet. Wat je niet haalt, blijft gewoon open.
            </p>
          </Card>

          <button onClick={() => navigate('/reis/paklijst')} className="text-left">
            <Card className="flex items-center justify-between gap-3">
              <div>
                <Eyebrow>PAKLIJST</Eyebrow>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>Basisgewicht {formatKg(baseWeightGrams(items))}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{packs.have} van {packs.total} onderdelen heb je al</p>
              </div>
              <span className="text-xl" style={{ color: 'var(--color-ink-dim)' }} aria-hidden="true">›</span>
            </Card>
          </button>

          {timeline.map((group) => (
            <section key={group.month} className="flex flex-col gap-1" aria-label={formatMonthNL(group.month)}>
              <Eyebrow>{formatMonthNL(group.month).toUpperCase()}</Eyebrow>
              <Card className="flex flex-col !p-2">
                {group.tasks.map((row) => (
                  <div
                    key={row.task.id}
                    className="flex items-center gap-1 rounded-xl border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--color-card-border)',
                      background: row.isThisWeek && row.status !== 'done' ? 'var(--color-surface)' : undefined,
                    }}
                  >
                    <CheckCircle checked={row.status === 'done'} onToggle={() => (row.status === 'done' ? untick(row.task.id) : tick(row.task.id))} label={`${row.task.title}: ${row.status === 'done' ? 'haal vinkje weg' : 'vink af'}`} />
                    <button onClick={() => setSelectedId(row.task.id)} className="flex min-h-[52px] min-w-0 flex-1 flex-col justify-center py-1.5 pr-2 text-left">
                      <span
                        className="text-sm leading-snug"
                        style={{ color: row.status === 'done' ? 'var(--color-ink-dim)' : 'var(--color-ink)', textDecoration: row.status === 'done' ? 'line-through' : undefined }}
                      >
                        {row.task.title}
                      </span>
                      <span className="text-xs" style={{ color: row.isThisWeek && row.status !== 'done' ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>
                        {row.isThisWeek && row.status !== 'done' ? `deze week, ${rowMeta(row)}` : rowMeta(row)}
                      </span>
                    </button>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </>
      )}

      {selected && (
        <JourneyTaskSheet
          row={selected}
          onTick={() => tick(selected.task.id)}
          onUntick={() => untick(selected.task.id)}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
