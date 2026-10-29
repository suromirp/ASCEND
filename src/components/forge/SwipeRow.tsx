import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { haptics } from '../../utils/haptics';
import { reducedMotion } from '../../utils/motion';
import { Icon } from '../icons';
import { OPEN_PX, decideAxis, followOffset, restOffset, swipeEnd, zoneAt, type Zone } from '../swipeRow';

// Een set die je naar links kunt vegen om te verwijderen (docs/beslissingen/2026-10-29-snelknoppen-in-forge.md).
// De rij volgt je vinger 1 op 1; een korte veeg laat hem openstaan met een rode knop van 72 px, een lange
// of snelle veeg verwijdert meteen. Het rode vlak ligt rechts naast de rij en schuift met dezelfde
// verplaatsing mee, zodat het precies de ruimte vult die de rij vrijmaakt. Hoogstens één rij staat open.
//
// Soepel op een telefoon (docs/beslissingen/2026-10-29-oefeningen-opzij-vegen.md): tijdens het vegen geen
// React-state en geen meting, alleen een transform via de refs, één keer per beeld (requestAnimationFrame).
// De breedte wordt bij het neerzetten van je vinger één keer gelezen. `will-change` staat alleen aan
// zolang je veegt. Een veeg begint alleen op een deel van de rij met `data-swipe-zone` (het nummer en het
// voorschrift); daar staat `touch-action: pan-y` (index.css), dus de browser laat horizontaal aan ons en
// scrolt verticaal zelf. Elders op de rij (kg, herhalingen, RIR, het vinkje) is tikken en typen, en wisselt
// opzij vegen van oefening als de oefeningen per scherm staan.

let openRow: { close: () => void } | null = null;

const SWALLOW_MS = 80;
// Loslaten: kort en ease-out; in Uit en bij beperkte beweging meteen de eindstand.
const SETTLE_MS = 200;

function motionOff(): boolean {
  return reducedMotion() || (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'off');
}

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
  const g = useRef({ id: -1, x: 0, y: 0, axis: 'undecided' as 'undecided' | 'horizontal' | 'vertical', start: 0, now: 0, width: 0, reach: 0, zone: 'closed' as Zone, lastX: 0, lastT: 0, vel: 0, wasOpen: false, swallow: false, live: false });
  const isOpen = useRef(false);
  const frame = useRef(0);
  // Eén vaste verwijzing naar deze rij, zodat hij zich kan afmelden zonder zichzelf te lezen.
  const self = useRef<{ close: () => void }>({ close: () => {} });

  // Zet rij en rood vlak op x. Alleen transform en transition: geen layout.
  const place = useCallback((x: number, animate: boolean) => {
    const f = front.current;
    const b = back.current;
    if (!f || !b) return;
    const t = animate && !motionOff() ? `transform ${SETTLE_MS}ms ease-out` : 'none';
    f.style.transition = t;
    b.style.transition = t;
    f.style.transform = x === 0 ? '' : `translate3d(${x}px,0,0)`;
    b.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  // Tijdens het vegen: hoogstens één keer per beeld, met de laatste stand.
  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      place(g.current.now, false);
    });
  }, [place]);
  const flush = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  const swiping = (on: boolean) => {
    const v = on ? 'transform' : '';
    if (front.current) front.current.style.willChange = v;
    if (back.current) back.current.style.willChange = v;
  };

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

  const remove = (width: number) => {
    g.current.now = -width;
    place(-width, true);
    window.setTimeout(onDelete, motionOff() ? 0 : SETTLE_MS - 40);
  };

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

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (openRow === self.current) openRow = null;
  }, []);

  if (!enabled) return <>{children}</>;

  function down(e: React.PointerEvent) {
    if (e.button > 0 || !e.isPrimary) return;
    const target = e.target as Element;
    // Alleen op het nummer of het voorschrift; een open rij sluit ook met een tik elders in de rij.
    if (!target.closest('[data-swipe-zone]') && !isOpen.current) return;
    const stop = target.closest('button, input, textarea, select, [role="switch"]');
    if (stop && !stop.hasAttribute('data-swipe-ok')) return;
    const s = g.current;
    s.id = e.pointerId;
    s.x = e.clientX;
    s.y = e.clientY;
    s.axis = 'undecided';
    s.wasOpen = isOpen.current;
    s.start = isOpen.current ? -OPEN_PX : 0;
    // De enige meting: de breedte, bij het neerzetten (offsetWidth, geen transform erin).
    s.width = wrap.current?.offsetWidth || 320;
    s.reach = e.clientX - s.start;
    s.zone = zoneAt(s.start, s.width, s.wasOpen, s.reach);
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
        // De rij claimt het gebaar: vanaf nu komt elke beweging hier, ook buiten de rij.
        try { front.current?.setPointerCapture(e.pointerId); } catch { /* geen capture, dan volgt hij zonder */ }
        s.swallow = true;
        swiping(true);
      }
    }
    if (s.axis !== 'horizontal') return;
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.vel = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    s.now = followOffset(dx, s.start, s.width);
    const zone = zoneAt(s.now, s.width, s.wasOpen, s.reach);
    if (zone !== s.zone) {
      if (zone !== 'closed') haptics.tap();
      s.zone = zone;
    }
    schedule();
  }

  function up(e: React.PointerEvent) {
    const s = g.current;
    if (!s.live || e.pointerId !== s.id) return;
    s.live = false;
    flush();
    if (s.axis === 'undecided') {
      // Een tik op een open rij sluit hem, zonder dat de tik ook nog iets in de rij doet.
      if (s.wasOpen) {
        s.swallow = true;
        close();
      }
      return;
    }
    if (s.axis !== 'horizontal') return;
    swiping(false);
    const end = swipeEnd(s.now, s.width, s.vel, s.wasOpen, s.reach);
    if (end === 'delete') remove(-restOffset('delete', s.width));
    else if (end === 'open') openIt();
    else close();
  }

  function cancel(e: React.PointerEvent) {
    const s = g.current;
    if (!s.live || e.pointerId !== s.id) return;
    s.live = false;
    flush();
    if (s.axis === 'horizontal') {
      swiping(false);
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
      {/* Rechts naast de rij, even breed; schuift met de rij mee in beeld. De knop staat aan de kant van de rij. */}
      <div ref={back} className="absolute inset-y-0 left-full flex w-full" style={{ background: 'var(--color-danger)' }} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label={`Set ${label} verwijderen`}
          onClick={() => {
            haptics.tap();
            remove(wrap.current?.offsetWidth || g.current.width || 320);
          }}
          className="flex h-full min-h-[44px] shrink-0 items-center justify-center"
          style={{ width: OPEN_PX, color: 'var(--color-ink)' }}
        >
          <Icon name="minrond" size={26} />
        </button>
      </div>
      <div ref={front} className="swipe-front" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        {children}
      </div>
    </div>
  );
}
