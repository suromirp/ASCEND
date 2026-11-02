import { createContext } from 'react';
import type { SettingsPageId } from '../../data/settingsLayout';

// Naar welke rij de pagina springt (zoeken, een link vanaf een andere pagina). Een
// rij onder Geavanceerd staat op een eigen pagina; de groepspagina stuurt er dan heen.
export const SettingsJumpContext = createContext<{ target?: string }>({});

// Welke rijen van deze groep een instelling hebben die anders staat dan het advies
// (engine/settingsAvailability.ts#adjustedRows). Een rij met zo'n instelling krijgt het kleine
// label "aangepast".
export const SettingsAdjustedContext = createContext<ReadonlySet<string>>(new Set());

// Op welke pagina van de groep we zijn: de groep zelf of haar pagina Geavanceerd. Een sectie met
// `advanced` toont op de groep één rij die naar Geavanceerd gaat, en op Geavanceerd alleen die rijen.
export const SettingsAdvancedContext = createContext<{ page?: SettingsPageId; onAdvanced: boolean }>({ onAdvanced: false });
