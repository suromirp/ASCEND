import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { bodyFatLines, bodyFatTrend } from '../../engine/bodyFat';
import { addWeightEntry, latestWeight, weightsInUse } from '../../engine/bodyWeight';
import { isWeightRange, weighingRowSource, weightChangeLines, weightOverview, WEIGHT_RANGE_ADVICE, type WeightRange } from '../../engine/weightOverview';
import { realWeighings, weightShown } from '../../engine/weightTrend';
import { formatDayMonthNL, formatShortDateNL, todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { NumberField } from '../NumberField';
import { TextButton } from '../TextButton';
import { Eyebrow, Segmented } from '../ui';
import { WeightSheet } from '../settings/groups/LichaamSheets';
import { SettingsFieldRow, SettingsList } from '../settings/SettingsList';
import { Sheet } from '../settings/Sheet';
import { WeightChart } from './WeightChart';

// Het overzicht Gewicht achter de kaart op Je stand: je trend als lijn met je wegingen als stippen,
// de verandering, het vetpercentage, de lijst van wegingen met Weging toevoegen en onderaan de weg
// naar de instellingen (docs/beslissingen/2026-11-09-overzicht-gewicht.md). Rekenen gebeurt in
// engine/weightOverview.ts.

const RANGE_OPTIONS: { value: WeightRange; label: string }[] = [
  { value: '4w', label: '4 weken' },
  { value: '3m', label: '3 maanden' },
  { value: '1y', label: 'Een jaar' },
];
const ROWS_SHOWN = 7;

export function WeightOverviewSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const [range, setRange] = useState<WeightRange>(isWeightRange(settings.weightRange) ? settings.weightRange : WEIGHT_RANGE_ADVICE);
  const [allRows, setAllRows] = useState(false);
  const [adding, setAdding] = useState(false);
  const [kgDraft, setKgDraft] = useState<number | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = todayISO();
  const trendOn = settings.weightTrend !== false;
  const entries = useMemo(
    () => weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect),
    [settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect],
  );
  const overview = useMemo(() => weightOverview(entries, range, settings.weightTrend, today), [entries, range, settings.weightTrend, today]);
  const shown = weightShown(entries, settings.weightTrend);
  const last = latestWeight(entries);
  // Het voorbeeld in het veld is je laatste echte weging, nooit een trendgewicht.
  const lastWeighed = realWeighings(entries).pop();
  const change = weightChangeLines(overview);
  const fat = settings.showBodyFat === false ? undefined : bodyFatTrend(entries);
  const fatText = fat ? bodyFatLines(fat) : undefined;
  const rows = allRows ? overview.rows : overview.rows.slice(0, ROWS_SHOWN);

  async function save() {
    if (!kgDraft) return;
    await updateSettings({ weightEntries: addWeightEntry(settings.weightEntries, { date: today, kg: kgDraft, source: 'manual' }) });
    setKgDraft(undefined);
    setAdding(false);
  }

  return (
    <>
      <Sheet eyebrow="Je stand" title="Gewicht" onClose={onClose}>
        <div className="st-hero">
          <span className={`n${shown ? '' : ' dim'}`}>{shown ? formatNumberNL(shown.kg, 1) : '--,-'}</span>
          <span className="u">kg</span>
        </div>
        <div className="st-src">
          <span className="st-num">
            {!last
              ? 'Nog geen gewicht ingevuld.'
              : shown?.trend
                ? `Trend. Laatste weging ${formatNumberNL(last.kg, 1)} kg, ${formatDayMonthNL(last.date)}`
                : `${last.basis === 'trend' ? 'Trendgewicht uit MacroFactor' : 'Laatste weging'}, ${formatDayMonthNL(last.date)}`}
          </span>
        </div>

        <div className="mt-4">
          <Segmented tall label="Periode" value={range} onChange={setRange} options={RANGE_OPTIONS} />
        </div>

        <div className="mt-4">
          {overview.line.length > 0 ? (
            <WeightChart overview={overview} trendOn={trendOn} />
          ) : (
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Geen wegingen in deze periode.</p>
          )}
        </div>

        {overview.line.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            {change ? (
              <>
                {change.perWeek && <p className="st-num text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{change.perWeek}</p>}
                <p className={`st-num ${change.perWeek ? 'text-sm' : 'text-base font-semibold'}`} style={{ color: change.perWeek ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{change.total}</p>
              </>
            ) : (
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Nog geen verandering te zien. Daarvoor zijn wegingen over minstens een week nodig.</p>
            )}
          </div>
        )}

        {fat && fatText && (
          <div className="st-fat">
            <div className="st-fat-line"><span className="st-num">{fatText.fat}</span></div>
            {fatText.lean && <div className="st-fat-line dim"><span className="st-num">{fatText.lean}</span></div>}
            <p className="st-fat-note st-num">Gemiddelde van je laatste {fat.readings === 1 ? 'meting' : `${fat.readings} metingen`}, tot {formatDayMonthNL(fat.asOf)}</p>
          </div>
        )}

        <div className="mt-6">
          <Eyebrow>Wegingen</Eyebrow>
          {rows.length > 0 ? (
            <ul className="mt-2 flex flex-col">
              {rows.map((row) => (
                <li key={`${row.date}-${row.source}`} className="flex min-h-[44px] items-center justify-between gap-3 border-b text-sm" style={{ borderColor: 'var(--color-card-border)' }}>
                  <span className="st-num shrink-0" style={{ color: 'var(--color-ink)' }}>{formatShortDateNL(row.date, today)}</span>
                  <span className="min-w-0 flex-1 truncate text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>{weighingRowSource(row)}</span>
                  <span className="st-num w-[68px] shrink-0 text-right" style={{ color: 'var(--color-ink)' }}>{formatNumberNL(row.kg, 1)} kg</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Geen wegingen in deze periode.</p>
          )}
          {overview.rows.length > ROWS_SHOWN && (
            <TextButton onClick={() => setAllRows((v) => !v)} icon="omlaag" flipped={allRows} aria-expanded={allRows}>
              {allRows ? 'Minder tonen' : `Alle ${overview.rows.length} wegingen tonen`}
            </TextButton>
          )}
        </div>

        <div className="st-btns">
          <button type="button" className="st-btn" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>Weging toevoegen</button>
        </div>
        {adding && (
          <>
            <SettingsList className="mt-4">
              <SettingsFieldRow id="gewicht-weging" title="Gewicht van vandaag">
                <span style={{ width: 120 }}>
                  <NumberField tall unit="kg" decimals={1} value={kgDraft} placeholder={lastWeighed ? formatNumberNL(lastWeighed.kg, 1) : '85,6'} onChange={setKgDraft} />
                </span>
              </SettingsFieldRow>
            </SettingsList>
            <div className="st-btns">
              <button type="button" className="st-btn" disabled={!kgDraft} onClick={() => void save()}>Opslaan</button>
            </div>
          </>
        )}

        <div className="mt-4">
          <TextButton icon="verder" onClick={() => setSettingsOpen(true)}>Instellingen voor gewicht</TextButton>
        </div>
      </Sheet>
      {settingsOpen && <WeightSheet onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
