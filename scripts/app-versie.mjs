// ASCEND: schrijft app-versie.json voor de live update van de Android-app
// (docs/beslissingen/2026-11-01-android-app.md, src/engine/liveUpdate.ts).
//
// Gebruik: node scripts/app-versie.mjs <zip> <site-map>
// De zip staat al in de site-map (bijvoorbeeld dist/app/ascend-web-<versie>.zip); dit script rekent
// zijn SHA-256 uit en zet app-versie.json in de hoofdmap van de site. De versie komt uit GITHUB_SHA,
// de bouwtijd uit ASCEND_BUILD_TIME (dezelfde als in de build), het native niveau uit
// android/native-level.txt.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, join } from 'node:path';

const [zip, site] = process.argv.slice(2);
if (!zip || !site) {
  console.error('Gebruik: node scripts/app-versie.mjs <zip> <site-map>');
  process.exit(1);
}
const builtAt = process.env.ASCEND_BUILD_TIME;
if (!builtAt) {
  console.error('ASCEND_BUILD_TIME ontbreekt; geef dezelfde tijd mee als aan de build.');
  process.exit(1);
}
const version = (process.env.GITHUB_SHA ?? 'lokaal').slice(0, 7);
const minNative = Number(readFileSync(new URL('../android/native-level.txt', import.meta.url), 'utf8').trim());
const sha256 = createHash('sha256').update(readFileSync(zip)).digest('hex');
const bundle = relative(site, zip).split('\\').join('/');
const out = { version, builtAt, minNative, bundle, sha256 };
writeFileSync(join(site, 'app-versie.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`app-versie.json: ${version}, native ${minNative}, ${bundle}`);
