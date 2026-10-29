// ASCEND: het kleine kaartje van een oefening toont één stap van de tekening
// (docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen-kaartje.md). Hier het rekenwerk: de omlijning
// van één pad en de vierkante viewBox eromheen. Zuiver en getest; geen DOM.

import type { ExerciseDrawing } from './exerciseArtData';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Hoeveel getallen elke opdracht vraagt; bij een boog (A) staan de vlaggen op plek 4 en 5.
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
const NUM = /^[\s,]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/;
const FLAG = /^[\s,]*([01])/;

// De omlijning van een pad, met de stuurpunten van de bogen erbij (die liggen er nooit buiten, dus het
// vak is hoogstens iets te ruim) en bij een cirkelboog alleen het eindpunt. Null als er niets te meten is.
export function pathBounds(d: string): Bounds | null {
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let any = false;
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (px: number, py: number) => {
    any = true;
    if (px < b.minX) b.minX = px;
    if (px > b.maxX) b.maxX = px;
    if (py < b.minY) b.minY = py;
    if (py > b.maxY) b.maxY = py;
  };
  const read = (re: RegExp): number | null => {
    const m = re.exec(d.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[1]);
  };
  while (i < d.length) {
    const letter = /^[\s,]*([MmLlHhVvCcSsQqTtAaZz])/.exec(d.slice(i));
    if (letter) {
      i += letter[0].length;
      cmd = letter[1];
      if (cmd === 'Z' || cmd === 'z') {
        x = sx;
        y = sy;
        continue;
      }
    } else if (!cmd || cmd === 'z' || cmd === 'Z') {
      break;
    }
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const n = ARGS[lower];
    const a: number[] = [];
    for (let k = 0; k < n; k++) {
      const v = read(lower === 'a' && (k === 3 || k === 4) ? FLAG : NUM);
      if (v === null) return any ? b : null;
      a.push(v);
    }
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (lower) {
      case 'm':
      case 'l':
      case 't':
        x = a[0] + ox;
        y = a[1] + oy;
        add(x, y);
        if (lower === 'm') {
          sx = x;
          sy = y;
          cmd = rel ? 'l' : 'L';
        }
        break;
      case 'h':
        x = a[0] + ox;
        add(x, y);
        break;
      case 'v':
        y = a[0] + oy;
        add(x, y);
        break;
      case 'c':
        add(a[0] + ox, a[1] + oy);
        add(a[2] + ox, a[3] + oy);
        x = a[4] + ox;
        y = a[5] + oy;
        add(x, y);
        break;
      case 's':
      case 'q':
        add(a[0] + ox, a[1] + oy);
        x = a[2] + ox;
        y = a[3] + oy;
        add(x, y);
        break;
      case 'a':
        x = a[5] + ox;
        y = a[6] + oy;
        add(x, y);
        break;
    }
  }
  return any ? b : null;
}

export interface ThumbFrame {
  viewBox: [number, number, number, number];
  d: string;
}

// Een tikje lucht rond het beeld, als deel van de langste kant.
const MARGIN = 0.06;

// Het middelste beeld (stap 2, de tekening staat al in de volgorde van de beweging) met een vierkante
// viewBox om alleen dat pad, gecentreerd. Null als het pad niets heeft om te meten.
export function thumbFrame(drawing: ExerciseDrawing): ThumbFrame | null {
  const d = drawing.frames[1];
  const b = pathBounds(d);
  if (!b) return null;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const side = Math.max(w, h, 1) * (1 + 2 * MARGIN);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { viewBox: [cx - side / 2, cy - side / 2, side, side], d };
}
