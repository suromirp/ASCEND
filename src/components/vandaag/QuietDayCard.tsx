import type { ReactNode } from 'react';
import { Card, Eyebrow, PrimaryButton } from '../ui';
import { CheckGlyph, ValleyLines } from './glyphs';

// Een rustdag is geen leeg vak maar een dal (docs/visie/Visuele upgrade en
// nieuwe ideeën.md, Lege toestanden): rustige hoogtelijnen met een gouden stip
// onderin, één zin, hooguit één actie en wat morgen komt. Op een dag zonder
// training is dit de missiekaart van het scherm, dus de enige met hoogtelijnen.
export function QuietDayCard({
  title,
  body,
  detail,
  doneLabel,
  onDone,
  linkLabel,
  onLink,
  tomorrow,
}: {
  title: string;
  body: string;
  // Een tweede zin, bijvoorbeeld wat een hersteldag inhoudt.
  detail?: string;
  // Alleen bij een hersteldag: één tik om het af te vinken.
  doneLabel?: string;
  onDone?: () => void;
  // "Toch gewandeld?": de ene stille actie.
  linkLabel?: string;
  onLink?: () => void;
  // "Morgen: duurloop, 40 min"
  tomorrow?: string;
}) {
  return (
    <section
      className="topo-mission relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
      aria-label="Vandaag"
    >
      <Eyebrow>VANDAAG</Eyebrow>
      <h2 className="font-display text-[28px] leading-tight" style={{ color: 'var(--color-ink)' }}>{title}</h2>
      <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>{body}</p>
      {detail && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{detail}</p>}
      <div className="my-1"><ValleyLines /></div>
      {doneLabel && onDone && <PrimaryButton onClick={onDone}>{doneLabel}</PrimaryButton>}
      {(linkLabel || tomorrow) && (
        <div className="-mb-1 flex flex-wrap items-center justify-between gap-x-3">
          {linkLabel && onLink ? (
            <button onClick={onLink} className="inline-flex min-h-[44px] items-center whitespace-nowrap text-sm font-medium" style={{ color: 'var(--color-ink-dim)' }}>{linkLabel}</button>
          ) : <span />}
          {tomorrow && <span className="whitespace-nowrap text-right text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{tomorrow}</span>}
        </div>
      )}
    </section>
  );
}

// Na het afvinken wordt de missie klein: een vinkje, wat je deed en wat
// morgen komt. Het moment zelf (direct na Gedaan) is een ander scherm.
export function DoneTodayCard({ title, line, tomorrow, children }: { title: string; line: string; tomorrow?: string; children?: ReactNode }) {
  return (
    <Card className="flex items-start gap-3">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
        aria-hidden="true"
      >
        <CheckGlyph size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>
        {tomorrow && <p className="mt-2 text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{tomorrow}</p>}
        {children}
      </div>
    </Card>
  );
}
