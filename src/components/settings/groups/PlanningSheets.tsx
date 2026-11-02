import { useState } from 'react';
import type { DailyTimeBudget, Weekday } from '../../../models/goalEngineConfig';
import { NumberField } from '../../NumberField';
import { Icon } from '../../icons';
import { SettingsFieldRow, SettingsList } from '../SettingsList';
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

// Trainingstijd per dag, zoals die al was: minuten per weekdag, met een harde limiet onder
// Geavanceerd. Een lege dag heeft geen budget (nooit een verzonnen waarde). Het blad
// "Je week" met Rust, Kort, Normaal en Lang volgt na de planningsreparaties.
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
