// ASCEND: het invoerpaneel van het workoutscherm van Forge. Geen blad over de
// tabel maar een vast cijferblok onderaan: de tabel blijft erboven zichtbaar en
// scrolt zo dat het veld dat je bewerkt net boven het paneel staat. Bij een stang
// staat bovenin de stang met de schijven per kant. Alle regels (stappen, toetsen,
// schijven vertellen) staan in engine/forgeInput.ts; dit bestand toont ze.
// Besluit: docs/beslissingen/2026-10-23-forge-soepel.md.
//
// De ene opvallende knop hier is "Volgende" in sneeuwwit: de ene gouden knop van
// dit scherm is Afronden bovenin, dus het paneel blijft steen en licht.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  numberToText,
  plateChange,
  plateGroups,
  plateSentence,
  plateShortText,
  plateTone,
  pressKey,
  textToNumber,
  type PadKey,
} from '../../engine/forgeInput';
import type { PlateStep } from '../../engine/forgeWorkout';
import { haptics } from '../../utils/haptics';
import { formatNumberNL } from '../../utils/number';
import { useSheetClose } from '../../utils/useSheetClose';
import { Icon } from '../icons';
import { Portal } from '../Portal';
import { PlateBar } from './PlateBar';

export interface DockProps {
  // Wat je bewerkt, in woorden: "Gewicht, set 2".
  label: string;
  // De sleutel van het veld: bij een ander veld begint het getal weer "geselecteerd".
  fieldKey: string;
  value: number | undefined;
  decimals: number;
  onChange: (value: number | undefined) => void;
  // Een stap omhoog of omlaag: de waarde die het wordt (de engine rekent, het paneel toont).
  onStep: (direction: 1 | -1) => number;
  onSelected: (selected: boolean) => void;
  // Volgende veld; krijgt de sluitfunctie mee voor het einde van de training.
  onNext: (close: () => void) => void;
  onClose: () => void;
  onHeight: (px: number) => void;
  // Alleen bij een stang of een toestel met schijven.
  plate?: PlateStep;
  plateOn: boolean;
  onTogglePlates: () => void;
}

const DIGITS: PadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Key({ children, onPress, label, className = '', style, disabled }: { children: ReactNode; onPress: () => void; label: string; className?: string; style?: React.CSSProperties; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      // Pointerdown: reageert meteen, zonder de vertraging van een klik, en houdt de focus buiten het paneel.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={`flex min-h-[48px] items-center justify-center rounded-xl font-sans tabular-nums disabled:opacity-30 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

export function InputDock(props: DockProps) {
  const { label, fieldKey, value, decimals, onChange, onStep, onSelected, onNext, onClose, onHeight, plate, plateOn, onTogglePlates } = props;
  const { closing, requestClose } = useSheetClose(onClose, 200);
  const plateShown = plate !== undefined && plateOn;
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(() => numberToText(value, decimals));
  const [fresh, setFresh] = useState(true);
  const [seenKey, setSeenKey] = useState(fieldKey);
  // Een ander veld: het getal staat er weer en is geselecteerd.
  if (seenKey !== fieldKey) {
    setSeenKey(fieldKey);
    setText(numberToText(value, decimals));
    setFresh(true);
  }
  // Een verandering van buiten (een stap, het voorschrift) zonder half getypte tekst te overschrijven.
  if (textToNumber(text, decimals) !== value && !(text === '' && value === undefined) && !(text.endsWith(',') && textToNumber(text, decimals) === value)) {
    setText(numberToText(value, decimals));
  }

  // De hoogte van het paneel, zodat de tabel en de rusttimer erboven kunnen blijven.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const report = () => onHeight(Math.round(el.getBoundingClientRect().height));
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight, plateShown]);
  useEffect(() => {
    if (closing) onHeight(0);
  }, [closing, onHeight]);
  useEffect(() => () => onHeight(0), [onHeight]);

  function press(key: PadKey) {
    const next = pressKey(text, key, { decimals, fresh });
    haptics.tap();
    setText(next);
    setFresh(false);
    onSelected(false);
    onChange(textToNumber(next, decimals));
  }

  function step(direction: 1 | -1) {
    haptics.tap();
    const next = onStep(direction);
    setText(numberToText(next, decimals));
    setFresh(true);
    onSelected(true);
  }

  const showPlates = plateShown;
  const change = plate ? plateChange(plate) : undefined;
  const sideKey = 'bg-[var(--color-surface)] active:bg-[var(--color-card-border)]';
  return (
    <Portal>
      <div
        ref={root}
        role="group"
        aria-label={`Invoer: ${label}`}
        className={`fixed inset-x-0 bottom-0 z-[55] ${closing ? 'forge-down' : 'forge-up'}`}
        style={{ ['--forge-fill' as string]: 'var(--color-card)' }}
      >
        <div className="mx-auto max-w-md rounded-t-2xl border border-b-0" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
          {showPlates && plate && (
            <div className="border-b px-4 pb-2 pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              <div className="flex items-center gap-4">
                <PlateBar perSide={plate.perSide} />
                <ul className="flex min-w-0 flex-1 flex-col gap-1 font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }} aria-label="Schijven per kant">
                  {plate.perSide.length === 0 && <li style={{ color: 'var(--color-ink-dim)' }}>Alleen de stang</li>}
                  {plateGroups(plate.perSide).map((g) => (
                    <li key={g.kg} className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: plateTone(g.kg) }} aria-hidden="true" />
                      {g.count} × {formatNumberNL(g.kg, 2)}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 font-sans text-xs leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{plateSentence(plate)}</p>
              <p className="min-h-[16px] font-sans text-xs leading-snug tabular-nums" style={{ color: plate.shortKg > 0 ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
                {plate.shortKg > 0 ? plateShortText(plate) : (change ?? 'Niets wisselen ten opzichte van de vorige set.')}
              </p>
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_1fr_1.25fr] gap-1.5 px-3 pt-2">
            {DIGITS.map((k) => (
              <Key key={k} label={k} onPress={() => press(k)} className="text-xl active:bg-[var(--color-surface)]" style={{ color: 'var(--color-ink)' }}>{k}</Key>
            ))}
            <Key label="Komma" onPress={() => press(',')} disabled={decimals === 0} className="text-xl active:bg-[var(--color-surface)]" style={{ color: 'var(--color-ink)' }}>{decimals > 0 ? ',' : ''}</Key>
            <Key label="0" onPress={() => press('0')} className="text-xl active:bg-[var(--color-surface)]" style={{ color: 'var(--color-ink)' }}>0</Key>
            <Key label="Wissen" onPress={() => press('back')} className="active:bg-[var(--color-surface)]" style={{ color: 'var(--color-ink)' }}><Icon name="wissen" size={24} /></Key>

            {/* De rechterkolom, van boven naar beneden. */}
            <div className="col-start-4 row-start-1 flex">
              <Key label="Toetsenblok verbergen" onPress={requestClose} className={`w-full ${sideKey}`} style={{ color: 'var(--color-ink-dim)' }}><Icon name="toetsenbordweg" size={24} /></Key>
            </div>
            <div className="col-start-4 row-start-2 flex">
              <Key label={plateOn ? 'Schijven verbergen' : 'Schijven tonen'} onPress={onTogglePlates} disabled={!plate} className={`w-full ${sideKey}`} style={{ color: plate && plateOn ? 'var(--color-ink)' : 'var(--color-ink-dim)', boxShadow: plate && plateOn ? 'inset 0 0 0 1px var(--color-control-border)' : undefined }}>
                <Icon name="stang" size={24} />
              </Key>
            </div>
            <div className="col-start-4 row-start-3 grid grid-cols-2 gap-1.5">
              <Key label="Minder" onPress={() => step(-1)} className={sideKey} style={{ color: 'var(--color-ink)' }}><Icon name="min" size={22} /></Key>
              <Key label="Meer" onPress={() => step(1)} className={sideKey} style={{ color: 'var(--color-ink)' }}><Icon name="plus" size={22} /></Key>
            </div>
            <div className="col-start-4 row-start-4 flex">
              <Key label="Volgende" onPress={() => { haptics.tap(); onNext(requestClose); }} className="w-full" style={{ background: 'var(--color-snow)', color: 'var(--color-on-gold)' }}><Icon name="pijlrechts" size={26} /></Key>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
