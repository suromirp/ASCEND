import { useState } from 'react';
import { Icon } from './icons';
import { Sheet } from './settings/Sheet';
import type { Quote } from '../data/quoteLibrary';
import type { QuoteLanguage } from '../engine/quoteSettings';
import { authorWikipediaUrl, quoteSourceLabel } from '../utils/quotes';
import { QUOTE_NL } from '../data/quoteTranslations';

// Het citaat onderaan Vandaag: één rustig blok, in de taal van de instelling "Citaat op Vandaag"
// (standaard Engels, de gangbare vertaling uit de bibliotheek). Een tik op het citaat wisselt naar de
// andere taal als die er is en een tweede tik wisselt terug. De bronregel opent een blad met het
// origineel, de vertaling en de bronlinks.
export function QuoteCard({ quote, language = 'en' }: { quote: Quote; language?: Exclude<QuoteLanguage, 'off'> }) {
  const translation = QUOTE_NL[quote.id];
  const [flipped, setFlipped] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  // Nederlands staat eerst als dat gekozen is en er een vertaling is; Engels is het origineel uit de bibliotheek.
  const dutchFirst = language === 'nl';
  const showDutch = !!translation && (dutchFirst ? !flipped : flipped);
  const author = showDutch ? translation?.author ?? quote.author : quote.author;
  const englishWork = quote.sourceLabel ? quoteSourceLabel(quote.sourceLabel).split(', vertaling')[0] : undefined;
  const work = showDutch ? translation?.source ?? englishWork : englishWork;
  const sourceLine = work ? `${author} · ${work}` : author;
  const shown = showDutch && translation ? translation.text : quote.quote;
  const wikipediaUrl = authorWikipediaUrl(quote.author);

  return (
    <figure className="flex flex-col items-center px-3 pt-4 text-center">
      <div className="mb-3 h-px w-10" style={{ background: 'var(--color-action)', opacity: 0.6 }} aria-hidden="true" />
      {translation ? (
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="min-h-[44px] font-display text-base leading-relaxed"
          style={{ color: 'var(--color-ink-dim)' }}
          aria-label={showDutch ? 'Origineel tonen' : 'Nederlandse vertaling tonen'}
        >
          “{shown}”
        </button>
      ) : (
        <p className="font-display text-base leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>“{shown}”</p>
      )}
      <button
        type="button"
        onClick={() => setSourceOpen(true)}
        className="mt-1 flex min-h-[44px] items-center gap-1 px-3 text-xs"
        style={{ color: 'var(--color-ink-dim)' }}
      >
        {sourceLine}
        <Icon name="verder" size={14} />
      </button>
      {sourceOpen && (
        <Sheet eyebrow="Bron" title={author} onClose={() => setSourceOpen(false)}>
          <div className="flex flex-col gap-3 px-4 pb-6 pt-3 text-left">
            <p className="font-display text-base leading-relaxed" style={{ color: 'var(--color-ink)' }}>“{quote.quote}”</p>
            {translation && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{translation.text}</p>}
            {work && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{work}</p>}
            {quote.sourceUrl && <SourceRow href={quote.sourceUrl} label={quoteSourceLabel(quote.sourceLabel)} />}
            {wikipediaUrl && <SourceRow href={wikipediaUrl} label={`Over ${author}`} />}
          </div>
        </Sheet>
      )}
    </figure>
  );
}

function SourceRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 text-sm"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <span>{label}</span>
      <Icon name="buiten" size={16} />
    </a>
  );
}
