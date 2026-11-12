import { useAppData } from '../state/AppDataContext';
import { Eyebrow } from '../components/ui';
import { SkyBand } from '../components/SkyBand';
import { AerobicTrendCard } from '../components/AerobicTrendCard';
import { StandSummary, type SummaryLine } from '../components/stand/StandSummary';
import { StandList } from '../components/stand/StandList';
import { useStandData } from '../components/stand/useStandData';
import { weekPositionLabel } from '../engine/weekLabel';
import { standSentence } from '../engine/standRhythm';
import { legsFact, standLayout, standSentenceShown, standWarnings, type StandLineId } from '../engine/standPage';
import { waveHeader } from '../engine/programLayout';
import { resolveCardOrder } from '../engine/cardOrder';
import { resolveProgramWeek } from '../utils/dates';

// Je stand: hoe sta je ervoor, in je benen, je belasting en je ritme, en word je beter? Drie blokken
// (docs/visie/Ontwerp Stand minimaal.md, besluit docs/beslissingen/2026-11-12-stand-minimaal.md):
// 1. drie regels op de lucht (Benen, Belasting, Ritme), elk de ingang van zijn eigen scherm onder /stand;
// 2. het ene beeld, Tempo bij zone 2;
// 3. één lijst (Je week zonder doel, Kracht, Lopen, Wat speelde er, Gewicht).
// De kaarten die hier eerst onder elkaar stonden wonen op de schermen (pages/StandScreen.tsx). Stand leest
// alleen; het ene percentage "Klaar voor je doel" staat alleen op Ascend.

export function StandingPage() {
  const { settings } = useAppData();
  const d = useStandData();
  const position = d.program ? resolveProgramWeek(d.program, d.today) : null;
  const restWeek = !!d.restWeek?.isRestWeek && !d.restWeek.skipped;

  // Zonder een enkele training staat er "nog niets", en de zin zegt wanneer het komt.
  const { empty, leg, load, rhythm } = d;
  const sentence = !standSentenceShown({ empty, restWeek })
    ? undefined
    : empty
      ? 'Na je eerste training zie je hier hoe je ervoor staat.'
      : standSentence({ legLevel: leg.level, load, rhythm, restWeek });
  const warn = standWarnings({ legsWord: leg.word, legsLevel: leg.level ?? 0, load: d.jump });
  const lineOf: Record<StandLineId, SummaryLine> = {
    benen: { id: 'benen', label: 'Benen', word: empty ? 'Fris' : leg.word, fact: empty ? 'nog niets' : legsFact(d.legNow.contributions.length, d.legNow.index), to: '/stand/benen', warn: !empty && warn.benen },
    belasting: { id: 'belasting', label: 'Belasting', word: load?.word ?? 'Nog niets', fact: load?.fact ?? 'na enkele weken', to: '/stand/belasting', warn: warn.belasting },
    ritme: { id: 'ritme', label: 'Ritme', word: rhythm.enough && rhythm.status ? { on: 'Op koers', nearly: 'Bijna', behind: 'Achter' }[rhythm.status] : 'Nog niets', fact: rhythm.enough ? rhythm.fact : 'na twee weken', to: '/stand/ritme', warn: false },
  };

  // De bewaarde volgorde (engine/cardOrder.ts) bepaalt de regels en de rijen, zonder migratie.
  const layout = standLayout(resolveCardOrder('stand', settings.cardOrder));

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      <SkyBand>
        <div>
          {position && <Eyebrow>{waveHeader(position) ?? weekPositionLabel(position)}</Eyebrow>}
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Je stand</h1>
          {sentence && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{sentence}</p>}
        </div>
        <StandSummary lines={layout.lines.map((id) => lineOf[id])} />
      </SkyBand>

      <AerobicTrendCard />

      <StandList order={layout.list} />
    </div>
  );
}
