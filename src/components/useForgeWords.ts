import { useContext } from 'react';
import { AppDataContext } from '../state/useAppData';
import { resolveForgeWords, type ForgeWords } from '../engine/forgeWords';

// De woorden in Forge uit de instellingen (instelling Woorden in Forge): gewoon, of de vaktaal. Zonder de
// context (een blad dat los staat) gelden de gewone woorden.
export function useForgeWords(): ForgeWords {
  const data = useContext(AppDataContext);
  return resolveForgeWords(data?.settings.strengthModel?.words);
}
