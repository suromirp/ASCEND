// Vaste testset van Lookout: een browser op telefoonmaat met 4x vertraagde processor, echte touch,
// een nagemaakte stand (kracht-demoprogramma) en een audit op tikdoelen, kleine tekst en overloop.
// Instellen met omgevingsvariabelen: LOOKOUT_PORT (standaard 4697), LOOKOUT_SHOTS (map voor afdrukken).
// De stand hoort bij een origin met poort: een andere poort krijgt een omgezette kopie.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PORT = Number(process.env.LOOKOUT_PORT ?? 4697);
export const F = (process.env.LOOKOUT_SHOTS ?? join(process.cwd(), 'shots')) + '/';
mkdirSync(F, { recursive: true });
export const BASE = `http://localhost:${PORT}/ascend/`;

function stateFor(port) {
  const raw = readFileSync(join(HERE, 'state-kracht.json'), 'utf8');
  if (port === 4697) return join(HERE, 'state-kracht.json');
  const out = join(F, `state-${port}.json`);
  writeFileSync(out, raw.replaceAll('localhost:4697', `localhost:${port}`));
  return out;
}

export async function open(w, opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, storageState: stateFor(PORT), ...opts });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  return { browser, ctx, page, cdp, errs, BASE };
}

// Opent Forge op Bovenlichaam A van volgende week via "Vandaag al doen".
export async function startForge(w, opts) {
  const o = await open(w, opts);
  const { page } = o;
  await page.goto(BASE + '#/week'); await page.waitForTimeout(3500);
  await page.locator('[aria-label*="olgende"]').first().tap(); await page.waitForTimeout(1500);
  const r = page.locator('button[data-sheet-from]:has-text("Bovenlichaam")').first();
  await r.scrollIntoViewIfNeeded(); await r.tap(); await page.waitForTimeout(1000);
  await page.locator('[role=dialog] >> text=Vandaag al doen').first().tap(); await page.waitForTimeout(2500);
  return o;
}

// Tikdoelen onder 44 px, tekst onder 12 px, horizontale overloop.
export async function audit(page, rootSel) {
  return await page.evaluate((rootSel) => {
    const out = { overflow: document.documentElement.scrollWidth > innerWidth, small: [], tiny: [] };
    const root = (rootSel && document.querySelector(rootSel)) || document.body;
    root.querySelectorAll('button,a,[role=button],input').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.height < 43.5 || r.width < 43.5)) out.small.push((e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
    root.querySelectorAll('*').forEach((e) => { if (e.children.length === 0 && e.textContent.trim()) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12 && e.getBoundingClientRect().width > 0) out.tiny.push(e.textContent.trim().slice(0, 20) + ' ' + fs); } });
    return out;
  }, rootSel);
}

// Echte touch via CDP: van (x0,y0) naar (x1,y1) in n stappen met ms per stap.
export async function swipe(cdp, page, x0, y0, x1, y1, n = 12, ms = 16) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await page.waitForTimeout(ms); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export const rowIds = (page) => page.evaluate(() => [...document.querySelectorAll('[data-row-id]')].map((r) => r.dataset.rowId));
