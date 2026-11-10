// ASCEND: "Je horloge instellen", onderaan Garmin koppelen. De uitleg die eerst op
// een eigen pagina (de Garmin-gids) stond: hartslagzones, borstband,
// dataschermen en hoe je de cijfers leest. Vier ingeklapte rijen, de inhoud
// komt uit data/garminGuide.ts. Wat open is blijft zo als je terugkomt
// (usePageState).

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { watchFieldsShown } from '../engine/watchFields';
import { useAppData } from '../state/AppDataContext';
import { GARMIN_METRICS, GARMIN_STRAP_USAGE, GARMIN_ZONE_SETUP, type GuideCard } from '../data/garminGuide';
import { DisclosureRow } from './DisclosureRow';
import { Icon } from './icons';
import { usePageState } from './usePageState';
import { Card, Eyebrow } from './ui';

const CARDS: { id: string; card: GuideCard }[] = [
  { id: 'zones', card: GARMIN_ZONE_SETUP },
  { id: 'borstband', card: GARMIN_STRAP_USAGE },
  { id: 'cijfers', card: GARMIN_METRICS },
];

// De rij Datavelden staat waar de ingeklapte dataschermen stonden: voor Metrics interpreteren.
const DATA_FIELDS_AT = 2;

// De koppen in de gegevens staan in hoofdletters; hier zinsletters.
const sentenceCase = (heading: string) => heading.charAt(0) + heading.slice(1).toLowerCase();

const isIdList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

export function WatchSetupGuide({ scrollIntoView = false }: { scrollIntoView?: boolean }) {
  const [openIds, setOpenIds] = usePageState<string[]>('horloge-instellen', [], isIdList);
  const root = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { settings } = useAppData();
  // De dataschermen hebben een eigen pagina; staat de instelling uit, dan is de rij weg.
  const showFields = watchFieldsShown(settings);

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
            {showFields && i === DATA_FIELDS_AT && (
              <button
                type="button"
                onClick={() => navigate('/horloge/datavelden')}
                className="flex min-h-[48px] w-full items-center justify-between border-b py-3 text-left"
                style={{ borderColor: 'var(--color-card-border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>Datavelden</span>
                <span style={{ color: 'var(--color-action)' }}><Icon name="verder" size={16} /></span>
              </button>
            )}
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
