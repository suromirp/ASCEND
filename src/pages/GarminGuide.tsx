import { useNavigate } from 'react-router-dom';
import { GARMIN_DATA_SCREENS, GARMIN_METRICS, GARMIN_STRAP_USAGE, GARMIN_ZONE_SETUP, type GuideCard } from '../data/garminGuide';
import { Card, Eyebrow } from '../components/ui';

export function GarminGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>GARMIN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zones, dataschermen en hoe je de metrics leest</p>
        </div>
      </div>

      <GuideCardView card={GARMIN_ZONE_SETUP} />
      <GuideCardView card={GARMIN_STRAP_USAGE} />
      <GuideCardView card={GARMIN_DATA_SCREENS} />
      <GuideCardView card={GARMIN_METRICS} />
    </div>
  );
}

function GuideCardView({ card }: { card: GuideCard }) {
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>{card.heading}</Eyebrow>
      {card.body && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{card.body}</p>}
      {card.items && (
        <ul className="flex flex-col gap-1.5">
          {card.items.map((item) => (
            <li key={item} className="flex gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
              <span style={{ color: 'var(--color-gold)' }}>·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {card.note && (
        <div
          className="rounded-xl border p-3 text-xs leading-relaxed"
          style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}
        >
          {card.note}
        </div>
      )}
      {card.sources.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'var(--color-card-border)' }}>
          {card.sources.map((s) =>
            s.url ? (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline underline-offset-2"
                style={{ color: 'var(--color-sky)' }}
              >
                {s.label} ↗
              </a>
            ) : (
              <span key={s.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
