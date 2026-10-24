// ASCEND: "Je horloge instellen", onderaan Garmin koppelen. De uitleg die eerst op
// een eigen pagina (de Garmin-gids) stond: hartslagzones, borstband,
// dataschermen en hoe je de cijfers leest. Vier ingeklapte rijen, de inhoud
// komt uit data/garminGuide.ts. Wat open is blijft zo als je terugkomt
// (usePageState).

import { useEffect, useRef } from 'react';
import { GARMIN_DATA_SCREENS, GARMIN_METRICS, GARMIN_STRAP_USAGE, GARMIN_ZONE_SETUP, type GuideCard } from '../data/garminGuide';
import { DisclosureRow } from './DisclosureRow';
import { Icon } from './icons';
import { usePageState } from './usePageState';
import { Card, Eyebrow } from './ui';

const CARDS: { id: string; card: GuideCard }[] = [
  { id: 'zones', card: GARMIN_ZONE_SETUP },
  { id: 'borstband', card: GARMIN_STRAP_USAGE },
  { id: 'schermen', card: GARMIN_DATA_SCREENS },
  { id: 'cijfers', card: GARMIN_METRICS },
];

// De koppen in de gegevens staan in hoofdletters; hier zinsletters.
const sentenceCase = (heading: string) => heading.charAt(0) + heading.slice(1).toLowerCase();

const isIdList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

export function WatchSetupGuide({ scrollIntoView = false }: { scrollIntoView?: boolean }) {
  const [openIds, setOpenIds] = usePageState<string[]>('horloge-instellen', [], isIdList);
  const root = useRef<HTMLElement>(null);

  // Wie vanuit een training hierheen komt voor de uitleg, ziet meteen het kopje.
  useEffect(() => {
    if (!scrollIntoView) return;
    const timer = setTimeout(() => root.current?.scrollIntoView({ block: 'start' }), 350);
    return () => clearTimeout(timer);
  }, [scrollIntoView]);

  const toggle = (id: string) => setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <section ref={root} className="flex scroll-mt-4 flex-col gap-2" aria-label="Je horloge instellen">
      <Eyebrow>Je horloge instellen</Eyebrow>
      <Card className="flex flex-col py-1">
        {CARDS.map(({ id, card }, i) => (
          <div key={id} className={i === 0 ? '' : 'border-t'} style={{ borderColor: 'var(--color-card-border)' }}>
            <DisclosureRow title={sentenceCase(card.heading)} open={openIds.includes(id)} onToggle={() => toggle(id)}>
              <GuideBody card={card} />
            </DisclosureRow>
          </div>
        ))}
      </Card>
    </section>
  );
}

function GuideBody({ card }: { card: GuideCard }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      {card.body && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{card.body}</p>}
      {card.items && (
        <ul className="flex flex-col gap-1.5">
          {card.items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--color-ink-dim)' }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {card.note && (
        <p className="rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)', color: 'var(--color-ink-dim)' }}>
          {card.note}
        </p>
      )}
      {card.sources.length > 0 && (
        <div className="flex flex-col border-t" style={{ borderColor: 'var(--color-card-border)' }}>
          {card.sources.map((s) =>
            s.url ? (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-sm"
                style={{ color: 'var(--color-action)' }}
              >
                <span>{s.label}</span>
                <Icon name="buiten" size={14} className="shrink-0" />
              </a>
            ) : (
              <span key={s.label} className="flex min-h-[44px] items-center text-sm" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
