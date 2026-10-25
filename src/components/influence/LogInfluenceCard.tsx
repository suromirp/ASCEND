import { useEffect, useRef } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { entryForLog, markSeen, type HeartRateDeviation } from '../../engine/influence';
import type { SessionLog } from '../../models/training';
import { Card } from '../ui';
import { DeviationBlock } from './DeviationBlock';
import { InfluenceBlock } from './InfluenceBlock';
import { useKnownFacts } from './useInfluence';
import { useLooksLike } from './useInfluenceEffects';
import { looksLikeText } from '../../engine/influenceEffects';

// Bovenaan het blad van een training met een afwijkende hartslag: eerst het feit met het getal en de
// kleine grafiek, daaronder wat ASCEND al weet en de keuzes. Het blad openen zet het teken op gedempt
// (`seen`): je hebt het gezien.
export function LogInfluenceCard({ log, deviation }: { log: SessionLog; deviation: HeartRateDeviation }) {
  const { settings, saveInfluence } = useAppData();
  const entry = entryForLog(settings.influences, log.id);
  const facts = useKnownFacts({ kind: 'log', log });
  const like = useLooksLike(log.completedDate, 'paceHr');
  const likeText = like ? looksLikeText(like) : undefined;
  const marked = useRef(false);
  const alreadySeen = entry?.seen === true;
  useEffect(() => {
    if (marked.current || alreadySeen) return;
    marked.current = true;
    void saveInfluence({ date: log.completedDate, logId: log.id }, markSeen).catch(() => {
      // Het teken blijft amber; een volgende keer openen probeert het opnieuw.
      marked.current = false;
    });
  }, [alreadySeen, log.completedDate, log.id, saveInfluence]);

  return (
    <Card className="mt-4">
      <DeviationBlock deviation={deviation} />
      {likeText && (
        <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{likeText.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{likeText.line}</p>
        </div>
      )}
      <div className="my-4 border-t" style={{ borderColor: 'var(--color-card-border)' }} />
      <InfluenceBlock target={{ date: log.completedDate, logId: log.id }} entry={entry} facts={facts} mode="log" showStravaLine />
    </Card>
  );
}
