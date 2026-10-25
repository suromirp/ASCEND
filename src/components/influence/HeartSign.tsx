import type { SignState } from '../../engine/influence';
import { Icon } from '../icons';

// Het teken bij een training met een hartslag die afwijkt: een kleine hartslaglijn naast de naam,
// op dezelfde plek als het driehoekje van een zware beendag. Amber zolang er niets is ingevuld,
// gedempt zodra je het blad bekeek of iets koos. Nooit de reden zelf.
export function HeartSign({ state }: { state: SignState }) {
  const label = state === 'open' ? 'Hartslag wijkt af, nog niets ingevuld' : 'Hartslag wijkt af, ingevuld of bekeken';
  return (
    <span className="inline-flex shrink-0" style={{ color: state === 'open' ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>
      <Icon name="hartslag" size={16} label={label} />
    </span>
  );
}
