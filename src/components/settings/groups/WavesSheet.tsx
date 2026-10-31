import { useAppData } from '../../../state/AppDataContext';
import { ADVICE_WAVE_LENGTH, DEFAULT_WEEKS_FOR_STEP, WAVE_LENGTHS, resolveWaveSettings, type WaveSettings } from '../../../engine/waves';
import type { AppSettings } from '../../../storage/database';
import { ChoiceList, Sheet } from '../Sheet';
import { SettingsList, SettingsRow } from '../SettingsList';
import { Eyebrow } from '../../ui';

// De instelling Golven zonder doel (docs/visie/Zonder doel.md, 4): hoe lang een golf is, of de laatste
// week lichter is, of er na een golf een terugblik komt en hoeveel weken je moet halen voor een stap
// omhoog. Lengte en lichte week veranderen je planning: `onPlanChange` maakt er een voorstel van
// (usePlanSettingChange). De terugblik en de stap omhoog veranderen niets aan je planning en worden
// meteen bewaard. Wat gelijk is aan het advies wordt weggelaten.
export function wavesPatch(next: WaveSettings): AppSettings['waves'] {
  const kept: NonNullable<AppSettings['waves']> = {
    ...(next.length !== ADVICE_WAVE_LENGTH ? { length: next.length as 3 | 6 } : {}),
    ...(next.lightWeek ? {} : { lightWeek: false as const }),
    ...(next.review ? {} : { review: false as const }),
    ...(next.weeksForStep !== DEFAULT_WEEKS_FOR_STEP ? { weeksForStep: next.weeksForStep } : {}),
  };
  return Object.keys(kept).length > 0 ? kept : undefined;
}

export function WavesSheet({ onPlanChange, onClose }: { onPlanChange: (waves: AppSettings['waves'], title: string) => void; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const current = resolveWaveSettings(settings.waves);
  const steps = Array.from({ length: current.length }, (_, i) => i + 1).filter((n) => n >= 2);
  return (
    <Sheet eyebrow="Doel en tochten" title="Golven" line="Zonder doel lopen je weken in golven: een paar weken opbouwen, dan een lichtere week." onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ChoiceList<number>
          label="Lengte van een golf"
          options={WAVE_LENGTHS.map((n) => ({ value: n, label: `${n} weken`, note: `${n - 1} weken opbouwen, dan een lichte week` }))}
          value={current.length}
          advice={ADVICE_WAVE_LENGTH}
          onPick={(n) => { if (n !== current.length) onPlanChange(wavesPatch({ ...current, length: n }), `Golven van ${n} weken`); }}
        />
        <SettingsList>
          <SettingsRow
            id="golven-licht"
            title="Lichte week voorstellen"
            kind="toggle"
            checked={current.lightWeek}
            onChange={(on) => onPlanChange(wavesPatch({ ...current, lightWeek: on }), on ? 'Lichte week weer aan' : 'Geen lichte week')}
          />
          <SettingsRow
            id="golven-terugblik"
            title="Terugblik na een golf"
            kind="toggle"
            checked={current.review}
            onChange={(on) => void updateSettings({ waves: wavesPatch({ ...current, review: on }) })}
          />
        </SettingsList>
        {current.review && (
          <div>
            <Eyebrow>Zo veel weken halen voor een stap omhoog</Eyebrow>
            <ChoiceList<number>
              label="Zo veel weken halen voor een stap omhoog"
              options={steps.map((n) => ({ value: n, label: `${n} van ${current.length} weken` }))}
              value={current.weeksForStep}
              advice={Math.min(DEFAULT_WEEKS_FOR_STEP, current.length)}
              onPick={(n) => void updateSettings({ waves: wavesPatch({ ...current, weeksForStep: n }) })}
            />
          </div>
        )}
      </div>
      <p className="st-hint" style={{ marginLeft: 0 }}>Rustig aan heeft geen golf: elke week is hetzelfde.</p>
    </Sheet>
  );
}
