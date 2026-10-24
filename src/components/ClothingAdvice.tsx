// ASCEND: what to wear, in at most four short lines under the weather line.
// Quiet on purpose: dim ink, no gold, no icons. Nothing at all for strength,
// for a rest day, when there is no forecast for that day, or when the switch
// "Kledingadvies bij het weer" is off (Meer, Overzichten en vragen).
// The engine (engine/clothing.ts) does all the work.

import { useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { clothingForTraining } from '../engine/clothing';
import { adjustFor } from '../engine/clothingFeedback';
import { showClothingAdvice } from '../engine/overviewSettings';
import { templateSport } from '../engine/sports';
import { useSheetClose } from '../utils/useSheetClose';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Portal } from './Portal';
import { Card, Eyebrow } from './ui';
import { TextButton } from './TextButton';

// `compact`: on the mission card only the first line shows, so the button
// "Gedaan" stays in view; the rest opens in a sheet.
export function ClothingAdvice({ template, date, minutes, className = '', compact = false }: { template: SessionTemplate; date: string; minutes?: number; className?: string; compact?: boolean }) {
  const { weather, sessionLogs, program, settings } = useAppData();
  const [open, setOpen] = useState(false);
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
  if (compact && lines.length > 1) {
    return (
      <div className={`flex flex-col text-[13px] leading-snug ${className}`} style={{ color: 'var(--color-ink-dim)' }} aria-label="Kledingadvies">
        <p>{lines[0]}</p>
        <TextButton onClick={() => setOpen(true)} className="self-start text-left" icon="verder">
          Alles over je kleding
        </TextButton>
        {open && <ClothingSheet lines={lines} onClose={() => setOpen(false)} />}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-0.5 text-[13px] leading-snug ${className}`} style={{ color: 'var(--color-ink-dim)' }} aria-label="Kledingadvies">
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

function ClothingSheet({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Kledingadvies">
          <Card className="rounded-b-none border-b-0 pb-8">
            <Eyebrow>Wat trek je aan</Eyebrow>
            <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              {lines.map((line) => <p key={line}>{line}</p>)}
            </div>
            <SettingsLinkRow page="vandaag" row="kledingadvies" />
            <button onClick={requestClose} className="mt-2 min-h-[44px] w-full text-center text-sm" style={{ color: 'var(--color-ink-dim)' }}>Sluiten</button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
