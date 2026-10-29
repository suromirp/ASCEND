import { memo, useEffect, useRef } from 'react';
import { exerciseComplete } from '../../engine/forgeInput';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import { ExerciseArtThumb } from '../ExerciseArtButton';
import { Icon } from '../icons';
import { exerciseById } from '../../data/exercises';
import { resolveExerciseArt, showsExerciseArt } from '../../engine/exerciseArtSettings';
import { useAppData } from '../../state/AppDataContext';

// De strook bovenaan een training met een oefening per scherm (docs/beslissingen/2026-10-29-oefeningen-opzij-vegen.md):
// een kaartje per oefening, de huidige onderstreept in mint, een afgeronde met een klein vinkje. Een tik springt
// naar die oefening. De strook scrolt zelf mee zodat het huidige kaartje in beeld blijft (alleen bij een wissel).
export const ForgeStrip = memo(function ForgeStrip({
  workout,
  current,
  readOnly,
  onJump,
}: {
  workout: WorkoutExercise[];
  current: number;
  readOnly: boolean;
  onJump: (index: number) => void;
}) {
  const { settings } = useAppData();
  const art = showsExerciseArt(resolveExerciseArt(settings));
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = strip.current;
    const card = el?.children[current] as HTMLElement | undefined;
    if (!el || !card) return;
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    const off = document.documentElement.dataset.motion === 'off' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, left), behavior: off ? 'auto' : 'smooth' });
  }, [current]);
  return (
    <div ref={strip} className="forge-strip flex gap-1.5 overflow-x-auto px-3 pb-1.5" role="group" aria-label="Oefeningen van deze training" data-no-sheet-drag>
      {workout.map((ex, i) => {
        const on = i === current;
        const done = !readOnly && exerciseComplete(ex);
        return (
          <button
            key={ex.slot}
            type="button"
            aria-current={on ? 'true' : undefined}
            aria-label={`${i + 1}. ${ex.name}${done ? ', klaar' : ''}`}
            onClick={() => onJump(i)}
            className="relative flex h-[52px] w-11 shrink-0 flex-col items-center justify-start pt-0.5"
          >
            <span
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border"
              style={{ background: 'var(--color-surface)', borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', opacity: on || done ? 1 : 0.82 }}
            >
              {art && exerciseById(ex.exerciseId) ? <ExerciseArtThumb exerciseId={ex.exerciseId} size={40} /> : <span className="font-sans text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}</span>}
            </span>
            <span aria-hidden="true" className="absolute bottom-0 left-1.5 right-1.5 h-[3px] rounded-full" style={{ background: on ? 'var(--color-action)' : 'transparent', transition: 'background-color 0.2s ease-out' }} />
            {done && (
              <span aria-hidden="true" className="absolute -right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'var(--color-progress)', color: 'var(--color-on-action)' }}>
                <Icon name="vinkje" size={11} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
