// De tweede stap van het blad bij Vaste dag (docs/visie/Sporten die meetellen.md, 2.3): op welke dagen, hoe
// zwaar het meestal is en hoe lang. De knop opent het voorstel met wat er in je planning verandert; pas met
// Akkoord wordt het bewaard.

import { useState } from 'react';
import type { FixedSlot } from '../../engine/sportRole';
import { Chip, Eyebrow, PrimaryButton } from '../ui';
import '../settings/settings.css';

const DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAY_LONG = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const INTENSITY: { value: FixedSlot['intensity']; label: string }[] = [
  { value: 'low', label: 'Rustig' },
  { value: 'moderate', label: 'Pittig' },
  { value: 'high', label: 'Zwaar' },
];
const MINUTES = [45, 60, 90, 120];
// Het advies: Pittig en een uur. Een wedstrijd kies je zelf op Zwaar.
const ADVICE: Omit<FixedSlot, 'day'> = { intensity: 'moderate', minutes: 60 };

export function FixedDaysStep({ initial, busy, onSubmit }: { initial: FixedSlot[]; busy: boolean; onSubmit: (slots: FixedSlot[]) => void }) {
  const [slots, setSlots] = useState<FixedSlot[]>(initial);
  const toggle = (day: number) => setSlots((list) => (list.some((s) => s.day === day) ? list.filter((s) => s.day !== day) : [...list, { day, ...ADVICE }].sort((a, b) => a.day - b.day)));
  const patch = (day: number, p: Partial<FixedSlot>) => setSlots((list) => list.map((s) => (s.day === day ? { ...s, ...p } : s)));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Eyebrow>Vaste afspraak</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Wanneer doe je het?</p>
        <div className="st-chips" role="group" aria-label="Dagen">
          {DAYS.map((d, i) => (
            <Chip key={d} selected={slots.some((s) => s.day === i + 1)} onClick={() => toggle(i + 1)} label={DAY_LONG[i]}>
              {d}
            </Chip>
          ))}
        </div>
      </div>
      {slots.map((s) => (
        <div key={s.day} className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{DAY_LONG[s.day - 1]}</p>
          <div className="st-chips" role="group" aria-label={`Hoe zwaar is het meestal op ${DAY_LONG[s.day - 1].toLowerCase()}?`}>
            {INTENSITY.map((o) => (
              <Chip key={o.value} selected={s.intensity === o.value} onClick={() => patch(s.day, { intensity: o.value })}>{o.label}</Chip>
            ))}
          </div>
          <div className="st-chips" role="group" aria-label={`Hoe lang op ${DAY_LONG[s.day - 1].toLowerCase()}?`}>
            {MINUTES.map((m) => (
              <Chip key={m} selected={s.minutes === m} onClick={() => patch(s.day, { minutes: m })}>{`${m} min`}</Chip>
            ))}
          </div>
        </div>
      ))}
      {slots.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaar telt als zware beendag en als harde dag. Pittig telt voor je benen, niet als harde dag.</p>
      )}
      <PrimaryButton onClick={() => onSubmit(slots)} disabled={busy || slots.length === 0}>
        {busy ? 'Bezig…' : 'Bekijk wat er verandert'}
      </PrimaryButton>
    </div>
  );
}
