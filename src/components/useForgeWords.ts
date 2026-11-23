import { useAppData } from '../state/AppDataContext';
import { resolveForgeWords, type ForgeWords } from '../engine/forgeWords';

// De woorden in Forge uit de instellingen (instelling Woorden in Forge): gewoon, of de vaktaal.
export function useForgeWords(): ForgeWords {
  const { settings } = useAppData();
  return resolveForgeWords(settings.strengthModel?.words);
}
