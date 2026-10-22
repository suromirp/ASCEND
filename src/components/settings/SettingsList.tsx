import { useContext, useState, type ReactNode } from 'react';
import { settingsAnchor } from '../../data/settingsIndex';
import { haptics } from '../../utils/haptics';
import { Icon } from '../icons';
import { AutoTag, Eyebrow, InfoButton, ToggleVisual } from '../ui';
import { InfoSheet } from './Sheet';
import { SettingsJumpContext } from './jumpContext';
import './settings.css';

// De bouwstenen van de instellingen (docs/beslissingen/2026-10-22-instellingen-in-groepen.md):
// een lijst met haarlijnen, een kopje met een lijst eronder, en de ene rij die
// elke instelling is. Geen logica: de pagina's geven de waarden door, die uit
// engine/settingsSummary.ts komen.

export function SettingsList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`st-list ${className}`}>{children}</div>;
}

const ADV_KEY = 'ascend.instellingen.geavanceerd';

function readAdvanced(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ADV_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeAdvanced(key: string, open: boolean) {
  try {
    localStorage.setItem(ADV_KEY, JSON.stringify({ ...readAdvanced(), [key]: open }));
  } catch {
    // Alleen gemak: zonder opslag staat Geavanceerd bij het openen dicht.
  }
}

// Een kopje (Eyebrow) met 24 px erboven en 8 px eronder, daaronder de lijst. Rijen
// die achter "Geavanceerd" horen staan in `advanced`; `advancedIds` zijn hun id's,
// zodat een sprong ernaartoe de rij eerst openklapt. Of het open staat, onthoudt
// de telefoon per kijker (localStorage, alleen gemak).
export function SettingsSection({
  title,
  children,
  advanced,
  advancedIds = [],
  storageKey,
}: {
  title?: string;
  children: ReactNode;
  advanced?: ReactNode;
  advancedIds?: string[];
  storageKey?: string;
}) {
  const jump = useContext(SettingsJumpContext);
  const key = storageKey ?? title ?? 'sectie';
  const [open, setOpen] = useState(() => readAdvanced()[key] === true);
  const forced = jump.target !== undefined && advancedIds.includes(jump.target);
  const shown = open || forced;
  return (
    <>
      {title ? <div className="st-eyebrow"><Eyebrow>{title}</Eyebrow></div> : <div className="st-eyebrow-gap" />}
      <SettingsList>
        {children}
        {advanced && (
          <>
            <button
              type="button"
              className="st-more"
              aria-expanded={shown}
              onClick={() => {
                setOpen(!shown);
                writeAdvanced(key, !shown);
              }}
            >
              <span>Geavanceerd</span>
              <Icon name="verder" size={16} />
            </button>
            {shown && advanced}
          </>
        )}
      </SettingsList>
    </>
  );
}

export type RowKind = 'nav' | 'toggle' | 'static' | 'danger';

export interface SettingsRowProps {
  // Het anker is instelling-<id>; hetzelfde id als in data/settingsIndex.ts waar het kan.
  id: string;
  title: string;
  kind?: RowKind;
  value?: ReactNode;
  // Hoogstens één regel: een feit of een bron, nooit uitleg.
  sub?: string;
  // Wat ASCEND zelf bijhoudt: het kleine label "auto".
  auto?: boolean;
  // Niet ingesteld of uit: de waarde staat gedimd.
  dim?: boolean;
  dot?: 'ok' | 'no' | 'gold';
  // De sleutel van een uitleg in data/settingsHelp.ts.
  info?: string;
  onClick?: () => void;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  // Een rij zonder pijltje (het pijltje blijft als lege kolom, zodat waarden recht staan).
  noChevron?: boolean;
  // Een groepsrij op het overzicht: de naam in Marcellus.
  group?: boolean;
  // Voor een rij die gedimd is als geheel (Health Connect, komt later).
  off?: boolean;
  // Een tel lichten (het tandwiel op een tab wijst de groep van die tab aan).
  highlight?: boolean;
  // Een zoekresultaat: de titel over de volle breedte, daaronder links de groep (`sub`) en rechts de waarde.
  result?: boolean;
}

// Eén instelling. Links de titel, rechts de waarde, daaronder hoogstens één regel.
// De hele rij is het tikdoel: een knop over de rij heen, met de InfoButton ernaast
// (niet erin). Hoogte 52 px, met een tweede regel 68 px, een groep 72 px.
export function SettingsRow(props: SettingsRowProps) {
  const { id, title, kind = 'nav', value, sub, auto, dim, dot, info, onClick, checked, onChange, noChevron, group, off, highlight, result } = props;
  const [help, setHelp] = useState(false);
  const toggle = kind === 'toggle';
  const hasValue = value !== undefined && value !== null && value !== '';
  const classes = [
    'st-row',
    toggle ? 'toggle' : 'go',
    sub ? 'two' : '',
    group ? 'grp' : '',
    kind === 'danger' ? 'danger' : '',
    off ? 'off' : '',
    highlight ? 'flash' : '',
    result ? 'result' : '',
  ].filter(Boolean).join(' ');
  const label = hasValue && typeof value === 'string' ? `${title}, ${value}` : title;
  return (
    <div className={classes} id={settingsAnchor(id)} data-row={id}>
      {toggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={!!checked}
          aria-label={title}
          className="st-hit"
          onClick={() => {
            haptics.tap();
            onChange?.(!checked);
          }}
        />
      ) : kind !== 'static' ? (
        <button type="button" className="st-hit" aria-label={label} onClick={onClick} />
      ) : null}
      <span className="t">
        <span className="st-title-text">{title}</span>
        {info && (
          <span className="info-slot">
            <InfoButton compact label={`Uitleg: ${title}`} onClick={() => setHelp(true)} />
          </span>
        )}
      </span>
      {sub && <span className="s st-num">{sub}</span>}
      {toggle ? (
        <span className="sw"><ToggleVisual checked={!!checked} /></span>
      ) : (
        <>
          {(hasValue || auto || dot) && (
            <span className={`v${dim ? ' dim' : ''}`}>
              {auto && <AutoTag />}
              {dot && <span className={`st-dot ${dot}`} aria-hidden="true" />}
              {hasValue && <span className="st-num">{value}</span>}
            </span>
          )}
          <span className="chev">{kind !== 'static' && !noChevron && <Icon name="verder" size={16} />}</span>
        </>
      )}
      {help && info && <InfoSheet helpKey={info} onClose={() => setHelp(false)} />}
    </div>
  );
}

// Een rij met een getalveld rechts (hartslag, minuten). De rij is 52 px; het veld
// zelf 40 px. Het veld is zelf het tikdoel, de rij geen knop.
export function SettingsFieldRow({ id, title, info, children }: { id: string; title: string; info?: string; children: ReactNode }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="st-row field" id={settingsAnchor(id)} data-row={id}>
      <span className="t">
        <span className="st-title-text">{title}</span>
        {info && (
          <span className="info-slot">
            <InfoButton compact label={`Uitleg: ${title}`} onClick={() => setHelp(true)} />
          </span>
        )}
      </span>
      <span className="v">{children}</span>
      {help && info && <InfoSheet helpKey={info} onClose={() => setHelp(false)} />}
    </div>
  );
}

// Een lege toestand in een lijst: één zin en eventueel één knop.
export function SettingsEmpty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="st-empty">
      <p>{text}</p>
      {action}
    </div>
  );
}
