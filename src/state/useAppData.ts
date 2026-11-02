// De context van de app en de hook die hem leest. De provider staat in AppDataProvider.tsx.

import { createContext, useContext } from 'react';
import type { AppData } from './appDataTypes';

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
