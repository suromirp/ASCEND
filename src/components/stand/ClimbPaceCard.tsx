// ASCEND: Je stand, sectie Belasting: je eigen klimtempo met rugzak uit je wandelingen en
// bergtochten (engine/climbPace.ts). Pas een getal na genoeg klimmen; daarvoor één regel met hoeveel
// er al zijn, en zonder een enkele klim niets. Een gewone marine kaart, geen eigen accent.

import { useMemo, type ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { climbPace, climbPaceBasisLine, climbPaceWaitLine, NORM_DOWN_MPH, NORM_UP_MPH } from '../../engine/climbPace';
import { signalOn } from '../../engine/signalSettings';
import { todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow, Stat } from '../ui';

export function ClimbPaceCard({ children }: { children?: ReactNode }) {
  const { sessionLogs, settings } = useAppData();
  const on = signalOn(settings, 'climbPace');
  const state = useMemo(() => (on ? climbPace(sessionLogs, todayISO()) : undefined), [on, sessionLogs]);
  if (!state) return null;
  if (state.state === 'notYet') {
    return (
      <Card className="flex flex-col gap-1">
        <Eyebrow>Klimtempo</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{climbPaceWaitLine(state)}</p>
      </Card>
    );
  }
  const { pace } = state;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Klimtempo</Eyebrow>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Omhoog" value={formatNumberNL(pace.upMph, 0)} unit="m per uur" />
        {pace.downMph !== undefined && <Stat label="Omlaag" value={formatNumberNL(pace.downMph, 0)} unit="m per uur" />}
      </div>
      {pace.downMph === undefined && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Voor omlaag zijn er nog te weinig dalingen; daar geldt de norm.</p>}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{climbPaceBasisLine(pace)}</p>
      {children}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        De wandelnorm rekent met <span className="tabular-nums">{NORM_UP_MPH}</span> meter per uur omhoog en <span className="tabular-nums">{NORM_DOWN_MPH}</span> omlaag. Dit is bewegend, zonder pauzes.
      </p>
    </Card>
  );
}
