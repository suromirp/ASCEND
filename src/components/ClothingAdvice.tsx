// ASCEND: what to wear, in at most four short lines under the weather line.
// Quiet on purpose: dim ink, no gold, no icons. Nothing at all for strength,
// for a rest day, when there is no forecast for that day, or when the switch
// "Kledingadvies bij het weer" is off (Meer, Overzichten en vragen).
// The engine (engine/clothing.ts) does all the work.

import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { clothingForTraining } from '../engine/clothing';
import { adjustFor } from '../engine/clothingFeedback';
import { showClothingAdvice } from '../engine/overviewSettings';
import { templateSport } from '../engine/sports';

export function ClothingAdvice({ template, date, minutes, className = '' }: { template: SessionTemplate; date: string; minutes?: number; className?: string }) {
  const { weather, sessionLogs, program, settings } = useAppData();
  if (!showClothingAdvice(settings.overviews) || !weather.forecast) return null;
  const advice = clothingForTraining({
    forecast: weather.forecast,
    template,
    logs: sessionLogs,
    date,
    durationMinutes: minutes ?? resolveEffectiveFullDuration(template, date, program),
    adjustC: adjustFor(settings.clothingAdjust, templateSport(template)),
    now: new Date(),
  });
  if (!advice) return null;
  const lines = advice.packLine ? [...advice.lines, advice.packLine] : advice.lines;
  return (
    <div className={`flex flex-col gap-0.5 text-[13px] leading-snug ${className}`} style={{ color: 'var(--color-ink-dim)' }} aria-label="Kledingadvies">
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}
