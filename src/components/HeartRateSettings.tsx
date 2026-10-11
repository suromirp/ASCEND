import { useAppData } from '../state/AppDataContext';
import { zoneBpm } from '../engine/heartRateZones';
import { INTENSITY, type Intensity } from '../data/workoutStructure';
import { Card, Eyebrow } from './ui';
import { NumberField } from './NumberField';

// Settings → Training: your own heart rate values. The training screens
// then show each zone in beats per minute.
export function HeartRateSettings() {
  const { settings, updateSettings } = useAppData();
  const hr = settings.heartRate ?? {};
  const set = (patch: Partial<typeof hr>) => void updateSettings({ heartRate: { ...hr, ...patch } });
  const levels: Intensity[] = [1, 2, 3, 4];
  const preview = levels.map((l) => ({ l, bpm: zoneBpm(l, hr) })).filter((z) => z.bpm);

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>MIJN HARTSLAG</Eyebrow>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        Je vindt deze waarden in Garmin Connect bij je hartslagzones. Met je drempelhartslag (LTHR) worden de zones het
        nauwkeurigst; zonder rekent ASCEND met je maximale hartslag.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <NumberField compact label="Drempel (LTHR)" unit="bpm" value={hr.lthr} onChange={(v) => set({ lthr: v })} />
        <NumberField compact label="Maximaal" unit="bpm" value={hr.maxHr} onChange={(v) => set({ maxHr: v })} />
        <NumberField compact label="In rust" unit="bpm" value={hr.restingHr} onChange={(v) => set({ restingHr: v })} />
      </div>
      {preview.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          {preview.map(({ l, bpm }) => (
            <p key={l} className="flex justify-between text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span><span style={{ color: 'var(--color-ink)' }}>{INTENSITY[l].label}</span> · {INTENSITY[l].zone}</span>
              <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{bpm![0]} tot {bpm![1]} bpm</span>
            </p>
          ))}
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
            Hartslag is een hulpmiddel naast hoe zwaar het voelt en de praattest, niet de enige maat.
          </p>
        </div>
      )}
    </Card>
  );
}
