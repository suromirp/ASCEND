// Vitest runs in plain Node — no browser, so no real IndexedDB. Every
// storage-layer test (export/import round-trip, etc.) goes through
// storage/database.ts's real idb-based repos, so they need a working
// `indexedDB` global to open against. fake-indexeddb/auto installs that
// global before any test file runs.
import 'fake-indexeddb/auto';
