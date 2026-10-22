import { useState } from 'react';
import { Icon } from './icons';
import type { Quote } from '../data/quoteLibrary';
import { authorWikipediaUrl, quoteSourceLabel } from '../utils/quotes';
import { QUOTE_NL } from '../data/quoteTranslations';

export function QuoteCard({ quote }: { quote: Quote }) {
  const wikipediaUrl = authorWikipediaUrl(quote.author);
  // The original stays the quote; the Dutch translation only on request.
  const translation = QUOTE_NL[quote.id];
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <figure className="flex flex-col items-center px-3 pt-2 text-center">
      <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        “{quote.quote}”
      </p>
      {translation && (showTranslation ? (
        <button type="button" onClick={() => setShowTranslation(false)} className="mt-2 w-full text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }} aria-label="Vertaling verbergen">
          {translation.text}
        </button>
      ) : (
        <button type="button" onClick={() => setShowTranslation(true)} className="mt-1 min-h-[44px] text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
          Vertaling
        </button>
      ))}
      <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {wikipediaUrl ? (
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center underline underline-offset-2"
            style={{ color: 'var(--color-bronze)' }}
          >
            {translation?.author ?? quote.author}
          </a>
        ) : (
          <span style={{ color: 'var(--color-bronze)' }}>{translation?.author ?? quote.author}</span>
        )}
      </p>
      {quote.sourceUrl && (
        <a
          href={quote.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center gap-1 text-xs underline underline-offset-2"
          style={{ color: 'var(--color-sky)' }}
        >
          {quoteSourceLabel(quote.sourceLabel)}
          <Icon name="buiten" size={14} />
        </a>
      )}
    </figure>
  );
}
