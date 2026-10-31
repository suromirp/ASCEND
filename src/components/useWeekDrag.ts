import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { PlannedSession } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { dayAtY, nextDroppable, type DayVerdict, type DecideOptions, type MoveDecision } from '../engine/weekDrag';
import { haptics } from '../utils/haptics';
import { useVerticalDrag } from './useVerticalDrag';
import { useLegMoveNotes } from './useLegMoveNote';
import { setFlipOrigin } from '../utils/flipDom';

// Een training slepen in Week (docs/visie/Slepen in Week.md): de toestand van het slepen en de
// handelingen van de greep. Wat een dag zegt en wat loslaten doet komt uit engine/weekDrag.ts; de
// mechaniek van de vinger uit useVerticalDrag, dezelfde als de doelen op Ascend. Het slepen is geen
// laag in de terugknop en schrijft het adres niet om; het blad na het loslaten wel (RescheduleDialog).

export interface WeekDragState {
  id: string;
  mode: 'pointer' | 'key';
  // De dag onder de vinger of onder het toetsenbord; geen dag is annuleren.
  target?: string;
  verdicts: DayVerdict[];
  askAlways: boolean | string;
  // De zwevende rij (alleen met de vinger): vast aan het scherm, alleen verticaal bewegend.
  ghost?: { left: number; width: number; height: number; top: number };
  fingerY: number;
}

export interface WeekDragView {
  text: string;
  tone: 'ok' | 'warn' | 'none';
  chip?: string;
  target?: string;
  // De zin staat onderaan; staat de vinger in het onderste derde, dan springt hij naar boven.
  position: 'top' | 'bottom';
}

export interface WeekHandle {
  active: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  onBlur: () => void;
}

export const DRAG_FAILED = 'Dat lukte niet. De training staat nog op zijn dag.';
const PICKUP_PX = 6;
const FAILED_MS = 4000;
const MOVED_MS = 800;

const dayRects = () => Array.from(document.querySelectorAll<HTMLElement>('[data-week-day]')).map((el) => {
  const r = el.getBoundingClientRect();
  return { date: el.dataset.weekDay ?? '', top: r.top, bottom: r.bottom };
});

export function useWeekDrag({ weekStart, enabled, moveTo, onOpenMove }: {
  weekStart: string;
  enabled: boolean;
  // Dezelfde weg als het actieblad (Week.tsx#moveTo).
  moveTo: (sessionId: string, date: string, opts?: DecideOptions) => Promise<MoveDecision['action']>;
  // Een korte tik op de greep: het actieblad op de stap Verplaatsen.
  onOpenMove: (sessionId: string) => void;
}) {
  const { dragVerdicts, previewDrop } = useAppData();
  const dragger = useVerticalDrag();
  const [drag, setDrag] = useState<WeekDragState | null>(null);
  const [announce, setAnnounce] = useState('');
  const [failed, setFailed] = useState(false);
  const [movedId, setMovedId] = useState<string | null>(null);
  const fingerY = useRef(0);
  const blockClickUntil = useRef(0);
  const timers = useRef<number[]>([]);
  const live = useRef({ drag, moveTo, onOpenMove });
  useEffect(() => { live.current = { drag, moveTo, onOpenMove }; });
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // Een andere week of een uitgezette instelling terwijl je sleept: stoppen zonder verandering.
  const cancelDrag = dragger.cancel;
  useEffect(() => {
    cancelDrag();
    setDrag(null);
  }, [weekStart, enabled, cancelDrag]);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const verdictsFor = (sessionId: string): DayVerdict[] => {
    try {
      return dragVerdicts(sessionId, weekStart);
    } catch (err) {
      console.error('De dagen bij het slepen konden niet worden berekend:', err);
      return [];
    }
  };

  async function finish(id: string, target: string | undefined, askAlways: boolean | string, verdicts: DayVerdict[]) {
    blockClickUntil.current = Date.now() + 500;
    setDrag(null);
    const verdict = target ? verdicts.find((v) => v.date === target) : undefined;
    if (!verdict || !verdict.droppable || verdict.kind === 'origin') { setAnnounce('Niet verplaatst'); return; }
    try {
      const action = await live.current.moveTo(id, verdict.date, { askAlways, verdict });
      if (action === 'apply') {
        setAnnounce(`Verplaatst naar ${verdict.line.split('.')[0].toLowerCase()}`);
        setMovedId(id);
        later(() => setMovedId(null), MOVED_MS);
        // De greep op zijn nieuwe plek krijgt de focus terug.
        later(() => document.querySelector<HTMLElement>(`[data-drag-handle="${id}"]`)?.focus({ preventScroll: true }), 60);
      } else if (action === 'none') {
        setAnnounce('Niet verplaatst');
      }
    } catch (err) {
      console.error('Verplaatsen met slepen mislukt:', err);
      setFailed(true);
      setAnnounce(DRAG_FAILED);
      later(() => setFailed(false), FAILED_MS);
    }
  }

  const handleFor = (session: PlannedSession, askAlways: boolean | string): WeekHandle => {
    const id = session.id;
    const active = drag?.id === id;

    const startPointer = (e: PointerEvent<HTMLButtonElement>) => {
      if (!enabled) return;
      const row = e.currentTarget.closest<HTMLElement>('[data-session-row]');
      const rect = row?.getBoundingClientRect();
      const verdicts = verdictsFor(id);
      if (!rect || verdicts.length === 0) return;
      const grab = e.clientY - rect.top;
      dragger.start<string | undefined>(e, {
        threshold: PICKUP_PX,
        locate: (y) => { fingerY.current = y; return dayAtY(dayRects(), y); },
        onPickUp: () => { haptics.tap(); setAnnounce(''); },
        onChange: (target) => setDrag({
          id, mode: 'pointer', target, verdicts, askAlways, fingerY: fingerY.current,
          ghost: { left: rect.left, width: rect.width, height: rect.height, top: fingerY.current - grab },
        }),
        // De rij schuift naar zijn dag vanaf waar je hem losliet (utils/flipDom.ts).
        onDrop: (target) => { setFlipOrigin(id, fingerY.current - grab); void finish(id, target, askAlways, verdicts); },
        onCancel: () => { setDrag(null); setAnnounce('Niet verplaatst'); },
      });
    };

    const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      const d = live.current.drag?.id === id && live.current.drag.mode === 'key' ? live.current.drag : null;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        blockClickUntil.current = Date.now() + 500;
        if (!enabled) return;
        if (!d) {
          const verdicts = verdictsFor(id);
          const origin = verdicts.find((v) => v.kind === 'origin');
          if (!origin || !verdicts.some((v) => v.droppable && v.kind !== 'origin')) { setAnnounce('Deze week is er geen dag die kan.'); return; }
          setDrag({ id, mode: 'key', target: origin.date, verdicts, askAlways, fingerY: 0 });
          return;
        }
        void finish(id, d.target, d.askAlways, d.verdicts);
      } else if (d && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const next = nextDroppable(d.verdicts, d.target ?? '', e.key === 'ArrowUp' ? -1 : 1);
        if (!next) { setAnnounce(e.key === 'ArrowUp' ? 'Geen eerdere dag die kan.' : 'Geen latere dag die kan.'); return; }
        setDrag({ ...d, target: next.date });
      } else if (d && (e.key === 'Escape' || e.key === 'Tab')) {
        if (e.key === 'Escape') e.preventDefault();
        setDrag(null);
        setAnnounce('Niet verplaatst');
      }
    };

    return {
      active,
      onPointerDown: startPointer,
      onKeyDown: keyDown,
      // Een tik (en een dubbele tik met TalkBack, die een klik stuurt): het blad op Verplaatsen.
      onClick: () => { if (Date.now() >= blockClickUntil.current) live.current.onOpenMove(id); },
      onBlur: () => { if (live.current.drag?.id === id && live.current.drag.mode === 'key') setDrag(null); },
    };
  };

  // Wat de dag onder je vinger zegt, plus wat er nieuw ontstaat in de week en de stille regel met de beenindex.
  const current = drag?.target ? drag.verdicts.find((v) => v.date === drag.target) : undefined;
  const checked = drag && current && current.droppable && current.kind !== 'origin' ? current : undefined;
  const skipRules = checked?.kind === 'clash' ? ['LEG-SPACING'] : checked?.kind === 'rest' ? ['REST-DAY'] : [];
  const dragId = drag?.id;
  const checkedDate = checked?.date;
  const extras = useMemo(
    () => (dragId && checkedDate ? previewDrop(dragId, checkedDate, skipRules) : []),
    // `skipRules` volgt uit de dag in `checkedDate`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [dragId, checkedDate, previewDrop],
  );
  const [settled, setSettled] = useState<{ id: string; date: string } | null>(null);
  useEffect(() => {
    setSettled(null);
    if (!dragId || !checkedDate) return;
    const t = window.setTimeout(() => setSettled({ id: dragId, date: checkedDate }), 200);
    return () => window.clearTimeout(t);
  }, [dragId, checkedDate]);
  const legNotes = useLegMoveNotes(settled ? [{ sessionId: settled.id, toDate: settled.date }] : []);
  const legLine = settled && settled.date === checkedDate ? legNotes[0]?.line : undefined;

  const view: WeekDragView | null = useMemo(() => {
    if (!drag) return null;
    if (!drag.target || !current) return { text: 'Loslaten laat hem staan.', tone: 'none', position: 'bottom' };
    const warn = current.tone === 'warn' || (checked !== undefined && (extras.length > 0 || !!legLine));
    return {
      text: [current.line, ...(checked ? [...extras, legLine] : [])].filter(Boolean).join(' '),
      tone: current.tone === 'none' ? 'none' : warn ? 'warn' : current.tone,
      chip: current.chip,
      target: current.date,
      position: drag.mode === 'pointer' && drag.fingerY > window.innerHeight * (2 / 3) ? 'top' : 'bottom',
    };
  }, [drag, current, checked, extras, legLine]);

  // Met het toetsenbord leest de schermlezer dezelfde zin als onderaan het scherm staat.
  const keyText = drag?.mode === 'key' ? view?.text : undefined;
  useEffect(() => { if (keyText) setAnnounce(keyText); }, [keyText]);

  return { drag, view, announce, failed, movedId, handleFor };
}
