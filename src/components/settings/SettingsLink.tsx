import { Link, useNavigate } from 'react-router-dom';
import type { SettingsPageId } from '../../data/settingsLayout';
import { Icon } from '../icons';
import { jumpRoute } from './jump';

// Van een plek in de app naar de instelling die erbij hoort ("Instellingen vanuit de functie"):
// een rij onderaan een blad op Vandaag of Week, en een tandwiel op Forge. De sprong gaat naar
// de groep en laat de rij even oplichten.
export function SettingsLinkRow({ page, row, label = 'Instellingen' }: { page: SettingsPageId; row: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        const r = jumpRoute(page, { jumpTo: row });
        navigate(r.to, { state: r.state });
      }}
      className="mt-2 flex min-h-[44px] w-full items-center justify-between gap-3 border-t text-left text-sm"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}
    >
      <span>{label}</span>
      <Icon name="verder" size={16} />
    </button>
  );
}

// Het tandwiel van een pagina die zijn eigen instellingen heeft (Forge): 44 bij 44 px.
export function SettingsGearLink({ page, row, label }: { page: SettingsPageId; row?: string; label: string }) {
  const r = jumpRoute(page, row ? { jumpTo: row } : {});
  return (
    <Link
      to={r.to}
      state={r.state}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink-dim)' }}
    >
      <Icon name="tandwiel" />
    </Link>
  );
}

// Een rij bovenaan een koppelpagina (Garmin, MacroFactor) naar wat je erover instelt.
export function SettingsPageLink({ page, row, label }: { page: SettingsPageId; row?: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        const r = jumpRoute(page, row ? { jumpTo: row } : {});
        navigate(r.to, { state: r.state });
      }}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-4 text-left text-sm"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <span>{label}</span>
      <Icon name="verder" size={16} />
    </button>
  );
}
