import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsAnchor } from '../data/settingsIndex';
import {
  ESTIMATE_UP_TO_OPTIONS,
  normalizeStrengthSettings,
  parseWeightList,
  resolveStrengthSettings,
  withProfile,
  type GymProfile,
  type ProgressionFirst,
  type StrengthSettings,
  type WarmupMode,
  type WorkSetsMode,
} from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { formatNumberNL } from '../utils/number';
import { Icon } from './icons';
import { NumberField } from './NumberField';
import { Card, Eyebrow, Toggle } from './ui';

// Settings, group Training, under the heading "Forge": whether ASCEND counts
// along with your strength trainings, the choices of the advice, and the
// weights of the gym. Every choice has the advice as its default and one
// sentence of explanation (docs/beslissingen/2026-10-22-alles-instelbaar.md).

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

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

const fmt = (list: number[]) => list.map((n) => formatNumberNL(n, 2)).join('  ');

// A list of weights typed with spaces between: "1,25  2,5  5". Saved when you
// leave the field, so a half typed list is never stored.
function WeightListField({ label, helper, value, onCommit }: { label: string; helper: string; value: number[]; onCommit: (list: number[]) => void }) {
  const [text, setText] = useState(() => fmt(value));
  const [synced, setSynced] = useState(value);
  if (JSON.stringify(value) !== JSON.stringify(synced)) {
    setSynced(value);
    if (JSON.stringify(parseWeightList(text)) !== JSON.stringify(value)) setText(fmt(value));
  }
  return (
    <div>
      <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {label}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const list = parseWeightList(text);
            if (list.length > 0) onCommit(list);
            else setText(fmt(value));
          }}
          className="mt-1 min-h-[44px] w-full rounded-lg border bg-transparent px-2.5 text-sm"
          style={fieldStyle}
        />
      </label>
      <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{helper}</p>
    </div>
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
  const d = s.profile.dumbbells;
  const saveRack = (patch: Partial<GymProfile['dumbbells']>) => saveProfile({ dumbbells: { ...d, ...patch } });

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
            <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Je sportschool</p>
                <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  ASCEND stelt alleen gewichten voor die je echt kunt maken. Typ de getallen met een spatie ertussen.
                </p>
              </div>
              <WeightListField label="Stangen (kg)" helper="Het gewicht van de lege stangen, de zwaarste eerst." value={s.profile.barsKg} onCommit={(list) => saveProfile({ barsKg: list.sort((a, b) => b - a) })} />
              <WeightListField label="Schijven (kg)" helper="Elke schijf telt als twee, een aan elke kant." value={s.profile.platesKg} onCommit={(list) => saveProfile({ platesKg: list.sort((a, b) => a - b) })} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Lichtste dumbbell" unit="kg" decimals={2} value={d.startKg} onChange={(v) => v !== undefined && saveRack({ startKg: v })} />
                <NumberField label="Eerste stuk loopt tot" unit="kg" decimals={2} value={d.upToKg} onChange={(v) => v !== undefined && saveRack({ upToKg: v })} />
                <NumberField label="Stap in het eerste stuk" unit="kg" decimals={2} value={d.stepKg} onChange={(v) => v !== undefined && saveRack({ stepKg: v })} />
                <NumberField label="Stap daarna" unit="kg" decimals={2} value={d.thenStepKg} onChange={(v) => v !== undefined && saveRack({ thenStepKg: v })} />
                <NumberField label="Zwaarste dumbbell" unit="kg" decimals={2} value={d.maxKg} onChange={(v) => v !== undefined && saveRack({ maxKg: v })} />
                <NumberField label="Stap kabels en toestellen" unit="kg" decimals={2} value={s.profile.stackStepKg} onChange={(v) => v !== undefined && saveProfile({ stackStepKg: v })} />
              </div>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Voorbeeld: lichtste 2 kg, stap 2 kg tot en met 10 kg, daarna 2,5 kg: 2, 4, 6, 8, 10, 12,5, 15 en zo door.
              </p>
            </div>
          </Anchored>
        </>
      )}
    </Card>
  );
}
