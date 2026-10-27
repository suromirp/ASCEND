// ASCEND: one calm question after an outdoor training: how were the clothes?
// A single tap, once, and never a step you must take: the screen goes on
// without it. Every tap but "Goed" moves your personal bonus half a degree for
// that sport (engine/clothingFeedback.ts). Only shown for one outdoor log and
// when "Kledingadvies bij het weer" is on, and never after a heat session.

import { useState, type CSSProperties } from 'react';
import { useAppData } from '../state/AppDataContext';
import { applyClothingFeedback, CLOTHING_FEEL_LABEL, type ClothingFeel } from '../engine/clothingFeedback';
import { showClothingAdvice } from '../engine/overviewSettings';
import { isIndoorLog, logSport } from '../engine/sports';
import { isHeatSession } from '../engine/clothing';

const FEELS: ClothingFeel[] = ['too_warm', 'good', 'too_cold'];
const THANKS: Record<ClothingFeel, string> = {
  too_warm: 'Genoteerd. Een volgende keer kleedt ASCEND je iets lichter.',
  good: 'Fijn, dan blijft het zo.',
  too_cold: 'Genoteerd. Een volgende keer kleedt ASCEND je iets warmer.',
};

export function ClothingFeedback({ logId }: { logId: string | undefined }) {
  const { sessionLogs, templates, settings, updateSettings } = useAppData();
  const [given, setGiven] = useState<ClothingFeel | undefined>();
  const log = logId ? sessionLogs.find((l) => l.id === logId) : undefined;
  if (!log || !showClothingAdvice(settings.overviews)) return null;
  if (log.type === 'strength' || log.type === 'recovery' || isIndoorLog(log)) return null;
  // After a heat session the clothes were chosen on purpose, so no question.
  const template = templates.find((t) => t.id === log.templateId);
  if (template && isHeatSession(template)) return null;
  const sport = logSport(log);
  if (!sport) return null;

  const tap = (feel: ClothingFeel) => {
    if (given) return;
    setGiven(feel);
    if (feel !== 'good') void updateSettings({ clothingAdjust: applyClothingFeedback(settings.clothingAdjust, sport, feel) });
  };

  return (
    <div className="completion-rise mt-5 text-center" style={{ '--d': '700ms' } as CSSProperties}>
      {given ? (
        <p className="text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{THANKS[given]}</p>
      ) : (
        <>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe zat je kleding?</p>
          <div className="mt-1 flex justify-center gap-2">
            {FEELS.map((feel) => (
              <button
                key={feel}
                onClick={() => tap(feel)}
                className="min-h-[44px] min-w-[88px] rounded-xl border px-4 text-xs font-medium transition-all active:scale-[0.97] active:opacity-70"
                style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
              >
                {CLOTHING_FEEL_LABEL[feel]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
