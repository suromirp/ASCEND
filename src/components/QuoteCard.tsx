import type { Quote } from '../data/quoteLibrary';
import { Card } from './ui';

export function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <Card className="text-center">
      <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        “{quote.quote}”
      </p>
      <p className="mt-2 text-xs tracking-wide" style={{ color: 'var(--color-bronze)' }}>— {quote.author}</p>
    </Card>
  );
}
