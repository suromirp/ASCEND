// ASCEND: Je stand, scherm Belasting, het blad Klimtempo achter zijn rij: je eigen klimtempo met rugzak uit je wandelingen en
// bergtochten (engine/climbPace.ts). Pas een getal na genoeg klimmen; daarvoor één regel met hoeveel
// er al zijn, en zonder een enkele klim niets. Een gewone marine kaart, geen eigen accent.

import { useAppData } from '../../state/AppDataContext';
import { type ClimbPaceState, climbPaceBasisLine, climbPaceWaitLine, goalDayOwnLine, NORM_DOWN_MPH, NORM_UP_MPH, stageTimeEstimate, type HikeDay, type PackOptions } from '../../engine/climbPace';
import { signalOn } from '../../engine/signalSettings';
import { formatNumberNL } from '../../utils/number';
import { Stat } from '../ui';

// `goalDay`: een gewone dag van je hoofddoel, voor de band op je eigen tempo (Etappetijd op je eigen tempo).
export function ClimbPaceBody({ state, goalDay, pack }: { state: ClimbPaceState; goalDay?: HikeDay; pack?: PackOptions }) {
  const { settings } = useAppData();
  const dayLine = goalDay ? goalDayOwnLine(stageTimeEstimate(state, goalDay, { ...pack, on: signalOn(settings, 'stageOwnPace') }), goalDay) : undefined;
  if (state.state === 'notYet') {
    return <p className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{climbPaceWaitLine(state)}</p>;
  }
  const { pace } = state;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Omhoog" value={formatNumberNL(pace.upMph, 0)} unit="m per uur" />
        {pace.downMph !== undefined && <Stat label="Omlaag" value={formatNumberNL(pace.downMph, 0)} unit="m per uur" />}
      </div>
      {pace.downMph === undefined && <p className="text-xs leading-relaxed tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>Voor omlaag zijn er nog te weinig dalingen. Daar geldt de norm.</p>}
      <p className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{climbPaceBasisLine(pace)}</p>
      {dayLine && <p className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{dayLine}</p>}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        De wandelnorm is <span className="tabular-nums">{NORM_UP_MPH}</span> meter per uur omhoog en <span className="tabular-nums">{NORM_DOWN_MPH}</span> omlaag. Dit is bewegend, zonder pauzes.
      </p>
    </div>
  );
}
