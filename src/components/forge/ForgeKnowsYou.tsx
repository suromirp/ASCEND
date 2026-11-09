import { useMemo, useState } from 'react';
import { Card, Eyebrow, InfoButton } from '../ui';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';
import { calibrate, exerciseLine, hasAnyData, MIN_SETS } from '../../engine/forgeCalibration';
import type { SessionLog } from '../../models/training';
import { formatShortDateNL } from '../../utils/dates';

// "Hoe goed kent Forge je": drie rustige regels over hoe Forge zich meet aan je eigen trainingen van de laatste vier
// weken (engine/forgeCalibration.ts), en per oefening een blad. Alleen tekst; het verandert je plan en je logs
// nooit (docs/beslissingen/2026-11-09-hoe-goed-kent-forge-je.md).
export function ForgeKnowsYou({ logs, today, bodyKg, estimateUpTo }: { logs: SessionLog[]; today: string; bodyKg: number | undefined; estimateUpTo: number }) {
  const [info, setInfo] = useState(false);
  const [open, setOpen] = useState(false);
  const c = useMemo(() => calibrate({ logs, today, bodyKg, maxToFailure: estimateUpTo }), [logs, today, bodyKg, estimateUpTo]);
  const any = hasAnyData(c);
  return (
    <Card className="flex flex-col gap-2" data-testid="forge-kent-je">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Hoe goed kent Forge je</Eyebrow>
        <InfoButton onClick={() => setInfo((v) => !v)} label={info ? 'Uitleg over Hoe goed kent Forge je sluiten' : 'Uitleg over Hoe goed kent Forge je'} />
      </div>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.prediction}</p>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.adjust}</p>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.strength}</p>
      {c.lines.bias && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c.lines.bias}</p>}
      {!any && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Dit telt vanaf je trainingen in Forge, met het voorschrift dat Forge toen gaf.</p>
      )}
      {info && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Dit meet Forge aan je eigen trainingen van de laatste vier weken, niet aan wat MacroFactor zou voorschrijven; MacroFactor is hier geen scheidsrechter.
        </p>
      )}
      {any && <TextButton onClick={() => setOpen(true)} className="self-start" icon="verder">Per oefening bekijken</TextButton>}
      {open && (
        <Sheet eyebrow="Forge" title="Hoe goed kent Forge je" line={`Sinds ${formatShortDateNL(c.from)}, per oefening.`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.prediction}</p>
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.adjust}</p>
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{c.lines.strength}</p>
              {c.lines.bias && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c.lines.bias}</p>}
            </div>
            {c.perExercise.length > 0 && (
              <div className="flex flex-col">
                {c.perExercise.map((e) => (
                  <div key={e.key} className="flex min-h-[44px] flex-col justify-center gap-0.5 border-t py-1.5" style={{ borderColor: 'var(--color-card-border)' }}>
                    <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{e.name}</p>
                    <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{exerciseLine(e, MIN_SETS)}</p>
                  </div>
                ))}
              </div>
            )}
            {c.strength.readings.length > 0 && (
              <div className="flex flex-col">
                <p className="pb-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sterker, laatste acht weken</p>
                {c.strength.readings.map((r) => (
                  <div key={r.key} className="flex min-h-[44px] items-center justify-between gap-3 border-t py-1.5" style={{ borderColor: 'var(--color-card-border)' }}>
                    <p className="min-w-0 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{r.name}</p>
                    <p className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{r.trend === 'stijgt' ? 'Stijgt' : r.trend === 'daalt' ? 'Daalt' : 'Blijft gelijk'}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Een oefening telt mee vanaf {MIN_SETS} sets. Een voorspelling is raak als je hooguit één herhaling naast Forge zat, bij het voorgestelde gewicht en met je eigen RIR.
            </p>
          </div>
        </Sheet>
      )}
    </Card>
  );
}
