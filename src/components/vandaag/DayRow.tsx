import { Fragment, useState, type ReactNode } from 'react';
import { Eyebrow } from '../ui';
import { arrangeYourDay, moreRowText, type YourDayItem } from '../../engine/yourDay';
import { TodaySheet } from './TodaySheet';
import type { IconName } from '../icons';
import type { SessionTemplate } from '../../models/training';
import { IconDisc, SportDisc } from '../SportDisc';
import { ChevronGlyph } from './glyphs';

// "Je dag" op Vandaag: wat je vandaag naast je training zelf nog doet (docs/visie/Ontwerp Je dag.md).
// Een lijst op één kaart, per regel een icoon in een getinte schijf, de titel, één regel eronder en
// rechts een rondje (afvinken) of een pijltje (een blad). Elke regel is minstens 44 px.

export type DayRowState = 'todo' | 'now' | 'done' | 'skipped';

export type YourDayEntry = YourDayItem & { node: ReactNode };

const LIST_CLASS = 'overflow-hidden rounded-2xl border';
const LIST_STYLE = { background: 'var(--color-card)', borderColor: 'var(--color-card-border)' };

// Hoogstens vier rijen (engine/yourDay.ts#arrangeYourDay); de rest achter de rij "Nog 2", die het
// blad Je dag met de hele lijst opent. Niets te doen: geen kop en geen kaart.
export function YourDay({ items }: { items: YourDayEntry[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const { shown, more } = arrangeYourDay(items);
  const moreText = moreRowText(more);
  return (
    <section aria-label="Je dag" data-your-day-rows={shown.length + (more.length > 0 ? 1 : 0)}>
      <div className="mb-2"><Eyebrow>Je dag</Eyebrow></div>
      <ol className={LIST_CLASS} style={LIST_STYLE}>
        {shown.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
        {more.length > 0 && (
          <DayRow label={moreText.line} icon="meer" onClick={() => setOpen(true)} sheetFrom>{moreText.title}</DayRow>
        )}
      </ol>
      {open && (
        <TodaySheet eyebrow="Je dag" onClose={() => setOpen(false)}>
          <ol className={LIST_CLASS} style={LIST_STYLE}>
            {[...shown, ...more].map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}
          </ol>
        </TodaySheet>
      )}
    </section>
  );
}

// Het pictogram bij een regel, naar het label.
const ICON_BY_LABEL: Record<string, IconName | 'maan'> = {
  Gedaan: 'vinkje',
  Gevoel: 'vandaagStip',
  Gewicht: 'schijf',
  Reis: 'vlag',
  Vraag: 'info',
  Ochtend: 'rekken',
  Avond: 'rekken',
  Rekken: 'rekken',
  Morgen: 'week',
};

export function DayRow({
  label,
  state = 'todo',
  onClick,
  children,
  trailing,
  action,
  chevron = true,
  icon,
  template,
  sheetFrom = false,
}: {
  // De regel onder de titel ("Training", "Gedaan", "Morgen").
  label: string;
  state?: DayRowState;
  onClick: () => void;
  children: ReactNode;
  // Kleine tekst bij het label, bijvoorbeeld de duur.
  trailing?: ReactNode;
  // Een eigen knop rechts naast de regel (een vinkje, "Gaat goed").
  action?: ReactNode;
  chevron?: boolean;
  icon?: IconName | 'maan';
  // Een training: de schijf met het pictogram van zijn sport (stijl C), met een vinkje als hij gedaan is.
  template?: SessionTemplate;
  // Het blad dat deze rij opent groeit eruit (utils/sheetGrowDom.ts).
  sheetFrom?: boolean;
}) {
  const shown = icon ?? ICON_BY_LABEL[label] ?? 'gepland';
  const tone = state === 'now' ? 'status' : state === 'done' ? 'progress' : 'neutral';
  return (
    <li className="flex min-h-[56px] items-center border-t first:border-t-0" data-state={state} style={{ borderColor: 'var(--color-card-border)', opacity: state === 'skipped' ? 0.6 : 1 }}>
      <button onClick={onClick} data-sheet-from={sheetFrom ? '' : undefined} className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        {template ? <SportDisc template={template} size={40} done={state === 'done'} /> : <IconDisc icon={state === 'done' && shown === 'gepland' ? 'vinkje' : shown} tone={tone} />}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug" style={{ color: state === 'done' || state === 'skipped' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{children}</span>
          <span className="block text-xs leading-4" style={{ color: state === 'now' ? 'var(--color-status)' : 'var(--color-ink-dim)' }}>
            {label}
            {trailing && <span className="tabular-nums"> · {trailing}</span>}
          </span>
        </span>
        {!action && chevron && <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>}
      </button>
      {action && <span className="pr-1">{action}</span>}
    </li>
  );
}
