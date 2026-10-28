import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { Card, SecondaryButton } from '../ui';
import { useAppData } from '../../state/AppDataContext';
import { currentBodyKg } from '../../engine/bodyWeight';
import { forgeEntryLine } from '../../engine/forgeEntry';
import { forgePoints } from '../../engine/forgeHistory';
import { exerciseHistories, exerciseViews, legsTiredAt } from '../../engine/strengthHistory';
import { compareMoments, resolveStrengthSettings, strengthModelKey } from '../../engine/strengthSettings';
import { todayISO } from '../../utils/dates';

// De ingang van Forge op Je stand, bovenaan het blok Kracht: de naam in Marcellus, een regel met
// jouw cijfers (engine/forgeEntry.ts) en een pijl. Staat Kracht meerekenen uit, dan blijft de kaart
// staan met "Aanzetten", zodat Forge te vinden blijft
// (docs/beslissingen/2026-10-28-forge-en-volgorde.md).
export function ForgeEntryCard() {
  const navigate = useNavigate();
  const { sessionLogs, templates, program, settings, updateSettings, injuryNotes } = useAppData();
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const strengthKey = strengthModelKey(settings.strengthModel);

  const entry = useMemo(() => {
    const s = resolveStrengthSettings(JSON.parse(strengthKey) as typeof settings.strengthModel);
    if (!s.enabled) return forgeEntryLine({ enabled: false, series: [], proposals: 0, today, weeks: 8 });
    const strengthLogs = sessionLogs.filter((l) => l.strengthData && l.strengthData.length > 0);
    const deps = { logs: sessionLogs, templates, program, bodyKg, sore: { injuries: injuryNotes, checkIns: settings.morningCheckIns ?? [] } };
    const histories = exerciseHistories(strengthLogs, templates, deps);
    const views = exerciseViews(histories, s, bodyKg, today, legsTiredAt(today, undefined, deps));
    const weeks = compareMoments(s.compareWeeks)[1];
    return forgeEntryLine({
      enabled: true,
      series: views.map((v) => forgePoints(v, s.showOneRm ? s.oneRmView : 'work_weight')),
      proposals: views.filter((v) => v.next && !v.weightMismatch).length,
      today,
      weeks,
    });
  }, [strengthKey, sessionLogs, templates, program, bodyKg, today, injuryNotes, settings.morningCheckIns]);

  if (entry.state === 'off') {
    return (
      <Card className="flex flex-col gap-3">
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Forge</p>
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{entry.line} Je krachttraining: vooruitgang per oefening en wat ASCEND de volgende keer voorstelt.</p>
        <SecondaryButton onClick={() => void updateSettings({ strengthModel: { ...settings.strengthModel, enabled: true } })}>Aanzetten</SecondaryButton>
      </Card>
    );
  }
  return (
    <Card>
      <button onClick={() => navigate('/forge')} className="flex min-h-[56px] w-full items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block font-display text-xl" style={{ color: 'var(--color-ink)' }}>Forge</span>
          <span className="mt-1 block text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{entry.line}</span>
        </span>
        <span className="shrink-0" style={{ color: 'var(--color-progress)' }}><Icon name="verder" size={18} /></span>
      </button>
    </Card>
  );
}
