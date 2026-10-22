import type { SettingsFacts } from '../../../engine/settingsSummary';

// Wat elke groepspagina krijgt: de feiten, het blad dat open staat (de sleutel is het
// id van de rij) en een manier om feiten opnieuw in te lezen na een wijziging.
export interface GroupProps {
  facts: SettingsFacts;
  reload: () => void;
  sheet: string | null;
  setSheet: (key: string | null) => void;
}
