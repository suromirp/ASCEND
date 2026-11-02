// Hoeveel JavaScript de start laadt: het startbestand uit index.html plus alles wat het statisch
// importeert, raw en gzip, en wat pas laadt als je het opent. Controleert ook dat elk stuk in de
// precache van de service worker staat en dat de tekeningen bij oefeningen er buiten blijven.
//   npm run build && node scripts/meten/startbundel.mjs [dist] [aantal regels]
// Zie docs/onderhoud/2026-11-02-sneller.md.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'dist';
const top = Number(process.argv[3] ?? 8);
const html = readFileSync(`${dist}/index.html`, 'utf8');
const entry = html.match(/src="[^"]*assets\/([^"]+\.js)"/)[1];

const start = new Set();
function walk(file) {
  if (start.has(file)) return;
  start.add(file);
  const code = readFileSync(`${dist}/assets/${file}`, 'utf8');
  // Statische imports: import{...}from"./x.js" en import"./x.js". Een import() is lui en telt niet mee.
  for (const m of code.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^'"()]*?from\s*)?["']\.\/([^"']+\.js)["']/g)) walk(m[1]);
}
walk(entry);

const all = readdirSync(`${dist}/assets`).filter((f) => f.endsWith('.js'));
const sum = { raw: 0, gz: 0, lazyRaw: 0, lazyGz: 0 };
const rows = [];
for (const f of all) {
  const bytes = readFileSync(`${dist}/assets/${f}`);
  const gz = gzipSync(bytes, { level: 9 }).length;
  if (start.has(f)) {
    sum.raw += bytes.length;
    sum.gz += gz;
    rows.push([bytes.length, gz, f]);
  } else {
    sum.lazyRaw += bytes.length;
    sum.lazyGz += gz;
  }
}
rows.sort((a, b) => b[0] - a[0]);
const kb = (n) => (n / 1024).toFixed(0);
console.log(`start: ${start.size} bestanden, ${kb(sum.raw)} kB raw, ${kb(sum.gz)} kB gzip`);
for (const [raw, gz, f] of rows.slice(0, top)) console.log(`  ${kb(raw).padStart(6)} kB  ${kb(gz).padStart(5)} kB gzip  ${f}`);
console.log(`lui: ${all.length - start.size} bestanden, ${kb(sum.lazyRaw)} kB raw, ${kb(sum.lazyGz)} kB gzip`);

const sw = readFileSync(`${dist}/sw.js`, 'utf8');
const missing = all.filter((f) => !sw.includes(`assets/${f}`));
console.log(`niet in de precache: ${missing.length ? missing.join(' ') : 'geen'}`);
console.log(`tekeningen in de precache: ${/url:"exercise-art\//.test(sw) ? 'ja, fout' : 'nee'}`);
if (missing.length || /url:"exercise-art\//.test(sw)) process.exitCode = 1;
