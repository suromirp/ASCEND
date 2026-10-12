import { useAppData } from '../state/AppDataContext';
import { effectiveAmbition, type Ambition } from '../engine/ambition';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';

const OPTIONS: { value: Ambition; label: string; note: string }[] = [
  { value: 'rustig', label: 'Rustig', note: 'Je lopen en tochten bouwen 10% minder snel op. Voor drukke periodes of na een blessure.' },
  { value: 'standaard', label: 'Standaard', note: 'Het plan zoals het is.' },
  { value: 'stevig', label: 'Stevig', note: 'Je lopen en tochten bouwen 10% sneller op en de rustweek schakelt minder terug. Valt vanzelf terug op Standaard bij pijn of trainingen die te zwaar voelen.' },
];

// Settings → Training: how fast the plan builds up (engine/ambition.ts).
export function AmbitionSettings() {
  const { settings, updateSettings, refresh, sessionLogs, templateById, program } = useAppData();
  const state = effectiveAmbition(settings.ambition, sessionLogs, templateById, program, todayISO());
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>AMBITIE</Eyebrow>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        Hoe snel je lopen en tochten in minuten opbouwen. Eén grens blijft altijd: een training wordt nooit meer dan 10% langer dan je langste van de afgelopen maand. Die regel beschermt het best tegen blessures, ook als je jong en fit bent: pezen en botten wennen langzamer dan je conditie.
      </p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Ambitie">
        {OPTIONS.map((o) => {
          const on = state.chosen === o.value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={on}
              onClick={() => void updateSettings({ ambition: o.value }).then(() => refresh())}
              className="rounded-xl border p-3 text-left"
              style={{ borderColor: on ? 'var(--color-gold)' : 'var(--color-card-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: on ? 'var(--color-gold)' : 'var(--color-ink)' }}>{o.label}</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{o.note}</p>
            </button>
          );
        })}
      </div>
      {state.chosen !== state.effective && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-warning)' }}>
          Nu tijdelijk Standaard. {state.reason} Gaat het weer goed, dan staat Stevig vanzelf weer aan.
        </p>
      )}
    </Card>
  );
}
