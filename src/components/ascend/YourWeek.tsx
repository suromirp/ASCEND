import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../state/AppDataContext';
import { DIRECTIONS, DIRECTION_IDS, type DirectionId } from '../../data/directions';
import type { YourWeek } from '../../engine/yourWeek';
import { parseDirectionStart } from '../../engine/direction';
import { formatDateNL, mondayOfWeek, todayISO } from '../../utils/dates';
import { Card, Eyebrow, Meter, Ring } from '../ui';
import { TextButton } from '../TextButton';
import { ChoiceSheet, Sheet } from '../settings/Sheet';
import { jumpRoute } from '../settings/jump';

// "Je week" zonder doel (docs/beslissingen/2026-10-27-zonder-doel-stap-1.md): de kaart op de
// lucht van Ascend, het blad met wat er telde en het richtingblad. Alleen lezen: een richting
// kiezen bewaart hem en verandert de planning niet. Geen rekenwerk hier, het komt uit
// engine/yourWeek.ts.

// Een blad sluit eerst (200 ms) voordat de volgende pagina opent, zodat de terugknop twee lagen niet door elkaar haalt.
const AFTER_SHEET_MS = 280;

// De kaart: de ring met de minuten, de kracht en de plek in de golf. Een tik opent het blad.
export function YourWeekCard({ week, onOpen }: { week: YourWeek; onOpen: () => void }) {
  return (
    <Card className="p-0!">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-2xl p-4 text-left" aria-label="Je week bekijken">
        <Ring value={week.progress.fraction} label={week.minutesLine} size={88} stroke={8}>
          <span className="font-sans text-xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.progress.minutes}</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>min</span>
        </Ring>
        <div className="min-w-0">
          <Eyebrow>Je week</Eyebrow>
          <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.minutesLine}</p>
          <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.strengthLine}</p>
          {week.waveLine && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.waveLine}</p>}
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.remainingLine}</p>
        </div>
      </button>
    </Card>
  );
}

// Je richting: de naam, één zin en de knop naar het richtingblad.
export function YourDirectionCard({ week, onChoose }: { week: YourWeek; onChoose: () => void }) {
  return (
    <Card className="flex flex-col gap-1">
      <Eyebrow>Je richting</Eyebrow>
      <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{week.chosen ? week.label : 'Nog niet gekozen'}</p>
      <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.chosen ? week.line : week.adviceLine}</p>
      {week.chosen && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je plan volgt dit nog niet; dat komt in een volgende versie.</p>}
      <div className="-mb-3 mt-1">
        <TextButton onClick={onChoose}>{week.chosen ? 'Richting wijzigen' : 'Kies je richting'}</TextButton>
      </div>
    </Card>
  );
}

// Het blad Je week: de ring, wat er telde, wat telt mee, en de golf.
export function YourWeekSheet({ week, onClose }: { week: YourWeek; onClose: () => void }) {
  const navigate = useNavigate();
  const { templates } = useAppData();
  const names = new Map(templates.map((t) => [t.id, t.name]));
  const p = week.progress;
  return (
    <Sheet eyebrow="Je week" title="Zo staat je week ervoor" onClose={onClose}>
      {(close) => (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Ring value={p.fraction} label={week.minutesLine} size={96} stroke={9}>
            <span className="font-sans text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{p.minutes}</span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>min</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.minutesLine}</p>
            <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{week.strengthLine}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.remainingLine}</p>
          </div>
        </div>

        <section aria-label="Wat telde deze week" className="flex flex-col">
          {p.items.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen training deze week.</p>
          ) : (
            p.items.map((item) => (
              <div key={item.log.id} className="flex min-h-[52px] items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
                <span className="min-w-0">
                  <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{names.get(item.log.templateId) ?? 'Training'}</span>
                  <span className="block text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(item.log.completedDate)}</span>
                </span>
                <span className="shrink-0 text-right text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {item.kind === 'strength'
                    ? 'telt als 1 keer'
                    : `${Math.round(item.detail.duration)} min${item.detail.hard > 0 ? `, ${Math.round(item.detail.hard)} pittig` : ''}, telt ${Math.round(item.detail.counted)}`}
                </span>
              </div>
            ))
          )}
        </section>

        <div>
          <Eyebrow>Wat telt mee</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.explain} Kracht telt apart, als keer. Een volledige krachttraining is een keer.</p>
          {week.belowLine && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.belowLine}</p>}
        </div>

        {week.wave && week.bars.length > 0 && (
          <div>
            <Eyebrow>Deze golf</Eyebrow>
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{week.waveLine}</p>
            <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${week.bars.length}, minmax(0, 1fr))` }}>
              {week.bars.map((bar) => (
                <div key={bar.week} className="flex flex-col gap-1">
                  <Meter value={bar.budget > 0 ? bar.done / bar.budget : 0} label={`Week ${bar.week} van de golf`} tone={bar.current ? 'status' : 'progress'} />
                  {/* Twee regels, zodat "Week 1" en "0 van 120" op 360 px niet midden in breken. */}
                  <span className="text-xs tabular-nums" style={{ color: bar.current ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
                    Week {bar.week}
                    <br />
                    {bar.future ? `${bar.budget} min` : `${bar.done} van ${bar.budget}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <TextButton onClick={() => { close(); window.setTimeout(() => { const r = jumpRoute('doel', { jumpTo: 'weekbudget', openSheet: true }); navigate(r.to, { state: r.state }); }, AFTER_SHEET_MS); }} icon="verder">Weekbudget aanpassen</TextButton>
        </div>
      </div>
      )}
    </Sheet>
  );
}

// Het richtingblad: vier keuzes. Kiezen bewaart de richting en de maandag waarop hij begon, en
// verandert de planning niet; het blad zegt dat eerlijk.
export function DirectionSheet({ current, onClose }: { current: DirectionId | undefined; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  function pick(id: DirectionId) {
    const keep = settings.direction === id && parseDirectionStart(settings.directionStart);
    void updateSettings({ direction: id, directionStart: keep || mondayOfWeek(todayISO()) });
  }
  return (
    <ChoiceSheet<DirectionId>
      eyebrow="Je richting"
      title="Wat past nu bij jou?"
      line="Je richting bepaalt wat ASCEND telt in je week. De planning volgt in een volgende versie, tot dan verandert je plan niet."
      options={DIRECTION_IDS.map((id) => ({ value: id, label: DIRECTIONS[id].label, note: DIRECTIONS[id].effect }))}
      value={(current ?? 'none') as DirectionId}
      onPick={pick}
      onClose={onClose}
    />
  );
}
