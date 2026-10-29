// De vaste doorloop: elke tab op 360 en 390 px, afdruk, audit en console. Gebruik:
//   node .claude/skills/lookout/kit/doorloop.mjs [tab ...]   (standaard alle vijf en Forge)
import { open, audit, startForge, F, BASE } from './lib.mjs';

const TABS = { vandaag: '#/', week: '#/week', stand: '#/stand', ascend: '#/ascend', logboek: '#/history' };
const asked = process.argv.slice(2);
const list = asked.length > 0 ? asked : [...Object.keys(TABS), 'forge'];
for (const w of [360, 390]) {
  for (const tab of list) {
    const o = tab === 'forge' ? await startForge(w) : await open(w);
    if (tab !== 'forge') { await o.page.goto(BASE + TABS[tab]); await o.page.waitForTimeout(3000); }
    await o.page.screenshot({ path: `${F}${tab}-${w}.png`, fullPage: tab !== 'forge' });
    const a = await audit(o.page);
    console.log(`[${w}] ${tab}: overloop ${a.overflow}, klein ${a.small.length}, te kleine tekst ${a.tiny.length}, console ${o.errs.length}`);
    for (const e of o.errs) console.log(`   ${e}`);
    await o.browser.close();
  }
}
