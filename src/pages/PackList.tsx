// ASCEND — Paklijst met gewichten: the example list from the GR5 research as
// a start, which you change to what you really have (engine/packList.ts,
// data/packList.ts). Opened from the reisplanner and from Ascend.

import { useState } from 'react';
import { Card, Eyebrow, SecondaryButton, PageHeader } from '../components/ui';
import { CheckCircle } from '../components/reis/CheckCircle';
import { PackItemSheet } from '../components/reis/PackItemSheet';
import { usePackList } from '../components/reis/usePackList';
import { PACK_GROUPS, PACK_GROUP_LABEL, type PackGroup, type PackItem } from '../data/packList';
import {
  addItem, baseWeightGrams, departureTable, formatGrams, formatKg, groupWeightGrams, packProgress, packVersusGoal, removeItem, updateItem,
  FOOD_KG_PER_DAY, WATER_LITER_OPTIONS,
} from '../engine/packList';
import { formatNumberNL } from '../utils/number';
import { makeId } from '../utils/id';

type Editing = { kind: 'edit'; id: string } | { kind: 'add'; group: PackGroup } | null;

export function PackListPage() {
  const { items, customised, goalKg, change, reset } = usePackList();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const baseGrams = baseWeightGrams(items);
  const progress = packProgress(items);
  const goalLine = packVersusGoal(baseGrams, goalKg);
  const editingItem = editing?.kind === 'edit' ? items.find((i) => i.id === editing.id) : undefined;

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-4">
      <PageHeader eyebrow="Reis" title="Paklijst" line="Wat er in je rugzak gaat" fallback="/reis" />

      <Card className="flex flex-col gap-1" texture>
        <Eyebrow>BASISGEWICHT</Eyebrow>
        <p className="font-sans tabular-nums text-4xl" style={{ color: 'var(--color-gold)' }}>{formatKg(baseGrams)}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Alles wat in je rugzak zit, zonder eten en water. Het is de knop waar je zelf het meest aan kunt draaien.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{progress.have} van {progress.total} onderdelen heb je al</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>VERTREKGEWICHT</Eyebrow>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Wat je draagt als je uit een dorp vertrekt: je basisgewicht plus eten en water. We rekenen {formatNumberNL(FOOD_KG_PER_DAY, 1)} kg droog eten per dag en 1 kg per liter water.
        </p>
        <div role="table" aria-label="Vertrekgewicht per aantal dagen eten en liters water" className="flex flex-col">
          <div role="row" className="flex items-center border-b pb-1.5 text-xs" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
            <span role="columnheader" className="flex-1">Eten voor</span>
            {WATER_LITER_OPTIONS.map((l) => (
              <span role="columnheader" key={l} className="w-24 text-right">met {l} liter</span>
            ))}
          </div>
          {departureTable(baseGrams).map((row) => (
            <div role="row" key={row.foodDays} className="flex min-h-[40px] items-center border-b last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <span role="rowheader" className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>{row.foodDays} dagen</span>
              {row.kg.map((kg, i) => (
                <span role="cell" key={WATER_LITER_OPTIONS[i]} className="w-24 text-right font-sans tabular-nums text-lg" style={{ color: 'var(--color-ink)' }}>
                  {formatNumberNL(kg, 1)} kg
                </span>
              ))}
            </div>
          ))}
        </div>
        {goalLine && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-gold)' }}>{goalLine}</p>}
      </Card>

      {PACK_GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <Card key={group} className="flex flex-col !p-3">
            <div className="flex items-baseline justify-between px-1 pb-1">
              <Eyebrow>{PACK_GROUP_LABEL[group].toUpperCase()}</Eyebrow>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatKg(groupWeightGrams(items, group))}</span>
            </div>
            {groupItems.map((it) => (
              <div key={it.id} className="flex items-center gap-1 border-b last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
                <CheckCircle checked={it.have} onToggle={() => change((list) => updateItem(list, it.id, { have: !it.have }))} label={`${it.name}: ${it.have ? 'heb ik nog niet' : 'heb ik'}`} />
                <button onClick={() => setEditing({ kind: 'edit', id: it.id })} aria-label={`${it.name} aanpassen`} className="flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-3 py-1.5 text-left">
                  <span className="min-w-0 text-sm leading-snug" style={{ color: it.have ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{it.name}</span>
                  <span className="shrink-0 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatGrams(it.grams)}</span>
                </button>
              </div>
            ))}
          </Card>
        );
      })}

      {items.length === 0 && (
        <Card><p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je lijst is leeg. Voeg een onderdeel toe, of ga terug naar de voorbeeldlijst.</p></Card>
      )}

      <SecondaryButton onClick={() => setEditing({ kind: 'add', group: 'overig' })}>+ Onderdeel toevoegen</SecondaryButton>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        De voorbeeldlijst is een solo bivakopzet voor augustus, licht maar comfortabel, met afgeronde gewichten van gangbare modellen. Pas de gewichten aan zodra je iets in huis hebt en weegt. Vink af wat je hebt.
      </p>

      {customised && (
        <div className="flex flex-col items-start gap-1">
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="min-h-[44px] text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
              Terug naar de voorbeeldlijst
            </button>
          ) : (
            <>
              <p className="text-xs" style={{ color: 'var(--color-warning)' }}>Al je aanpassingen en vinkjes op deze lijst gaan verloren.</p>
              <div className="flex gap-4">
                <button onClick={() => { reset(); setConfirmReset(false); }} className="min-h-[44px] text-xs underline underline-offset-2" style={{ color: 'var(--color-danger-text)' }}>Ja, terug naar het voorbeeld</button>
                <button onClick={() => setConfirmReset(false)} className="min-h-[44px] text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>Annuleren</button>
              </div>
            </>
          )}
        </div>
      )}

      {editing?.kind === 'edit' && editingItem && (
        <PackItemSheet
          item={editingItem}
          onSave={(v) => change((list) => updateItem(list, editingItem.id, v))}
          onDelete={() => change((list) => removeItem(list, editingItem.id))}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'add' && (
        <PackItemSheet
          defaultGroup={editing.group}
          onSave={(v) => change((list) => addItem(list, { id: makeId('pack'), have: false, ...v } satisfies PackItem))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
