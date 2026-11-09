// De kop van het workoutscherm van Forge: terug, naam, menu, Afronden, klok met voortgang, pauze en de strook.
// Alleen tonen; de handelingen komen van ForgeWorkout.tsx.

import type { Ref } from 'react';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import type { Pause } from '../../engine/forgeSession';
import { Icon } from '../icons';
import { TextButton } from '../TextButton';
import { ForgeStrip } from './ForgeStrip';
import { ElapsedClock } from './ForgeTimers';

export function ForgeHeader({ headerRef, title, preview, readOnly, startedAt, pauses, paused, done, total, news, paged, workout, page, onClose, onMenu, onFinish, onLog, onResume, onJump }: {
  headerRef: Ref<HTMLElement>;
  title: string;
  preview: boolean;
  readOnly: boolean;
  startedAt: number | null;
  pauses: Pause[];
  paused: boolean;
  done: number;
  total: number;
  news: number;
  paged: boolean;
  workout: WorkoutExercise[];
  page: number;
  onClose: () => void;
  onMenu: () => void;
  onFinish: () => void;
  onLog: () => void;
  onResume: () => void;
  onJump: (i: number) => void;
}) {
  return (
    <header ref={headerRef} className="sticky top-0 z-20 border-b px-2" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-card-border)', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-1 pt-1">
        <button type="button" onClick={onClose} aria-label={preview ? 'Sluiten' : 'Kleiner maken, de training loopt door'} className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="terug" size={22} />
        </button>
        {/* Op een smal scherm eerst kleiner (16 in plaats van 20), zodat de A of B blijft staan; pas daarna afkappen. */}
        <h1 className="min-w-0 flex-1 truncate font-display text-base leading-tight min-[380px]:text-xl" style={{ color: 'var(--color-ink)' }}>{title}</h1>
        <button type="button" onClick={onMenu} aria-label="Menu van de training" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="meer" size={22} />
        </button>
        <button
          type="button"
          onClick={preview ? onClose : onFinish}
          className="mr-2 min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold active:scale-[0.97]"
          style={{ background: 'var(--color-action-fill)', color: 'var(--color-on-action)' }}
        >
          {preview ? 'Sluiten' : readOnly ? 'Afvinken' : 'Afronden'}
        </button>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-3 px-2 pb-2 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          <ElapsedClock startedAt={startedAt} pauses={pauses} />
          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-card-border)' }} aria-hidden="true">
            <div className="h-1 rounded-full transition-[width] duration-300" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: 'var(--color-progress)' }} />
          </div>
          <span className="font-sans">{done} van {total} sets</span>
          <button type="button" onClick={onLog} aria-label={news > 0 ? 'Verloop van de training, er is iets nieuws' : 'Verloop van de training'} className="relative -my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
            <Icon name="verloop" size={20} />
            {news > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: 'var(--color-status)' }} />}
          </button>
        </div>
      )}
      {!readOnly && paused && (
        <div className="animate-fade-in flex items-center gap-2 px-2 pb-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="pauze" size={16} />
          <span className="flex-1">Gepauzeerd</span>
          <TextButton onClick={onResume}>Verder</TextButton>
        </div>
      )}
      {paged && <ForgeStrip workout={workout} current={page} readOnly={readOnly} onJump={onJump} />}
    </header>
  );
}
