import type { Quote } from '../data/quoteLibrary';
import { authorWikipediaUrl } from '../utils/quotes';
import { Card } from './ui';

export function QuoteCard({ quote }: { quote: Quote }) {
  const wikipediaUrl = authorWikipediaUrl(quote.author);

  return (
    <Card className="text-center">
      <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        “{quote.quote}”
      </p>
      <p className="mt-2 text-xs tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>
        —{' '}
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
