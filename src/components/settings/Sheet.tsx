import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSheetClose } from '../../utils/useSheetClose';
import { SETTINGS_HELP, settingsHelp } from '../../data/settingsHelp';
import { useAppData } from '../../state/AppDataContext';
import { Portal } from '../Portal';
import { Icon } from '../icons';
import { Eyebrow } from '../ui';
import './settings.css';

// Het onderblad van de instellingen: een greep, de groep als Eyebrow, de titel in
// Marcellus 24 px, een sluitknop van 44 px en één regel eronder. Het blad scrolt
// onder de kop. Gemaakt van dezelfde onderdelen als TodaySheet (Portal en
// useSheetClose), zodat Vandaag niet verandert.
// `children` mag een functie zijn die een manier krijgt om het blad te sluiten.
export function Sheet({
  eyebrow,
  title,
  line,
  onClose,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  line?: string;
  onClose: () => void;
  // Een knop links van het kruisje (de drie puntjes van een doel), 44 bij 44 px.
  action?: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div
        className={`st-sheet-root fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          aria-label={title}
          className={`st-sheet ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="st-grip" />
          <div className="st-sh">
            <div className="min-w-0">
              <div className="st-eyebrow"><Eyebrow>{eyebrow}</Eyebrow></div>
              <h2>{title}</h2>
            </div>
            <div className="flex items-start">
              {action}
              <button type="button" className="st-close" aria-label="Sluiten" onClick={requestClose}>
                <Icon name="sluiten" size={22} />
              </button>
            </div>
            {line && <p>{line}</p>}
          </div>
          <div className="st-sheet-body">{typeof children === 'function' ? children(requestClose) : children}</div>
        </div>
      </div>
    </Portal>
  );
}

// Uitleg die snel te lezen is: één zin vooraf, daarna korte punten met een
// vetgedrukt begin. De teksten staan in data/settingsHelp.ts.
export function InfoSheet({ helpKey, onClose }: { helpKey: string; onClose: () => void }) {
  const { settings } = useAppData();
  const help = settingsHelp(helpKey, settings.influenceNames !== false);
  if (!help) return null;
  return (
    <Sheet eyebrow="Uitleg" title={help.title} onClose={onClose}>
      {(close) => (
        <>
          <p className="st-lead">{help.lead}</p>
          <ul className="st-points">
            {help.points.map((p) => (
              <li key={p.head}>
                <span><b>{p.head}:</b> {p.text}</span>
              </li>
            ))}
          </ul>
          <div className="st-btns">
            <button type="button" className="st-btn" onClick={close}>Begrepen</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

export interface ChoiceOption<T> {
  value: T;
  label: string;
  // Eén regel onder de naam: wat de keuze doet.
  note?: string;
}

// De lijst met opties van een keuze: het gouden vinkje bij de keuze en "Advies" als bronzen
// label bij het advies. Los te gebruiken in een blad met meer dan één keuze.
export function ChoiceList<T extends string | number>({
  label,
  options,
  value,
  advice,
  onPick,
}: {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  advice?: T;
  onPick: (value: T) => void;
}) {
  return (
    <div className="st-list" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`st-opt${o.note ? '' : ' one'}`}
          onClick={() => onPick(o.value)}
        >
          <span>
            <span className="l">
              {o.label}
              {advice !== undefined && o.value === advice && <span className="st-tag">Advies</span>}
            </span>
            {o.note && <span className="n st-num">{o.note}</span>}
          </span>
          <span className="ck">{o.value === value && <Icon name="gedaan" size={24} />}</span>
        </button>
      ))}
    </div>
  );
}

// Een keuze uit een paar opties, in een onderblad: "Advies" als bronzen label bij
// het advies, het gouden vinkje bij de keuze, en na een keuze sluit het blad na
// 240 ms. Bestaat er uitleg, dan staat onderaan een rij "Meer uitleg".
export function ChoiceSheet<T extends string | number>({
  eyebrow,
  title,
  line,
  options,
  value,
  advice,
  helpKey,
  onPick,
  onClose,
  keepOpen = false,
  footer,
}: {
  eyebrow: string;
  title: string;
  line?: string;
  options: ChoiceOption<T>[];
  value: T;
  advice?: T;
  helpKey?: string;
  onPick: (value: T) => void;
  onClose: () => void;
  // Het blad blijft open na een keuze (bij een keuze die verder gaat in hetzelfde blad).
  keepOpen?: boolean;
  footer?: ReactNode;
}) {
  const [help, setHelp] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <>
      <Sheet eyebrow={eyebrow} title={title} line={line} onClose={onClose}>
        {(close) => {
          closeRef.current = close;
          return (
            <>
              <ChoiceList
                label={title}
                options={options}
                value={value}
                advice={advice}
                onPick={(v) => {
                  onPick(v);
                  if (!keepOpen) timer.current = window.setTimeout(() => closeRef.current?.(), 240);
                }}
              />
              {helpKey && SETTINGS_HELP[helpKey] && (
                <button type="button" className="st-more" style={{ marginTop: 8 }} onClick={() => setHelp(true)}>
                  <span>Meer uitleg</span>
                  <Icon name="verder" size={16} />
                </button>
              )}
              {footer}
            </>
          );
        }}
      </Sheet>
      {help && helpKey && <InfoSheet helpKey={helpKey} onClose={() => setHelp(false)} />}
    </>
  );
}

// Een rij met knoppen onderaan een blad. De ene gouden knop van het blad krijgt
// de klasse `st-btn gold`.
export function SheetButtons({ children, column = false, first = false }: { children: ReactNode; column?: boolean; first?: boolean }) {
  return <div className={`st-btns${column ? ' col' : ''}${first ? ' first' : ''}`}>{children}</div>;
}
