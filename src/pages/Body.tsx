import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { BODY_VIEWS, breakableSpotName, openComplaints, openComplaintsBySpot, resolvedComplaints, spotById, type BodyView } from '../engine/bodyMap';
import { resolveFigure } from '../engine/figureSettings';
import { Card, Eyebrow, PageHeader, PrimaryButton, Segmented } from '../components/ui';
import { TextButton } from '../components/TextButton';
import { BodyFigure } from '../components/lichaam/BodyFigure';
import { OpenComplaint, ResolvedComplaint } from '../components/lichaam/Complaints';
import { ReportSheet } from '../components/lichaam/ReportSheet';
import { usePageState } from '../components/usePageState';

// Lichaam als figuur (docs/beslissingen/2026-10-24-lichaam-als-figuur.md): je tikt op een
// spier of gewricht, die licht mint op met de naam en de spier eronder, en daarna opent het
// detail met wat je doet, rekt, versterkt en meldt. Onder het figuur staan de klachten,
// open en (weggeklapt) opgelost; de oude pagina Blessures is hierin opgegaan.
export function BodyPage() {
  const { injuryNotes, settings, resolveInjury, deleteInjury } = useAppData();
  const navigate = useNavigate();
  const [view, setView] = usePageState<BodyView>('kant', 'front', (v) => v === 'front' || v === 'back');
  const [selectedId, setSelectedId] = usePageState<string | null>('plek', null, (v) => v === null || typeof v === 'string');
  const [showResolved, setShowResolved] = usePageState('opgelost', false, (v) => typeof v === 'boolean');
  const [reporting, setReporting] = useState(false);

  const { figure } = resolveFigure(settings);
  const bySpot = useMemo(() => openComplaintsBySpot(injuryNotes), [injuryNotes]);
  const flagged = useMemo(() => new Set(Object.keys(bySpot)), [bySpot]);
  const open = useMemo(() => openComplaints(injuryNotes), [injuryNotes]);
  const resolved = useMemo(() => resolvedComplaints(injuryNotes), [injuryNotes]);

  const selected = spotById(selectedId ?? undefined);
  // Een gekozen plek hoort bij de kant die je ziet.
  const shown = selected && selected.view === view ? selected : undefined;

  // De balk met de gekozen plek ligt over de onderkant van het scherm. Ligt de plek zelf
  // eronder, dan schuift de pagina een stukje op, zodat de plek zichtbaar blijft.
  const barRef = useRef<HTMLDivElement>(null);
  const shownId = shown?.id;
  useEffect(() => {
    const scroller = document.getElementById('app-scroll');
    const bar = barRef.current;
    const spot = shownId ? document.querySelector<HTMLElement>(`[data-spot="${shownId}"]`) : null;
    if (!scroller || !bar || !spot) return;
    const overlap = spot.getBoundingClientRect().bottom - (bar.getBoundingClientRect().top - 8);
    if (overlap > 0) scroller.scrollBy({ top: overlap, behavior: 'auto' });
  }, [shownId]);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Lichaam" title="Waar zit het?" line="Tik op de spier of het gewricht." fallback="/" />

      <div className="mx-auto w-full max-w-[260px]">
        <Segmented
          label="Kant van het lichaam"
          tall
          value={view}
          options={BODY_VIEWS.map((v) => ({ value: v.value, label: v.label }))}
          onChange={(v) => {
            setView(v);
            setSelectedId(null);
          }}
        />
      </div>

      <div>
        <BodyFigure view={view} figure={figure} selectedId={shown?.id} flagged={flagged} onPick={(s) => setSelectedId(s.id)} />
        {shown && (
          <div ref={barRef} className="sticky bottom-3 z-10 mt-3">
            <Card className="flex items-center gap-3 !p-3">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="break-words font-display text-xl leading-tight" style={{ color: 'var(--color-ink)' }}>{breakableSpotName(shown.name)}</p>
                <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{shown.muscle}</p>
                {flagged.has(shown.id) && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-warning)' }} />
                    Open klacht
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <PrimaryButton onClick={() => navigate(`/lichaam/${shown.id}`)}>Bekijk wat helpt</PrimaryButton>
              </div>
            </Card>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3" aria-label="Klachten">
        <Eyebrow>{open.length > 0 ? `Open klachten (${open.length})` : 'Open klachten'}</Eyebrow>
        {open.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen open klachten. Heb je last van iets, tik dan de plek aan en meld het.</p>
        )}
        {open.map((n) => (
          <OpenComplaint key={n.id} note={n} onResolve={(id) => void resolveInjury(id)} onDelete={(id) => void deleteInjury(id)} />
        ))}
        <div>
          <TextButton onClick={() => setReporting(true)}>Iets anders melden</TextButton>
        </div>
      </section>
      {reporting && <ReportSheet onClose={() => setReporting(false)} />}

      {resolved.length > 0 && (
        <section className="flex flex-col" aria-label="Opgeloste klachten">
          <TextButton tone="dim" icon="omlaag" flipped={showResolved} onClick={() => setShowResolved((o) => !o)} aria-expanded={showResolved}>
            Opgelost ({resolved.length})
          </TextButton>
          {showResolved && resolved.map((n) => <ResolvedComplaint key={n.id} note={n} onDelete={(id) => void deleteInjury(id)} />)}
        </section>
      )}

      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Algemene uitleg, geen diagnose. Twijfel je, vraag het een fysio of je huisarts.</p>
    </div>
  );
}
