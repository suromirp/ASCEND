import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { haptics } from '../../utils/haptics';
import { Icon } from '../icons';
import { OPEN_PX, decideAxis, followOffset, restOffset, swipeEnd, zoneAt, type Zone } from '../swipeRow';

// Een set die je naar links kunt vegen om te verwijderen (docs/beslissingen/2026-10-29-snelknoppen-in-forge.md).
// De rij volgt je vinger 1 op 1; een korte veeg laat hem openstaan met een rode knop van 72 px, een lange
// of snelle veeg verwijdert meteen. Het rode vlak ligt onder de rij en is alleen te zien waar de rij is
// weggeschoven. Hoogstens één rij staat open. De richting wordt na 8 px bepaald, verticaal blijft scrollen.
// Niet starten op een veld of knop (kg, herhalingen, RIR, het vinkje): daar is tikken en typen.

let openRow: { close: () => void } | null = null;

const SWALLOW_MS = 80;

export function SwipeRow({
  label,
  enabled,
  onDelete,
  children,
}: {
  // Het setnummer voor de schermlezer: "Set 3 verwijderen".
  label: string;
  enabled: boolean;
  onDelete: () => void;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const g = useRef({ id: -1, x: 0, y: 0, axis: 'undecided' as 'undecided' | 'horizontal' | 'vertical', start: 0, now: 0, width: 0, zone: 'closed' as Zone, lastX: 0, lastT: 0, vel: 0, wasOpen: false, swallow: false, live: false });
  const isOpen = useRef(false);
  // Eén vaste verwijzing naar deze rij, zodat hij zich kan afmelden zonder zichzelf te lezen.
  const self = useRef<{ close: () => void }>({ close: () => {} });

  const place = useCallback((x: number, animate: boolean) => {
    const f = front.current;
    const b = back.current;
    if (!f || !b) return;
    const t = animate ? 'transform 0.2s ease-out' : 'none';
    f.style.transition = t;
    f.style.transform = x === 0 ? '' : `translateX(${x}px)`;
    b.style.transition = animate ? 'width 0.2s ease-out' : 'none';
    b.style.width = `${Math.max(0, -x)}px`;
    b.style.visibility = x < 0 || animate ? 'visible' : 'hidden';
    if (animate && x === 0) {
      window.setTimeout(() => {
        if (b && !isOpen.current && g.current.now === 0) b.style.visibility = 'hidden';
      }, 220);
    }
  }, []);

  const close = useCallback(() => {
    isOpen.current = false;
    g.current.now = 0;
    setOpen(false);
    place(0, true);
    if (openRow === self.current) openRow = null;
  }, [place]);
  useEffect(() => { self.current.close = close; }, [close]);

  const openIt = useCallback(() => {
    if (openRow && openRow !== self.current) openRow.close();
    openRow = self.current;
    isOpen.current = true;
    g.current.now = -OPEN_PX;
    setOpen(true);
    place(-OPEN_PX, true);
  }, [place]);

  // Een open rij gaat dicht bij een tik ergens anders of bij scrollen.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (back.current?.contains(e.target as Node)) return;
      close();
    };
    const scroll = () => close();
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [open, close]);

  useEffect(() => () => { if (openRow === self.current) openRow = null; }, []);

  if (!enabled) return <>{children}</>;

  function down(e: React.PointerEvent) {
    if (e.button > 0 || !e.isPrimary) return;
    const target = e.target as Element;
    const stop = target.closest('button, input, textarea, select, [role="switch"]');
    if (stop && !stop.hasAttribute('data-swipe-ok')) return;
    const s = g.current;
    s.id = e.pointerId;
    s.x = e.clientX;
    s.y = e.clientY;
    s.axis = 'undecided';
    s.wasOpen = isOpen.current;
    s.start = isOpen.current ? -OPEN_PX : 0;
    s.width = wrap.current?.getBoundingClientRect().width ?? 320;
    s.zone = zoneAt(s.start, s.width, s.wasOpen);
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    s.vel = 0;
    s.swallow = false;
    s.live = true;
  }

  function move(e: React.PointerEvent) {
    const s = g.current;
    if (!s.live || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.axis === 'undecided') {
      s.axis = decideAxis(dx, dy);
      if (s.axis === 'vertical') {
        s.live = false;
        return;
      }
      if (s.axis === 'horizontal') {
        try { front.current?.setPointerCapture(e.pointerId); } catch { /* geen capture, dan volgt hij zonder */ }
        s.swallow = true;
      }
    }
    if (s.axis !== 'horizontal') return;
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.vel = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    const x = followOffset(dx, s.start, s.width);
    s.now = x;
    const zone = zoneAt(x, s.width, s.wasOpen);
    if (zone !== s.zone) {
      if (zone !== 'closed') haptics.tap();
      s.zone = zone;
    }
    place(x, false);
  }

  function up(e: React.PointerEvent) {
    const s = g.current;
    if (!s.live || e.pointerId !== s.id) return;
    s.live = false;
    if (s.axis === 'undecided') {
      // Een tik op een open rij sluit hem, zonder dat de tik ook nog iets in de rij doet.
      if (s.wasOpen) {
        s.swallow = true;
        close();
      }
      return;
    }
    if (s.axis !== 'horizontal') return;
    const end = swipeEnd(s.now, s.width, s.vel, s.wasOpen);
    if (end === 'delete') {
      s.now = restOffset('delete', s.width);
      place(s.now, true);
      window.setTimeout(onDelete, 160);
    } else if (end === 'open') {
      openIt();
    } else {
      close();
    }
  }

  function cancel(e: React.PointerEvent) {
    const s = g.current;
    if (!s.live || e.pointerId !== s.id) return;
    s.live = false;
    if (s.axis === 'horizontal') {
      if (s.wasOpen) openIt();
      else close();
    }
  }

  return (
    <div
      ref={wrap}
      className="relative overflow-hidden rounded-xl"
      onClickCapture={(e) => {
        if (!g.current.swallow) return;
        g.current.swallow = false;
        e.stopPropagation();
        e.preventDefault();
      }}
      onPointerUpCapture={() => {
        // Komt er na een veeg geen klik, dan mag de volgende tik gewoon.
        if (g.current.swallow) window.setTimeout(() => { g.current.swallow = false; }, SWALLOW_MS);
      }}
    >
      <div ref={back} className="absolute inset-y-0 right-0 flex justify-end overflow-hidden" style={{ width: 0, visibility: 'hidden', background: 'var(--color-danger)' }}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label={`Set ${label} verwijderen`}
          onClick={() => {
            haptics.tap();
            g.current.now = -g.current.width;
            place(-(wrap.current?.getBoundingClientRect().width ?? 320), true);
            window.setTimeout(onDelete, 160);
          }}
          className="flex h-full min-h-[44px] shrink-0 items-center justify-center"
          style={{ width: OPEN_PX, color: 'var(--color-ink)' }}
        >
          <Icon name="minrond" size={26} />
        </button>
      </div>
      <div ref={front} style={{ touchAction: 'pan-y', willChange: open ? 'transform' : undefined }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        {children}
      </div>
    </div>
  );
}
