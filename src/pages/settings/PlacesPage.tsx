// ASCEND: Je plekken in Instellingen (ontwerp Plekken en routes, "Je plekken"; besluit
// docs/beslissingen/2026-11-12-andere-plek.md). De bewaarde plekken, Thuis bovenaan, met per plek Naam
// wijzigen en Wissen na een vraag. Wissen gaat via de bestaande opslag (storage/places.ts#removePlace;
// Thuis via storage/routeStart.ts#clearRouteStartPoint, dat ook de bewaarde heuvels rond Thuis wist).
// Elke actie heeft een grens in tijd en een zichtbare uitkomst. Niets hier verandert de planning.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkyBand } from '../../components/SkyBand';
import { Icon } from '../../components/icons';
import { Card } from '../../components/ui';
import { TextButton } from '../../components/TextButton';
import { readPlaceStore, removePlace, savePlace } from '../../storage/places';
import { clearRouteStartPoint } from '../../storage/routeStart';
import { cleanPlaceName, placesInOrder, wipeQuestion } from '../../engine/placesPage';
import { settingsPageRoute } from '../../data/settingsLayout';
import { withTimeout } from '../../utils/withTimeout';
import type { Place, SavedRoute } from '../../models/place';
import '../../components/settings/settings.css';

const LIMIT_MS = 4000;
const dim = { color: 'var(--color-ink-dim)' };
const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

type Read = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ok'; places: Place[]; routes: SavedRoute[] };

export function PlacesPage() {
  const navigate = useNavigate();
  const [read, setRead] = useState<Read>({ kind: 'loading' });
  const [open, setOpen] = useState<{ id: string; what: 'rename' | 'wipe' } | undefined>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const alive = useRef(true);

  // Leest de opslag opnieuw; wat er stond blijft staan tot het antwoord er is.
  const load = useCallback(() => {
    void withTimeout(readPlaceStore(), LIMIT_MS).then(
      (r) => alive.current && setRead(r.ok ? { kind: 'ok', places: r.places, routes: r.routes } : { kind: 'failed' }),
      () => alive.current && setRead({ kind: 'failed' }),
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  async function rename(place: Place, raw: string) {
    const name = cleanPlaceName(raw);
    if (!name) return setNote('Een plek heeft een naam nodig.');
    setBusy(true);
    // Lees de plek opnieuw: een plek die intussen gewist is, komt door een nieuwe naam niet terug.
    const now = await withTimeout(readPlaceStore(), LIMIT_MS).catch(() => undefined);
    const current = now?.ok ? now.places.find((p) => p.id === place.id) : undefined;
    if (now?.ok && !current) {
      if (!alive.current) return;
      setBusy(false);
      setOpen(undefined);
      setNote(`${place.name} staat er niet meer.`);
      return load();
    }
    const ok = await withTimeout(savePlace({ ...(current ?? place), name }), LIMIT_MS).catch(() => false);
    if (!alive.current) return;
    setBusy(false);
    setOpen(undefined);
    setNote(ok ? `De plek heet nu ${name}.` : 'De naam kon niet bewaard worden. Probeer het nog eens.');
    if (ok) load();
  }

  async function wipe(place: Place) {
    setBusy(true);
    const ok = await withTimeout(place.home ? clearRouteStartPoint() : removePlace(place.id), LIMIT_MS).catch(() => false);
    if (!alive.current) return;
    setBusy(false);
    setOpen(undefined);
    setNote(ok ? `${place.name} is gewist.` : 'Wissen lukte niet of duurt langer dan verwacht. Hieronder staat wat er nu bewaard is.');
    load();
  }

  return (
    <div className="st-page animate-page-in">
      <SkyBand variant="low" gear={false}>
        <button type="button" className="st-back" onClick={() => navigate(settingsPageRoute('vandaag'))}>
          <Icon name="terug" size={20} />
          Vandaag en meldingen
        </button>
        <h1 className="st-title">Je plekken</h1>
      </SkyBand>
      <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }}>Waar je lussen beginnen. Een plek bewaar je op de kaart van Route voorstellen met Bewaar als plek, na Andere plek of na een tik op de kaart. Je plekken staan op dit toestel en gaan mee in je back-up.</p>
      <p className="st-hint" role="status" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }}>{note}</p>
      <div className="mt-2 flex flex-col gap-3">
        {read.kind === 'loading' && <p className="text-sm" style={dim}>Je plekken worden gelezen.</p>}
        {read.kind === 'failed' && (
          <Card className="flex flex-col gap-2">
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Je plekken konden niet gelezen worden. Je lussen beginnen nu waar je bent.</p>
            <div><TextButton tone="dim" onClick={() => { setRead({ kind: 'loading' }); load(); }}>Opnieuw</TextButton></div>
          </Card>
        )}
        {read.kind === 'ok' && read.places.length === 0 && <p className="text-sm leading-snug" style={dim}>Nog geen plekken.</p>}
        {read.kind === 'ok' && placesInOrder(read.places).map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            routes={read.routes}
            open={open?.id === p.id ? open.what : undefined}
            busy={busy}
            onOpen={(what) => {
              setNote('');
              setOpen(what ? { id: p.id, what } : undefined);
            }}
            onRename={(name) => void rename(p, name)}
            onWipe={() => void wipe(p)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaceCard({ place, routes, open, busy, onOpen, onRename, onWipe }: {
  place: Place;
  routes: readonly SavedRoute[];
  open: 'rename' | 'wipe' | undefined;
  busy: boolean;
  onOpen: (what: 'rename' | 'wipe' | undefined) => void;
  onRename: (name: string) => void;
  onWipe: () => void;
}) {
  const [draft, setDraft] = useState(place.name);
  const count = routes.filter((r) => r.placeId === place.id).length;
  return (
    <Card className="flex flex-col gap-2">
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{place.name}</p>
        <p className="text-sm" style={dim}>{[place.home ? 'Thuis' : undefined, count === 0 ? 'Nog geen routes' : count === 1 ? '1 route' : `${count} routes`].filter(Boolean).join(' · ')}</p>
      </div>
      {open === 'rename' && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRename(draft);
          }}
        >
          <input
            type="text"
            aria-label={`Nieuwe naam voor ${place.name}`}
            maxLength={40}
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border bg-transparent px-2.5 py-2 text-base"
            style={fieldStyle}
          />
          <div className="flex flex-wrap gap-x-5">
            <TextButton tone="dim" type="submit" disabled={busy}>Bewaar naam</TextButton>
            <TextButton tone="dim" disabled={busy} onClick={() => onOpen(undefined)}>Annuleren</TextButton>
          </div>
        </form>
      )}
      {open === 'wipe' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{wipeQuestion(place, routes)}</p>
          <div className="flex flex-wrap gap-x-5">
            <TextButton tone="dim" disabled={busy} onClick={onWipe}>Wissen</TextButton>
            <TextButton tone="dim" disabled={busy} onClick={() => onOpen(undefined)}>Annuleren</TextButton>
          </div>
        </div>
      )}
      {open === undefined && (
        <div className="flex flex-wrap gap-x-5">
          <TextButton tone="dim" disabled={busy} onClick={() => { setDraft(place.name); onOpen('rename'); }}>Naam wijzigen</TextButton>
          <TextButton tone="dim" disabled={busy} onClick={() => onOpen('wipe')}>Wissen</TextButton>
        </div>
      )}
    </Card>
  );
}
