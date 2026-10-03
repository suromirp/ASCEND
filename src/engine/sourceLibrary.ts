// ASCEND — one local library of every source the app's advice rests on
// (production feedback: "alle bronnen in de app [...] één lokale plek [...]
// voor verschillende adviezen"). Nothing new is stored: this collects the
// sources already cited across the training guide, Garmin guide, GR5
// ladder, alternatives per session and the evidence registry behind the
// rules, merges duplicates by URL, and records where each one is used.

import { TRAINING_GUIDES } from '../data/trainingGuide';
import { GARMIN_DATA_SCREENS, GARMIN_METRICS, GARMIN_STRAP_USAGE, GARMIN_ZONE_SETUP } from '../data/garminGuide';
import { GR5_MILESTONE_DETAILS, GR5_PACKING_SOURCES, GR5_TRAINING_SPLIT_SOURCES } from '../data/gr5Details';
import { MODALITIES_BY_TEMPLATE } from '../data/modalities';
import { EVIDENCE_REGISTRY } from '../data/evidenceRegistry';
import { ALGORITHM_RULES } from '../data/algorithmRules';
import { RESEARCH_SOURCES } from '../data/researchSources';
import { TRAINING_SPOTS } from '../data/trainingSpots';
import type { PublicationType } from '../models/evidence';

export type SourceCategory = 'wetenschap' | 'garmin' | 'macrofactor' | 'bergsport' | 'training';

export const CATEGORY_LABEL: Record<SourceCategory, string> = {
  wetenschap: 'Wetenschap',
  training: 'Training en coaching',
  bergsport: 'Bergsport en route',
  garmin: 'Garmin',
  macrofactor: 'MacroFactor',
};

export interface LibrarySource {
  key: string;
  title: string;
  publisher: string;
  url?: string;
  category: SourceCategory;
  // "Systematische review · 2025 · Frandsen JSB et al."
  meta?: string;
  // The original (often English) title, when the app shows a Dutch one.
  originalTitle?: string;
  usedIn: string[];
}

const PUBLICATION_LABEL: Record<PublicationType, string> = {
  systematic_review: 'Systematische review',
  meta_analysis: 'Meta-analyse',
  rct: 'Gerandomiseerde studie',
  cohort_study: 'Cohortstudie',
  cross_sectional: 'Dwarsdoorsnedestudie',
  case_series: 'Casusreeks',
  consensus_statement: 'Consensusverklaring',
  other: 'Publicatie',
};

function categoryOf(url: string | undefined, publisher: string): SourceCategory {
  const u = (url ?? '').toLowerCase();
  const p = publisher.toLowerCase();
  if (u.includes('pubmed') || u.includes('ncbi.nlm') || u.includes('doi.org') || u.includes('bjsm') || u.includes('springer') || u.includes('frontiersin') || u.includes('journals.') || p === 'pubmed') return 'wetenschap';
  if (u.includes('garmin') || p.startsWith('garmin')) return 'garmin';
  if (u.includes('macrofactor') || p.startsWith('macrofactor')) return 'macrofactor';
  if (u.includes('nkbv') || u.includes('ffrandonnee') || u.includes('grande-traversee') || p.startsWith('gr5') || p.startsWith('nkbv') || p.startsWith('ffrandonn')) return 'bergsport';
  return 'training';
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

// "PubMed — trainingsintensiteit bij afstandslopers" → publisher + title.
function splitLabel(label: string): { publisher: string; title: string } {
  const [head, ...rest] = label.split(' — ');
  if (rest.length === 0) return { publisher: '', title: label };
  const title = rest.join(' — ');
  return { publisher: head, title: title.charAt(0).toUpperCase() + title.slice(1) };
}

// "HEURISTIC-RUNNING-PROGRESSION-BANDS" → "running progression bands".
function readableRule(ruleId: string): string {
  return ruleId.replace(/^(HEURISTIC|RULE)-/, '').replace(/-\d+$/, '').replace(/-/g, ' ').toLowerCase();
}

// A link to a site's front page cites nothing specific.
const GENERIC = new Set(['https://pubmed.ncbi.nlm.nih.gov']);

export function buildSourceLibrary(templateName: (id: string) => string): LibrarySource[] {
  const byKey = new Map<string, LibrarySource>();

  const add = (label: string, url: string | undefined, usedIn: string) => {
    if (url && GENERIC.has(normalizeUrl(url))) return;
    const key = url ? normalizeUrl(url) : label.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.usedIn.includes(usedIn)) existing.usedIn.push(usedIn);
      return;
    }
    const { publisher, title } = splitLabel(label);
    byKey.set(key, { key, title, publisher, url, category: categoryOf(url, publisher), usedIn: [usedIn] });
  };

  for (const [templateId, guide] of Object.entries(TRAINING_GUIDES)) {
    for (const s of guide.sources) add(s.label, s.url, `Trainingsgids: ${templateName(templateId)}`);
  }
  for (const card of [GARMIN_ZONE_SETUP, GARMIN_STRAP_USAGE, GARMIN_DATA_SCREENS, GARMIN_METRICS]) {
    const heading = card.heading.charAt(0) + card.heading.slice(1).toLowerCase();
    for (const s of card.sources) add(s.label, s.url, `Garmin-gids: ${heading}`);
  }
  for (const detail of Object.values(GR5_MILESTONE_DETAILS)) {
    for (const s of detail.sources) add(s.label, s.url, `GR5-ladder: ${detail.subtitle}`);
  }
  for (const s of GR5_PACKING_SOURCES) add(s.label, s.url, 'GR5: paklijst');
  for (const s of GR5_TRAINING_SPLIT_SOURCES) add(s.label, s.url, 'GR5: verdeling kracht en duur');
  for (const [templateId, modalities] of Object.entries(MODALITIES_BY_TEMPLATE)) {
    for (const m of modalities) {
      for (const s of m.sources ?? []) add(s.label, s.url, `Alternatief bij ${templateName(templateId)}: ${m.label}`);
    }
  }
  for (const spot of TRAINING_SPOTS) {
    for (const src of spot.sources) add(src.label.includes(' — ') ? src.label : `${src.label.split(',')[0]} — ${src.label.split(',').slice(1).join(',').trim() || src.label}`, src.url, `Trainingsplek: ${spot.name}`);
  }
  for (const r of RESEARCH_SOURCES) {
    const key = normalizeUrl(r.url);
    const existing = byKey.get(key);
    if (existing) {
      for (const u of r.usedIn) if (!existing.usedIn.includes(u)) existing.usedIn.push(u);
      existing.meta ??= r.meta;
    } else {
      byKey.set(key, { key, title: r.title, publisher: r.publisher, url: r.url, category: r.category, meta: r.meta, usedIn: [...r.usedIn] });
    }
  }

  // The evidence registry: full titles and study type, plus the rules
  // that rest on each study.
  const rulesByEvidence = new Map<string, string[]>();
  for (const rule of ALGORITHM_RULES) {
    for (const ref of rule.evidenceRefs) rulesByEvidence.set(ref, [...(rulesByEvidence.get(ref) ?? []), rule.ruleId]);
  }
  for (const e of EVIDENCE_REGISTRY) {
    const key = normalizeUrl(e.url);
    const meta = [PUBLICATION_LABEL[e.publicationType], e.year, e.authors].filter(Boolean).join(' · ');
    const usedIn = (rulesByEvidence.get(e.id) ?? []).map((id) => `Planningsregel: ${readableRule(id)}`);
    const existing = byKey.get(key);
    if (existing) {
      existing.meta ??= meta;
      existing.originalTitle ??= e.title;
      for (const u of usedIn) if (!existing.usedIn.includes(u)) existing.usedIn.push(u);
    } else {
      byKey.set(key, {
        key, title: e.title, publisher: 'PubMed', url: e.url, category: 'wetenschap', meta,
        usedIn: usedIn.length > 0 ? usedIn : ['Achtergrond: planningsregels van ASCEND'],
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

export function searchSources(sources: LibrarySource[], query: string, category?: SourceCategory): LibrarySource[] {
  const q = query.trim().toLowerCase();
  return sources.filter((s) => {
    if (category && s.category !== category) return false;
    if (!q) return true;
    return [s.title, s.publisher, s.originalTitle ?? '', s.meta ?? '', ...s.usedIn].some((t) => t.toLowerCase().includes(q));
  });
}
