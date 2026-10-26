import { createContext } from 'react';

// Naar welke rij de pagina springt (zoeken, een link vanaf een andere pagina). Een
// rij onder Geavanceerd klapt dan eerst open (SettingsSection).
export const SettingsJumpContext = createContext<{ target?: string }>({});

// Welke rijen van deze groep een instelling hebben die anders staat dan het advies
// (engine/settingsAvailability.ts#adjustedRows). Een rij met zo'n instelling krijgt het kleine
// label "aangepast".
export const SettingsAdjustedContext = createContext<ReadonlySet<string>>(new Set());
