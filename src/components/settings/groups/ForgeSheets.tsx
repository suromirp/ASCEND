import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { MIN_LOGS_TO_LEARN, predictDuration, usableLogCount } from '../../../engine/durationLearning';
import { smallestBarJump } from '../../../engine/gymProfileEdit';
import { normalizeStrengthSettings, resolveStrengthSettings, withProfile, type GymProfile } from '../../../engine/strengthSettings';
import { durationNote } from '../../../engine/settingsSummary';
import { todayISO } from '../../../utils/dates';
import { formatNumberNL } from '../../../utils/number';
import { Dumbbells, StackStep, WeightPicker } from '../../GymProfileSettings';
import { NumberField } from '../../NumberField';
import { Icon } from '../../icons';
import { Sheet } from '../Sheet';

const kg = (n: number) => formatNumberNL(n, 2);

// Je sportschool: elk blad is een stuk van de GymProfile. Wat een tik doet staat in
// engine/gymProfileEdit.ts; de opgeslagen vorm is het GymProfile zoals het was.
function useProfile() {
  const { settings, updateSettings } = useAppData();
  const profile = resolveStrengthSettings(settings.strengthModel).profile;
  const save = (patch: Partial<GymProfile>) => {
    const next = normalizeStrengthSettings(withProfile(settings.strengthModel, patch));
    if (next) void updateSettings({ strengthModel: next });
  };
  return { profile, save };
}

export function BarsSheet({ onClose }: { onClose: () => void }) {
  const { profile, save } = useProfile();
  return (
    <Sheet eyebrow="Je sportschool" title="Stangen" line="Het gewicht van de lege stang. ASCEND pakt de zwaarste die past." onClose={onClose}>
      <WeightPicker kind="bars" list={profile.barsKg} onChange={(list) => save({ barsKg: list })} />
      <div className="st-box" style={{ marginTop: 16 }}>
        <div className="k">Aangetikt</div>
        <div className="b">{profile.barsKg.map(kg).join(' en ')} kg</div>
      </div>
    </Sheet>
  );
}

export function PlatesSheet({ onClose }: { onClose: () => void }) {
  const { profile, save } = useProfile();
  return (
    <Sheet eyebrow="Je sportschool" title="Schijven" line="Elke schijf telt twee keer, een aan elke kant." onClose={onClose}>
      <WeightPicker kind="plates" list={profile.platesKg} onChange={(list) => save({ platesKg: list })} />
      <div className="st-box" style={{ marginTop: 16 }}>
        <div className="k">Kleinste sprong op de stang</div>
        <div className="b">{kg(smallestBarJump(profile.platesKg))} kg</div>
      </div>
    </Sheet>
  );
}

export function RackSheet({ onClose }: { onClose: () => void }) {
  const { profile, save } = useProfile();
  return (
    <Sheet eyebrow="Je sportschool" title="Dumbbells" onClose={onClose}>
      <Dumbbells rack={profile.dumbbells} onChange={(dumbbells) => save({ dumbbells })} />
    </Sheet>
  );
}

export function StackSheet({ onClose }: { onClose: () => void }) {
  const { profile, save } = useProfile();
  return (
    <Sheet eyebrow="Je sportschool" title="Kabels en toestellen" line="Hoeveel het blok per stand zwaarder wordt." onClose={onClose}>
      <StackStep value={profile.stackStepKg} onChange={(stackStepKg) => save({ stackStepKg })} />
    </Sheet>
  );
}

// Trainingsduur: ASCEND leert hem uit de echte duur van je trainingen. Een eigen schatting
// helpt alleen zolang er nog te weinig trainingen zijn, daarom onder Geavanceerd.
export function DurationSheet({ onClose }: { onClose: () => void }) {
  const { templates, plannedSessions, sessionLogs, settings, updateSettings, refresh } = useAppData();
  const [advanced, setAdvanced] = useState(false);
  const today = todayISO();
  const strength = templates.filter(
    (t) => t.type === 'strength' && !t.weeklyProgression && (t.defaultDayOfWeek || plannedSessions.some((s) => s.templateId === t.id && s.scheduledDate >= today)),
  );
  const estimates = settings.sessionDurationEstimates ?? {};

  async function setEstimate(templateId: string, minutes: number | undefined) {
    const next = { ...estimates };
    if (minutes && minutes > 0) next[templateId] = Math.round(minutes);
    else delete next[templateId];
    await updateSettings({ sessionDurationEstimates: next });
    await refresh();
  }

  return (
    <Sheet eyebrow="Forge" title="Trainingsduur" line={`Geleerd uit je trainingen, na ${MIN_LOGS_TO_LEARN} keer.`} onClose={onClose}>
      <div className="st-list">
        {strength.map((t) => {
          const p = predictDuration(t, sessionLogs, estimates[t.id]);
          return (
            <div key={t.id} className="st-row two">
              <span className="t"><span className="st-title-text">{t.name}</span></span>
              <span className="s st-num">{durationNote(p.source, p.basedOn, usableLogCount(t, sessionLogs))}</span>
              <span className="v"><span className="st-num">{p.minutes} min</span></span>
            </div>
          );
        })}
        <button type="button" className="st-more" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>
          <span>Geavanceerd: zelf schatten</span>
          <Icon name="verder" size={16} />
        </button>
        {advanced && strength.map((t) => (
          <div key={t.id} className="st-row field">
            <span className="t"><span className="st-title-text">{t.name}</span></span>
            <span className="v">
              <span style={{ width: 112 }}>
                <NumberField tall unit="min" value={estimates[t.id]} placeholder={String(t.durationVariants.full)} onChange={(v) => void setEstimate(t.id, v)} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
