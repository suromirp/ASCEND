// ASCEND — sources from the training-progression research (October 2026)
// that the app's advice draws on but that aren't cited in a guide yet.
// Filled from the research report; shown in the Bronnen library
// (engine/sourceLibrary.ts) next to every other source.

import type { SourceCategory } from '../engine/sourceLibrary';

export interface ResearchSource {
  title: string;
  publisher: string;
  url: string;
  category: SourceCategory;
  meta?: string;
  usedIn: string[];
}

export const RESEARCH_SOURCES: ResearchSource[] = [];
