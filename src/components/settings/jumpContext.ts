import { createContext } from 'react';

// Naar welke rij de pagina springt (zoeken, een link vanaf een andere pagina). Een
// rij onder Geavanceerd klapt dan eerst open (SettingsSection).
export const SettingsJumpContext = createContext<{ target?: string }>({});
