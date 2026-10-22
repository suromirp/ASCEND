import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsAnchor } from '../data/settingsIndex';
import {
  ESTIMATE_UP_TO_OPTIONS,
  normalizeStrengthSettings,
  resolveStrengthSettings,
  withProfile,
  type GymProfile,
  type ProgressionFirst,
  type RestAlert,
  type StrengthSettings,
  type WarmupMode,
  type WorkSetsMode,
} from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { Icon } from './icons';
import { GymProfileSettings } from './GymProfileSettings';
import { Card, Eyebrow, Toggle } from './ui';

// Settings, group Training, under the heading "Forge": whether ASCEND counts
// along with your strength trainings, the choices of the advice, and the
// weights of the gym. Every choice has the advice as its default and one
// sentence of explanation (docs/beslissingen/2026-10-22-alles-instelbaar.md).

function Anchored({ id, children }: { id: string; children: ReactNode }) {
  return <div id={settingsAnchor(id)} className="scroll-mt-40 flex flex-col gap-2 rounded-xl py-1">{children}</div>;
}

function Choice<T extends string | number>({ title, note, options, value, onChange }: { title: string; note: string; options: { value: T; label: string; note?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={selected}
              className="min-h-[44px] rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
              style={{ borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: selected ? 'var(--color-gold)' : 'var(--color-ink)' }}>{o.label}</p>
              {o.note && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{o.note}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchLine({ id, title, note, checked, onChange }: { id: string; title: string; note: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <Anchored id={id}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
        </div>
        <Toggle checked={checked} onChange={onChange} label={title} />
      </div>
    </Anchored>
  );
}

export function ForgeSettings() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const s = resolveStrengthSettings(settings.strengthModel);
  const save = (patch: Partial<StrengthSettings>) => void updateSettings({ strengthModel: { ...settings.strengthModel, ...patch } });
  const saveProfile = (patch: Partial<GymProfile>) => {
    const next = normalizeStrengthSettings(withProfile(settings.strengthModel, patch));
    if (next) void updateSettings({ strengthModel: next });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Eyebrow>Forge</Eyebrow>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Je krachttraining: vooruitgang per oefening en wat ASCEND de volgende keer voorstelt.
        </p>
      </div>
      <SwitchLine
        id="forge"
        title="Kracht meerekenen"
        note="ASCEND rekent stil mee met de krachttrainingen die je uit MacroFactor inleest en zegt wat je de volgende keer kunt doen. Je planning verandert er niet door."
        checked={s.enabled}
        onChange={(on) => save({ enabled: on })}
      />
      <button type="button" onClick={() => navigate('/forge')} className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left">
        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>Forge openen</span>
        <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
      </button>

      <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>In de sportschool</p>
        <SwitchLine
          id="forge-rust"
          title="Rusttimer vanzelf"
          note="Start na elke werkset en na je laatste opwarmset, met een rusttijd per oefening: zwaarder en samengesteld langer. Per oefening aan te passen in het workoutscherm."
          checked={s.restAuto}
          onChange={(on) => save({ restAuto: on })}
        />
        <Anchored id="forge-signaal">
          <Choice<RestAlert>
            title="Signaal als de rust om is"
            note="Een korte toon mengt met je muziek; trillen voel je ook met de telefoon in je zak."
            value={s.restAlert}
            onChange={(v) => save({ restAlert: v })}
            options={[
              { value: 'sound_vibrate', label: 'Geluid en trillen', note: 'Dit is het advies.' },
              { value: 'vibrate', label: 'Alleen trillen' },
              { value: 'sound', label: 'Alleen geluid' },
              { value: 'off', label: 'Niets', note: 'Je kijkt zelf op de balk onderaan.' },
            ]}
          />
        </Anchored>
        <SwitchLine
          id="forge-scherm"
          title="Scherm aan tijdens je training"
          note="Het scherm gaat niet uit zolang het workoutscherm open is, zodat je timer en sets in beeld blijven."
          checked={s.keepScreenOn}
          onChange={(on) => save({ keepScreenOn: on })}
        />
      </div>

      {s.enabled && (
        <>
          <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
            <Anchored id="forge-volgorde">
              <Choice<ProgressionFirst>
                title="Eerst gewicht of eerst herhalingen"
                note="Wat ASCEND eerst ophoogt als het goed gaat."
                value={s.progression}
                onChange={(v) => save({ progression: v })}
                options={[
                  { value: 'weight_first', label: 'Eerst gewicht', note: 'Zodra je kracht het toelaat, een stap zwaarder. Dit is het advies.' },
                  { value: 'reps_first', label: 'Eerst herhalingen', note: 'Zelfde gewicht tot je de bovenkant van het bereik haalt, dan een stap zwaarder.' },
                ]}
              />
            </Anchored>
            <Anchored id="forge-sets">
              <Choice<WorkSetsMode>
                title="Werksets dalend of gelijk"
                note="Door vermoeidheid kun je met elke set iets minder tillen."
                value={s.workSets}
                onChange={(v) => save({ workSets: v })}
                options={[
                  { value: 'descending', label: 'Dalend', note: 'Elke volgende set een tikje lichter, zoals het echt gaat. Dit is het advies.' },
                  { value: 'equal', label: 'Gelijk', note: 'Alle sets met hetzelfde gewicht.' },
                ]}
              />
            </Anchored>
            <Anchored id="forge-opwarmen">
              <Choice<WarmupMode>
                title="Opwarmen"
                note="Lichte sets voor je werkgewicht. Bij lichte gewichten en isolatieoefeningen komen ze er nooit bij."
                value={s.warmup}
                onChange={(v) => save({ warmup: v })}
                options={[
                  { value: 'smart', label: 'Slim', note: 'Uit je geschatte kracht, op de schijven die je hebt. Dit is het advies.' },
                  { value: 'scheme', label: 'Schema', note: '40, 60 en 80 procent van je eerste werkgewicht.' },
                  { value: 'off', label: 'Uit', note: 'Geen opwarmsets in het voorstel.' },
                ]}
              />
            </Anchored>
            <SwitchLine
              id="forge-bereik"
              title="Bereik verbreden bij grove stappen"
              note="Springt het toestel in grote stappen, dan mag het aantal herhalingen tijdelijk ruimer zijn, zonder dat het plan verandert."
              checked={s.widenRange}
              onChange={(on) => save({ widenRange: on })}
            />
            <Anchored id="forge-schatting">
              <Choice<number>
                title="Sets die meetellen voor je kracht"
                note="Hoe meer herhalingen een set had, hoe onzekerder de schatting. Standaard tellen sets tot 20 herhalingen (met wat je nog over had), zodat ook je hogere bereiken meedoen; als trend per oefening is dat bruikbaar. Kies 12 voor de strengste schatting."
                value={s.estimateUpTo}
                onChange={(v) => save({ estimateUpTo: v })}
                options={ESTIMATE_UP_TO_OPTIONS.map((n) => ({ value: n, label: `Tot ${n} herhalingen`, ...(n === 20 ? { note: 'Standaard. Ook hoge bereiken als 14 tot 16 tellen mee.' } : n === 12 ? { note: 'Het strengst, volgens het onderzoek het nauwkeurigst.' } : {}) }))}
              />
            </Anchored>
          </div>

          <Anchored id="sportschool">
            <GymProfileSettings profile={s.profile} onSave={saveProfile} />
          </Anchored>
        </>
      )}
    </Card>
  );
}
