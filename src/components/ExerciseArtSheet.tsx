import { useEffect, useRef, useState } from 'react';
import { exerciseArt } from '../data/exerciseArt';
import { exerciseById } from '../data/exercises';
import { MUSCLE_LABEL, PATTERN_LABEL } from '../models/exercise';
import { cropFor, muscleMarks, muscleNames, sidesOf } from '../engine/muscleMap';
import { resolveExerciseArt, showsDrawing } from '../engine/exerciseArtSettings';
import { SLOW_LOAD_MS, artPhase, splitCues, type ExerciseDrawing } from '../engine/exerciseArtData';
import { mayTap, openingMs, stepBy, swipeDelta, type Step } from '../engine/exerciseSteps';
import { resolveFigure } from '../engine/figureSettings';
import { loadDrawing, loadedDrawing } from '../utils/exerciseArtLoader';
import { haptics } from '../utils/haptics';
import { useSheetClose } from '../utils/useSheetClose';
import { useAppData } from '../state/AppDataContext';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { TextLink } from './TextButton';
import { Card, Eyebrow, SheetGrip } from './ui';
import { MuscleFigure } from './MuscleFigure';
import { useMotionMode } from './motion';

// Het blad van een oefening: het grote vlak met de tekening in drie stappen, het spierkaartje met
// "Werkt op", en Doen, Let op en Vaak fout uit de aanwijzingen van de oefening. Zonder tekening is
// het spierkaartje het hoofdbeeld, zonder verontschuldiging. Het blad groeit uit het kaartje
// waar je op tikte (data-sheet-from). Ontwerp: docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md.

function Frame({ drawing, i }: { drawing: ExerciseDrawing; i: 0 | 1 | 2 }) {
  return (
    <svg viewBox={drawing.viewBox.join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path fillRule="evenodd" d={drawing.frames[i]} />
    </svg>
  );
}

function Movement({ drawing, name, note }: { drawing: ExerciseDrawing; name: string; note?: string }) {
  const motion = useMotionMode();
  const [step, setStep] = useState<Step>(3);
  const [playing, setPlaying] = useState(() => openingMs(motion) > 0);
  const lastTap = useRef(-1e9);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  // De opening speelt één keer; daarna staat het stil en regel jij de stappen.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(false), openingMs(motion) + 80);
    return () => clearTimeout(t);
  }, [playing, motion]);

  // Alleen een stap die je zelf zet geeft een tik, met een rem tegen zoemen.
  function go(next: Step) {
    if (next === step) return;
    setPlaying(false);
    setStep(next);
    const now = performance.now();
    if (mayTap(lastTap.current, now)) {
      lastTap.current = now;
      haptics.tap();
    }
  }

  return (
    <div className={`ea-beweging ${playing ? 'ea-play' : ''}`} data-stap={step} role="group" aria-label={`Beweging van ${name} in drie stappen`}>
      <button
        type="button"
        className="ea-vlak"
        aria-label={`Volgende stap, nu stap ${step} van 3`}
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; }}
        onPointerUp={(e) => {
          const from = start.current;
          start.current = null;
          if (!from) return;
          const delta = swipeDelta(e.clientX - from.x, e.clientY - from.y);
          if (delta !== 0) { swiped.current = true; go(stepBy(step, delta)); }
        }}
        onClick={() => { if (swiped.current) { swiped.current = false; return; } go(stepBy(step, 1)); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(stepBy(step, 1));
          if (e.key === 'ArrowLeft') go(stepBy(step, -1));
        }}
      >
        {([0, 1, 2] as const).map((i) => <div key={i} className="ea-fr" data-i={i + 1}><Frame drawing={drawing} i={i} /></div>)}
      </button>
      <div className="ea-stappen" role="radiogroup" aria-label="Stap van de beweging">
        {([1, 2, 3] as const).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={step === n} aria-label={`Stap ${n} van 3`} className="ea-stap" data-i={n} onClick={() => go(n)}>
            <Frame drawing={drawing} i={(n - 1) as 0 | 1 | 2} />
            <span className="ea-nr">{n}</span>
            <span className="ea-ring" />
          </button>
        ))}
      </div>
      {note && <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Op de tekening: {note}.</p>}
    </div>
  );
}

export function ExerciseArtSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const { settings } = useAppData();
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const exercise = exerciseById(exerciseId);
  const link = exerciseArt(exerciseId);
  const wantsDrawing = !!link && showsDrawing(resolveExerciseArt(settings));
  const { figure } = resolveFigure(settings);

  // Undefined is nog aan het laden, null is er geen (of het lukte niet binnen de grens in tijd).
  const [drawing, setDrawing] = useState<ExerciseDrawing | null | undefined>(() => (wantsDrawing && link ? (loadedDrawing(link.slug) ?? undefined) : null));
  useEffect(() => {
    if (!wantsDrawing || !link || drawing !== undefined) return;
    let live = true;
    void loadDrawing(link.slug).then((d) => { if (live) setDrawing(d); });
    return () => { live = false; };
  }, [wantsDrawing, link, drawing]);

  // Duurt het laden langer dan anderhalve seconde, dan staat de spierkaart in het vlak; komt de tekening
  // daarna alsnog, dan neemt zij het over.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!wantsDrawing || drawing !== undefined) return;
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(t);
  }, [wantsDrawing, drawing]);

  if (!exercise) return null;
  const marks = muscleMarks(exercise);
  const sides = sidesOf(marks);
  const phase = artPhase(wantsDrawing, drawing, slow);
  const hasDrawing = phase === 'drawing';
  const loading = phase === 'waiting';
  const crop = cropFor(marks, { minW: 100, minH: 90, margin: 18 });
  const big = !hasDrawing && !loading;
  const maxW = big ? 150 : sides.length > 1 ? 92 : 130;
  const maxH = big ? 190 : 132;
  const scale = Math.min(maxW / crop[2], maxH / crop[3]);
  const w = Math.round(crop[2] * scale);
  const h = Math.round(crop[3] * scale);
  const primary = exercise.primary.filter((g, i, all) => all.indexOf(g) === i);
  const secondary = exercise.secondary.filter((g) => !primary.includes(g));
  const cues = splitCues(exercise.cues);

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          ref={sheetRef}
          className={`relative max-h-[92vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Uitleg van ${exercise.name}`}
        >
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-8">
            <SheetHeader eyebrow={PATTERN_LABEL[exercise.pattern]} title={exercise.name} onClose={requestClose} />

            {hasDrawing && link && drawing && <Movement drawing={drawing} name={exercise.name} note={link.match === 'variant' ? link.note : undefined} />}
            {loading && <div className="ea-vlak" aria-hidden="true" />}

            <div className="ea-licht rounded-2xl border p-3.5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }} role="group" aria-label="Werkt op">
              <div className={big ? 'flex flex-col items-stretch gap-3.5' : 'flex items-center gap-4'}>
                <div className={`flex shrink-0 items-start gap-1.5 ${big ? 'justify-center gap-4' : ''}`}>
                  {sides.map((side) => (
                    <div key={side} className="ea-fig flex flex-col items-center gap-1">
                      <MuscleFigure marks={marks} side={side} crop={crop} width={w} height={h} figure={figure} />
                      {sides.length > 1 && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{side === 'front' ? 'Voor' : 'Achter'}</span>}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2"><Eyebrow tone="var(--color-sport-strength)">Werkt op</Eyebrow></div>
                  <div className="flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--color-sport-strength)' }} />
                    <div>
                      <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoofdspier</span>
                      <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{muscleNames(primary)}</span>
                    </div>
                  </div>
                  {secondary.length > 0 && (
                    <div className="mt-2 flex items-start gap-2.5">
                      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--color-sport-strength)', opacity: 0.4 }} />
                      <div>
                        <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>Helpt mee</span>
                        <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{muscleNames(secondary)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="sr-only">{`${primary.map((g) => MUSCLE_LABEL[g]).join(', ')} werken het hardst.`}</span>
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              {cues.map((c) => (
                <div key={c.text} className="flex flex-col gap-0.5">
                  {c.label && <Eyebrow>{c.label}</Eyebrow>}
                  <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{c.text}</p>
                </div>
              ))}
            </div>

            {hasDrawing && (
              <div className="flex flex-col items-start">
                <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Tekening: Everkinetic en Bryl Lim, CC BY-SA 4.0, aangepast.</p>
                <TextLink tone="dim" size="xs" href="https://creativecommons.org/licenses/by-sa/4.0/deed.nl">Licentie CC BY-SA 4.0</TextLink>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
