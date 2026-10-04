import { useState } from 'react';
import type { Quote } from '../data/quoteLibrary';
import { authorWikipediaUrl } from '../utils/quotes';
import { QUOTE_NL } from '../data/quoteTranslations';
import { Card } from './ui';

export function QuoteCard({ quote }: { quote: Quote }) {
  const wikipediaUrl = authorWikipediaUrl(quote.author);
  // The original stays the quote; the Dutch translation only on request.
  const translation = QUOTE_NL[quote.id];
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <Card className="text-center">
      <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        “{quote.quote}”
      </p>
      {translation && (showTranslation ? (
        <button type="button" onClick={() => setShowTranslation(false)} className="mt-2 w-full text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }} aria-label="Vertaling verbergen">
          {translation.text}
        </button>
      ) : (
        <button type="button" onClick={() => setShowTranslation(true)} className="mt-1 min-h-[32px] text-[11px] tracking-wide underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
          Vertaling
        </button>
      ))}
      <p className="mt-2 text-xs tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
        –{' '}
        {wikipediaUrl ? (
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: 'var(--color-bronze)' }}
          >
            {quote.author}
          </a>
        ) : (
          <span style={{ color: 'var(--color-bronze)' }}>{quote.author}</span>
        )}
      </p>
      {quote.sourceUrl && (
        <a
          href={quote.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-[11px] underline underline-offset-2"
          style={{ color: 'var(--color-sky)' }}
        >
          {quote.sourceLabel ?? 'Bron'} ↗
        </a>
      )}
    </Card>
  );
}
