// ASCEND: haalt het spoor van de GR5 (Grande Traversée des Alpes) uit OpenStreetMap en snijdt het in
// de 36 etappes van src/data/gr5Stages.ts. Eenmalig te draaien, herhaalbaar; het script hoort niet in
// de app. Besluit: docs/beslissingen/2026-11-11-gr5-uit-osm.md.
//
//   NODE_USE_ENV_PROXY=1 node scripts/gr5-osm/haal-gr5.mjs            (achter een proxy)
//   node scripts/gr5-osm/haal-gr5.mjs --zonder-hoogte                 (geen hoogte ophalen)
//   node scripts/gr5-osm/haal-gr5.mjs --cache /pad/naar/map            (eigen map voor de downloads)
//
// Bronnen, elk alleen lezend en met een pauze tussen de aanroepen:
// - OSM-API (api.openstreetmap.org): de superroute 2704286 en de zes delen ervan, met alle wegen en
//   knopen (/relation/<id>/full). Overpass was vanuit de bouwomgeving niet bereikbaar; de OSM-API
//   geeft dezelfde gegevens.
// - OSM-API: de grenspunten, als vaste OSM-objecten (hut, gehucht, het centrum van een gemeente).
//   De id's staan hieronder; ze zijn eenmalig opgezocht met Nominatim.
// - OpenTopoData (api.opentopodata.org, EU-DEM 25 m): de hoogte. Hoogstens 100 punten per aanroep
//   en een aanroep per seconde, de regels van de openbare dienst.
//
// Uit: src/data/gr5StageEnds.ts (begin, eind en de cijfers van OSM per etappe, klein, in de bundel)
// en src/data/gr5StagePaths.ts (het vereenvoudigde spoor, apart te laden met een dynamische import).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const withElevation = !args.includes('--zonder-hoogte');
const cacheArg = args.indexOf('--cache');
// Buiten de repo, zodat `npm ci` de downloads niet weggooit en niets ervan in git komt.
const CACHE = cacheArg >= 0 ? args[cacheArg + 1] : join(tmpdir(), 'ascend-gr5-osm');
const UA = 'ascend-route-data-script/1.0 (eenmalig, openbare routedata)';

const SUPERROUTE = 2704286;
// De delen van de superroute in volgorde, alleen de hoofdroute (rol leeg). De variante Montchavin
// (16065682, rol alternative) doet niet mee.
// Vereenvoudiging: Douglas-Peucker met 5 m (GR5_DP_M om te proberen). Zie het besluit voor de keuze.
const DP_TOLERANCE_M = Number(process.env.GR5_DP_M ?? 5);
// Voor de stijging en daling: elke 50 m een punt langs het volle spoor.
const ELEVATION_STEP_M = 50;
// Onder deze stap telt een stijging niet mee (zelfde dode band als engine/routeGeometry.ts).
const DEAD_BAND_M = 5;

// De 35 grenzen tussen de etappes, in volgorde: na etappe 1 (t1e1) tot na etappe 35 (t4e8).
// Begin en eind van de hele route zijn begin en eind van het OSM-spoor.
const BOUNDARIES = [
  ['chalets de Bise', 'node', 5731766894],
  ['refuge de Trébentaz', 'way', 66913092],
  ['refuge de Chésery', 'way', 708069503],
  ['refuge de la Golèse', 'way', 126621147],
  ['Salvagny', 'node', 3030692315],
  ['refuge de Moëde Anterne', 'way', 191253055],
  ['Les Houches', 'node', 1744277791],
  ['refuge du Fioux', 'node', 5856933885],
  ['refuge de Nant-Borrant', 'way', 98063753],
  ['refuge du Plan de la Lai', 'way', 305700835],
  ['refuge de la Balme (Tarentaise)', 'way', 208039495],
  ['Peisey-Nancroix', 'node', 41645529],
  ['refuge du col du Palet', 'way', 184939055],
  ['refuge de la Leisse', 'node', 606374063, { vanoise: true }],
  ['refuge de l\'Arpont', 'way', 1068984940, { windowM: 150000 }],
  ['refuge de Plan Sec', 'way', 112147855],
  ['Modane', 'node', 26695251],
  ['refuge du Thabor', 'way', 243644031],
  ['Plampinet', 'node', 317038530],
  ['Montgenèvre', 'node', 294778417],
  ['Briançon', 'node', 26692531],
  ['Brunissard', 'node', 861233327],
  ['Château-Queyras', 'node', 285065989],
  ['Ceillac', 'node', 840409735],
  ['Maljasset', 'node', 839698047],
  ['Fouillouse', 'node', 1851275861],
  ['Larche', 'node', 301804346],
  ['Bousiéyas', 'node', 932353122],
  ['Saint-Étienne-de-Tinée', 'node', 36266381],
  ['Roya', 'node', 1576113335],
  ['refuge de Longon', 'node', 1438724461],
  ['Saint-Sauveur-sur-Tinée', 'node', 492068128],
  ['Saint-Dalmas-Valdeblore', 'node', 997383139],
  ['Utelle', 'node', 1577099126],
  ['Levens', 'node', 26694375],
];
// Tussen Tignes en de Arpont volgt de hoofdroute van de superroute het oude tracé over Val d'Isère,
// de col de l'Iseran en Bonneval, terwijl de etappelijst over de col de la Leisse gaat. Etappe t2e7 en
// t2e8 komen daarom uit de GR 55 La Vanoise (377905), met twee wegen die de GR 55 aan de GTA knopen:
// 39149460 en 1313069263 in Tignes (samen 120 m) en 31815568 bij Entre-Deux-Eaux (1,8 km). Het pad
// is de kortste weg over alleen deze routewegen, van hut naar hut.
const VANOISE = { stages: ['t2e7', 't2e8'], relations: [20623406, 377905, 20623405], ways: [39149460, 1313069263, 31815568] };

// Etappe-id's in volgorde, gelijk aan GR5_STAGES.
const SECTION_COUNTS = [7, 10, 10, 9];
const STAGE_IDS = SECTION_COUNTS.flatMap((n, s) => Array.from({ length: n }, (_, i) => `t${s + 1}e${i + 1}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(name, url, pauseMs = 1500) {
  const file = join(CACHE, name);
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  await sleep(pauseMs);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const text = await res.text();
  await writeFile(file, text);
  return JSON.parse(text);
}

const osm = (path) => cached(path.replace(/\//g, '_') + '.json', `https://api.openstreetmap.org/api/0.6/${path}.json`);

// --- meetkunde --------------------------------------------------------------------------------------
const RAD = Math.PI / 180;
function meters(a, b) {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const length = (line) => line.reduce((s, p, i) => (i ? s + meters(line[i - 1], p) : 0), 0);

// Plek p op stuk a-b, in een vlakke benadering: [afstand in m, t].
function projectSegment(p, a, b) {
  const kLon = Math.cos(p[0] * RAD);
  const ax = (a[1] - p[1]) * kLon, ay = a[0] - p[0];
  const bx = (b[1] - p[1]) * kLon, by = b[0] - p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return [meters(p, q), t, q];
}

// Douglas-Peucker in meters, met een stapel in plaats van recursie.
function simplify(line, tol) {
  if (line.length <= 2) return line.slice();
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let best = -1, bestD = 0;
    for (let k = i + 1; k < j; k++) {
      const [d] = projectSegment(line[k], line[i], line[j]);
      if (d > bestD) { bestD = d; best = k; }
    }
    if (best >= 0 && bestD > tol) {
      keep[best] = 1;
      stack.push([i, best], [best, j]);
    }
  }
  return line.filter((_, k) => keep[k]);
}

// Elke `step` meter een punt langs de lijn (begin en eind erbij).
function resample(line, step) {
  const out = [line[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const d = meters(a, b);
    let pos = step - carry;
    while (pos <= d) {
      const t = pos / d;
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      pos += step;
    }
    carry = (carry + d) % step;
  }
  out.push(line[line.length - 1]);
  return out;
}

function climb(ele) {
  let up = 0, down = 0, anchor;
  for (const e of ele) {
    if (e === null || e === undefined) continue;
    if (anchor === undefined) anchor = e;
    else if (e >= anchor + DEAD_BAND_M) { up += e - anchor; anchor = e; }
    else if (e <= anchor - DEAD_BAND_M) { down += anchor - e; anchor = e; }
  }
  return { up: Math.round(up), down: Math.round(down) };
}

// --- de route ---------------------------------------------------------------------------------------
async function routeLine() {
  const sup = (await osm(`relation/${SUPERROUTE}`)).elements[0];
  const parts = sup.members.filter((m) => m.type === 'relation' && m.role === '').map((m) => m.ref);
  const line = [];
  const gaps = [];
  for (const rid of parts) {
    const els = (await osm(`relation/${rid}/full`)).elements;
    const nodes = new Map(els.filter((e) => e.type === 'node').map((e) => [e.id, [e.lat, e.lon]]));
    const ways = new Map(els.filter((e) => e.type === 'way').map((e) => [e.id, e]));
    const rel = els.find((e) => e.type === 'relation' && e.id === rid);
    const seq = rel.members.filter((m) => m.type === 'way' && m.role === '').map((m) => ways.get(m.ref).nodes.map((n) => nodes.get(n)));
    for (let i = 0; i < seq.length; i++) {
      let w = seq[i];
      if (line.length === 0) {
        // De eerste weg: de kant die het dichtst bij de volgende weg ligt is het eind.
        const nx = seq[i + 1];
        const dStart = Math.min(meters(w[0], nx[0]), meters(w[0], nx.at(-1)));
        const dEnd = Math.min(meters(w.at(-1), nx[0]), meters(w.at(-1), nx.at(-1)));
        if (dStart < dEnd) w = w.slice().reverse();
        line.push(...w);
        continue;
      }
      const last = line.at(-1);
      if (meters(last, w.at(-1)) < meters(last, w[0])) w = w.slice().reverse();
      const gap = meters(last, w[0]);
      if (gap > 30) gaps.push({ relation: rid, way: i, gapM: Math.round(gap) });
      line.push(...(gap < 1 ? w.slice(1) : w));
    }
  }
  return { line, parts, gaps };
}

// Een graaf van de wegen in de Vanoise: de twee delen van de GTA rond de Vanoise, de GR 55 en de
// verbindende wegen. Alleen voor de kortste weg tussen twee hutten; geen andere wegen doen mee.
async function vanoiseGraph() {
  const nodes = new Map();
  const adj = new Map();
  const addWay = (ids) => {
    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1], b = ids[i];
      if (!nodes.has(a) || !nodes.has(b)) continue;
      const d = meters(nodes.get(a), nodes.get(b));
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push([b, d]);
      adj.get(b).push([a, d]);
    }
  };
  const load = (els, keepWay) => {
    for (const e of els) if (e.type === 'node') nodes.set(e.id, [e.lat, e.lon]);
    for (const e of els) if (e.type === 'way' && keepWay(e.id)) addWay(e.nodes);
  };
  for (const rid of VANOISE.relations) {
    const els = (await osm(`relation/${rid}/full`)).elements;
    const rel = els.find((e) => e.type === 'relation' && e.id === rid);
    const main = new Set(rel.members.filter((m) => m.type === 'way' && m.role === '').map((m) => m.ref));
    load(els, (id) => main.has(id));
  }
  for (const wid of VANOISE.ways) load((await osm(`way/${wid}/full`)).elements, (id) => id === wid);

  return {
    nearest(p) {
      let best = { id: undefined, d: Infinity, q: undefined };
      for (const id of adj.keys()) {
        const d = meters(p, nodes.get(id));
        if (d < best.d) best = { id, d, q: nodes.get(id) };
      }
      return best;
    },
    // Dijkstra met een eenvoudige binaire hoop.
    shortest(a, b) {
      const dist = new Map([[a, 0]]);
      const prev = new Map();
      const heap = [[0, a]];
      const push = (x) => {
        heap.push(x);
        let i = heap.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (heap[p][0] <= heap[i][0]) break;
          [heap[p], heap[i]] = [heap[i], heap[p]];
          i = p;
        }
      };
      const pop = () => {
        const top = heap[0];
        const last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
            if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
            if (m === i) break;
            [heap[m], heap[i]] = [heap[i], heap[m]];
            i = m;
          }
        }
        return top;
      };
      while (heap.length) {
        const [d, u] = pop();
        if (d > (dist.get(u) ?? Infinity)) continue;
        if (u === b) break;
        for (const [v, w] of adj.get(u) ?? []) {
          if (d + w < (dist.get(v) ?? Infinity)) {
            dist.set(v, d + w);
            prev.set(v, u);
            push([d + w, v]);
          }
        }
      }
      if (!dist.has(b)) throw new Error(`Geen weg in de Vanoise van ${a} naar ${b}`);
      const out = [b];
      while (out.at(-1) !== a) out.push(prev.get(out.at(-1)));
      return out.reverse().map((id) => nodes.get(id));
    },
  };
}

async function boundaryPoint(type, id) {
  if (type === 'node') {
    const n = (await osm(`node/${id}`)).elements[0];
    return [n.lat, n.lon];
  }
  const els = (await osm(`way/${id}/full`)).elements.filter((e) => e.type === 'node');
  return [els.reduce((s, e) => s + e.lat, 0) / els.length, els.reduce((s, e) => s + e.lon, 0) / els.length];
}

// De plek op het spoor die het dichtst bij p ligt, vanaf stuk `from` en hoogstens `windowM` verder.
function snap(line, cum, p, from, windowM) {
  let best = { d: Infinity, i: from, t: 0, q: line[from] };
  for (let i = from; i < line.length - 1 && cum[i] - cum[from] < windowM; i++) {
    const [d, t, q] = projectSegment(p, line[i], line[i + 1]);
    if (d < best.d) best = { d, i, t, q };
  }
  return best;
}

async function elevations(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const key = batch.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|');
    const name = `ele_${hash(key)}.json`;
    const data = await cached(name, `https://api.opentopodata.org/v1/eudem25m?locations=${key}`, 1100);
    out.push(...data.results.map((r) => (r.elevation === null ? null : Math.round(r.elevation))));
  }
  return out;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

const r5 = (x) => Math.round(x * 1e5) / 1e5;

async function main() {
  await mkdir(CACHE, { recursive: true });
  const { line, parts, gaps } = await routeLine();
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + meters(line[i - 1], line[i]));

  // Grenzen op het spoor, in volgorde. Een grens zoekt alleen verder dan de vorige, tot 60 km (of
  // `windowM`). Een grens in de Vanoise ligt niet op de hoofdroute en krijgt zijn punt uit de graaf.
  const graph = await vanoiseGraph();
  const cuts = [];
  let from = 0;
  for (const [name, type, id, opts = {}] of BOUNDARIES) {
    const p = await boundaryPoint(type, id);
    if (opts.vanoise) {
      const n = graph.nearest(p);
      cuts.push({ name, osm: `${type}/${id}`, offM: Math.round(meters(p, n.q)), node: n.id, q: n.q });
      continue;
    }
    const s = snap(line, cum, p, from, opts.windowM ?? 60000);
    cuts.push({ name, osm: `${type}/${id}`, offM: Math.round(s.d), i: s.i, q: s.q });
    from = s.i;
  }

  const stages = [];
  let start = { i: 0, q: line[0] };
  for (let k = 0; k < STAGE_IDS.length; k++) {
    const end = k < cuts.length ? cuts[k] : { i: line.length - 2, q: line.at(-1) };
    let full;
    if (VANOISE.stages.includes(STAGE_IDS[k])) {
      // Van hut naar hut over de routewegen; het begin en eind op de hoofdroute komen erbij.
      const a = start.node ?? graph.nearest(start.q).id;
      const b = end.node ?? graph.nearest(end.q).id;
      const via = graph.shortest(a, b);
      full = [start.q, ...via, end.q];
    } else {
      full = [start.q, ...line.slice(start.i + 1, end.i + 1), end.q];
    }
    full = full.filter((p, i) => i === 0 || meters(full[i - 1], p) > 0.01);
    const path = simplify(full, DP_TOLERANCE_M);
    stages.push({ id: STAGE_IDS[k], full, path, boundary: cuts[k] });
    start = end;
  }

  for (const s of stages) {
    s.km = length(s.full) / 1000;
    s.pathKm = length(s.path) / 1000;
    if (withElevation) {
      s.ele = await elevations(s.path);
      const dense = await elevations(resample(s.full, ELEVATION_STEP_M));
      Object.assign(s, climb(dense));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const header = `// GEMAAKT DOOR scripts/gr5-osm/haal-gr5.mjs op ${today}. Niet met de hand aanpassen; draai het script opnieuw.
// Routedata © OpenStreetMap contributors, beschikbaar onder de Open Database License (ODbL),
// https://www.openstreetmap.org/copyright. Superroute ${SUPERROUTE}, delen ${parts.join(', ')}.
${withElevation ? '// Hoogte: EU-DEM 25 m via OpenTopoData (Copernicus Land Monitoring Service, Europese Unie).\n' : ''}// Besluit: docs/beslissingen/2026-11-11-gr5-uit-osm.md.
`;

  const ends = stages.map((s) => {
    const a = s.path[0], b = s.path.at(-1);
    const fields = [`start: { lat: ${r5(a[0])}, lon: ${r5(a[1])} }`, `end: { lat: ${r5(b[0])}, lon: ${r5(b[1])} }`, `km: ${s.km.toFixed(1)}`];
    if (withElevation) fields.push(`up: ${s.up}`, `down: ${s.down}`);
    return `  ${s.id}: { ${fields.join(', ')} },`;
  });
  await writeFile(join(ROOT, 'src/data/gr5StageEnds.ts'), `${header}
// Begin en eind van elke etappe op het OSM-spoor, met de afstand en (als die er is) de stijging en
// daling volgens dat spoor. Klein: dit staat in de gewone bundel.

export const GR5_OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const GR5_OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright';
export const GR5_OSM_RELATION = ${SUPERROUTE};
export const GR5_OSM_TAKEN_ON = '${today}';

export interface Gr5StageEnds {
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
  // Volgens het volle OSM-spoor, voor de vereenvoudiging.
  km: number;
  up?: number;
  down?: number;
}

export const GR5_STAGE_ENDS: Record<string, Gr5StageEnds> = {
${ends.join('\n')}
};
`);

  const paths = stages.map((s) => {
    const flat = s.path.flatMap((p, i) => (withElevation ? [r5(p[0]), r5(p[1]), s.ele[i] ?? 'null'] : [r5(p[0]), r5(p[1])]));
    return `  ${s.id}: [${flat.join(',')}],`;
  });
  await writeFile(join(ROOT, 'src/data/gr5StagePaths.ts'), `${header}
// Het vereenvoudigde spoor per etappe (Douglas-Peucker, ${DP_TOLERANCE_M} m), plat achter elkaar:
// ${withElevation ? 'breedte, lengte, hoogte in meters (null als onbekend)' : 'breedte, lengte'}. Groot: laad dit alleen met een dynamische import
// (data/gr5Tracks.ts).

export const GR5_PATH_STRIDE = ${withElevation ? 3 : 2};

export const GR5_STAGE_PATHS: Record<string, readonly (number | null)[]> = {
${paths.join('\n')}
};
`);

  // Verslag voor het besluit.
  console.log(JSON.stringify({ parts, gaps, totalKm: Math.round(cum.at(-1) / 100) / 10, points: line.length }, null, 1));
  for (const s of stages) {
    console.log([s.id, s.boundary ? `${s.boundary.name} (${s.boundary.osm}, ${s.boundary.offM} m)` : 'eind', `${s.km.toFixed(1)} km`, `pad ${s.pathKm.toFixed(1)} km`, `${s.path.length} pt`, withElevation ? `+${s.up} -${s.down}` : ''].join(' | '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
