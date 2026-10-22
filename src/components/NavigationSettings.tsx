import { useAppData } from '../state/AppDataContext';
import { RESUME_MINUTE_CHOICES, resolveNavigation, resumeLabel, type TabBackMode } from '../engine/navigationSettings';
import { settingsAnchor } from '../data/settingsIndex';
import { Card, Eyebrow } from './ui';

const BACK_OPTIONS: { value: TabBackMode; label: string; note: string }[] = [
  { value: 'today', label: 'Eerst naar Vandaag', note: 'Terug vanaf een andere tab gaat naar Vandaag, terug op Vandaag sluit ASCEND. Zo werken de meeste Android-apps.' },
  { value: 'previous', label: 'Naar de vorige tab', note: 'Terug volgt precies de tabs die je opende, in die volgorde.' },
];

// Wat de terugknop doet en of ASCEND na een herstart terugkomt waar je was
// (engine/navigationSettings.ts). Bladen en dialogen sluiten altijd eerst.
export function NavigationSettings() {
  const { settings, updateSettings } = useAppData();
  const nav = resolveNavigation(settings);
  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>Terugknop en hervatten</Eyebrow>
      <div id={settingsAnchor('terugknop')} className="scroll-mt-40 flex flex-col gap-2 rounded-xl">
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Terugknop op een tab</p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Een blad, dialoog of keuzemenu sluit altijd eerst. Dit gaat over wat daarna gebeurt.
        </p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Terugknop op een tab">
          {BACK_OPTIONS.map((option) => {
            const selected = option.value === nav.tabBack;
            return (
              <button
                key={option.value}
                role="radio"
                aria-checked={selected}
                onClick={() => void updateSettings({ tabBack: option.value })}
                className="min-h-[44px] rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                style={{ borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)' }}
              >
                <span className="block text-sm font-semibold" style={{ color: selected ? 'var(--color-gold)' : 'var(--color-ink)' }}>{option.label}</span>
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{option.note}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div id={settingsAnchor('hervatten')} className="scroll-mt-40 flex flex-col gap-2 rounded-xl border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Na een herstart</p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Open je ASCEND binnen deze tijd opnieuw, dan kom je terug op de pagina waar je was. Daarna begin je op Vandaag. Advies: 2 uur.
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Na een herstart terug naar waar je was">
          {RESUME_MINUTE_CHOICES.map((minutes) => {
            const selected = minutes === nav.resumeMinutes;
            return (
              <button
                key={minutes}
                role="radio"
                aria-checked={selected}
                onClick={() => void updateSettings({ resumeMinutes: minutes })}
                className="min-h-[44px] min-w-[44px] flex-1 rounded-lg border px-2 text-xs font-semibold"
                style={{ borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)', color: selected ? 'var(--color-gold)' : 'var(--color-ink-dim)', background: 'var(--color-charcoal)' }}
              >
                {resumeLabel(minutes)}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
