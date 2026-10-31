import { useAppData } from '../../../state/AppDataContext';
import { ADVICE_WAVE_LENGTH, WAVE_LENGTHS, resolveWaveSettings, type WaveSettings } from '../../../engine/waves';
import type { AppSettings } from '../../../storage/database';
import { ChoiceList, Sheet } from '../Sheet';
import { SettingsList, SettingsRow } from '../SettingsList';

// De instelling Golven zonder doel (docs/visie/Zonder doel.md, 4): hoe lang een golf is en of de
// laatste week lichter is. Een andere keuze verandert je planning, dus `onChange` maakt er een
// voorstel van (usePlanSettingChange). Wat gelijk is aan het advies wordt weggelaten.
export function wavesPatch(next: WaveSettings): AppSettings['waves'] {
  const kept: NonNullable<AppSettings['waves']> = {
    ...(next.length !== ADVICE_WAVE_LENGTH ? { length: next.length as 3 | 6 } : {}),
    ...(next.lightWeek ? {} : { lightWeek: false as const }),
  };
  return Object.keys(kept).length > 0 ? kept : undefined;
}

export function WavesSheet({ onChange, onClose }: { onChange: (waves: AppSettings['waves'], title: string) => void; onClose: () => void }) {
  const { settings } = useAppData();
  const current = resolveWaveSettings(settings.waves);
  return (
    <Sheet eyebrow="Doel en tochten" title="Golven" line="Zonder doel lopen je weken in golven: een paar weken opbouwen, dan een lichtere week." onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ChoiceList<number>
          label="Lengte van een golf"
          options={WAVE_LENGTHS.map((n) => ({ value: n, label: `${n} weken`, note: n === 3 ? 'Twee weken opbouwen, dan een lichte week' : n === 4 ? 'Drie weken opbouwen, dan een lichte week' : 'Vijf weken opbouwen, dan een lichte week' }))}
          value={current.length}
          advice={ADVICE_WAVE_LENGTH}
          onPick={(n) => { if (n !== current.length) onChange(wavesPatch({ ...current, length: n }), `Golven van ${n} weken`); }}
        />
        <SettingsList>
          <SettingsRow
            id="golven-licht"
            title="Lichte week voorstellen"
            kind="toggle"
            checked={current.lightWeek}
            onChange={(on) => onChange(wavesPatch({ ...current, lightWeek: on }), on ? 'Lichte week weer aan' : 'Geen lichte week')}
          />
        </SettingsList>
      </div>
      <p className="st-hint" style={{ marginLeft: 0 }}>Rustig aan heeft geen golf: elke week is hetzelfde.</p>
    </Sheet>
  );
}
