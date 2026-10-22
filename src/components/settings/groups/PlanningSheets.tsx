import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import type { DailyTimeBudget, Weekday } from '../../../models/goalEngineConfig';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, type Sport } from '../../../engine/sports';
import { Segmented } from '../../ui';
import { NumberField } from '../../NumberField';
import { Icon } from '../../icons';
import { SettingsFieldRow, SettingsList, SettingsRow } from '../SettingsList';
import { Sheet } from '../Sheet';

const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABELS_NL: Record<Weekday, string> = {
  mon: 'Maandag', tue: 'Dinsdag', wed: 'Woensdag', thu: 'Donderdag', fri: 'Vrijdag', sat: 'Zaterdag', sun: 'Zondag',
};

// ASCEND_HEURISTIC(SOFT-FLEX-FROM-PREFERRED): softFlexMinutes is deliberately never asked
// for directly: een gebruiker zegt "ongeveer 90 minuten", niet "90 plus 15 flex". 15% van de
// voorkeursduur, met 15 minuten als ondergrens, is een gewone, gedocumenteerde standaard.
function deriveSoftFlexMinutes(preferredMinutes: number): number {
  return Math.max(15, Math.round(preferredMinutes * 0.15));
}

// Eén sport: inplannen aan of uit, en hoe vaak per week. Het resultaat van elke tik gaat
// langs usePlanSettingChange (een voorstel met Akkoord als het de planning raakt).
export function SportSheet({
  sport,
  note,
  onToggle,
  onFrequency,
  onClose,
}: {
  sport: Sport;
  note: string | null;
  onToggle: (sport: Sport, on: boolean) => void;
  onFrequency: (sport: Sport, perWeek: number | undefined) => void;
  onClose: () => void;
}) {
  const { settings } = useAppData();
  const on = { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports }[sport];
  const perWeek = settings.sportFrequency?.[sport];
  const name = SPORT_LABEL[sport];
  return (
    <Sheet eyebrow="Sporten" title={name} onClose={onClose}>
      <SettingsList>
        <SettingsRow id={`inplannen-${sport}`} title="Inplannen" kind="toggle" checked={on} onChange={(v) => onToggle(sport, v)} />
      </SettingsList>
      {on ? (
        <>
          <p className="st-lab" style={{ marginTop: 24 }}>Per week</p>
          <Segmented<number>
            tall
            label={`${name} per week`}
            value={perWeek ?? 0}
            options={[{ value: 0, label: 'Auto' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}×` }))]}
            onChange={(n) => onFrequency(sport, n === 0 ? undefined : n)}
          />
          <p className="st-hint" style={{ marginLeft: 0 }}>
            {perWeek ? `ASCEND houdt ${perWeek}× aan en kiest zelf de dagen.` : 'Je weekschema bepaalt hoe vaak.'}
          </p>
        </>
      ) : (
        <p className="st-hint" style={{ marginLeft: 0 }}>{`Uit: ASCEND plant geen ${name.toLowerCase()} meer. Loggen kan altijd.`}</p>
      )}
      {note && <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-ink)' }} role="status">{note}</p>}
    </Sheet>
  );
}

// Trainingstijd per dag, zoals die al was: minuten per weekdag, met een harde limiet onder
// Geavanceerd. Een lege dag heeft geen budget (nooit een verzonnen waarde). Het blad
// "Mijn week" met Rust, Kort, Normaal en Lang volgt na de planningsreparaties.
export function BudgetSheet({
  dailyTimeBudget,
  onSave,
  onClose,
}: {
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>>;
  onSave: (next: Partial<Record<Weekday, DailyTimeBudget>>) => Promise<void>;
  onClose: () => void;
}) {
  const [showMax, setShowMax] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<Weekday, { preferred?: number; hardMax?: number }>>>(() => {
    const initial: Partial<Record<Weekday, { preferred?: number; hardMax?: number }>> = {};
    for (const day of WEEKDAY_ORDER) {
      const b = dailyTimeBudget[day];
      initial[day] = { preferred: b?.preferredMinutes, hardMax: b?.hardMaximumMinutes };
    }
    return initial;
  });

  function build(): Partial<Record<Weekday, DailyTimeBudget>> {
    const next: Partial<Record<Weekday, DailyTimeBudget>> = {};
    for (const day of WEEKDAY_ORDER) {
      const d = drafts[day];
      if (!d?.preferred || d.preferred <= 0) continue;
      next[day] = {
        preferredMinutes: d.preferred,
        softFlexMinutes: deriveSoftFlexMinutes(d.preferred),
        ...(d.hardMax ? { hardMaximumMinutes: d.hardMax } : {}),
      };
    }
    return next;
  }

  return (
    <Sheet eyebrow="Planning" title="Trainingstijd per dag" line="Hoeveel tijd je normaal hebt per dag." onClose={onClose}>
      {(close) => (
        <>
          <SettingsList>
            {WEEKDAY_ORDER.map((day) => (
              <SettingsFieldRow key={day} id={`tijd-${day}`} title={WEEKDAY_LABELS_NL[day]}>
                <span style={{ width: 120 }}>
                  <NumberField
                    tall
                    unit="min"
                    placeholder="niet ingesteld"
                    value={drafts[day]?.preferred}
                    onChange={(v) => setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], preferred: v } }))}
                  />
                </span>
              </SettingsFieldRow>
            ))}
            <button type="button" className="st-more" aria-expanded={showMax} onClick={() => setShowMax((s) => !s)}>
              <span>Geavanceerd: harde limiet</span>
              <Icon name="verder" size={16} />
            </button>
            {showMax && WEEKDAY_ORDER.map((day) => (
              <SettingsFieldRow key={`max-${day}`} id={`limiet-${day}`} title={`${WEEKDAY_LABELS_NL[day]}, maximum`}>
                <span style={{ width: 120 }}>
                  <NumberField
                    tall
                    unit="max"
                    value={drafts[day]?.hardMax}
                    onChange={(v) => setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], hardMax: v } }))}
                  />
                </span>
              </SettingsFieldRow>
            ))}
          </SettingsList>
          <div className="st-btns">
            <button type="button" className="st-btn" onClick={() => close()}>Annuleren</button>
            <button type="button" className="st-btn" onClick={() => { void onSave(build()); close(); }}>Opslaan</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
