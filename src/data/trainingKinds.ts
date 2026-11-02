// ASCEND: de soorten training voor "Hoeveel per soort" (docs/visie/Sporten die meetellen.md, 2.4). De
// bouwstenen van het plan, niet de sjablonen: een sjabloon hoort bij een soort via zijn rol
// (engine/templateRoles.ts), nooit via een lijst met id's hier. Dit bestand importeert niets uit engine/.

import type { TemplateRole } from '../models/training';

export type TrainingKindId = 'strength' | 'easy' | 'long' | 'hard' | 'ruck' | 'cycling';

export interface TrainingKind {
  id: TrainingKindId;
  label: string;
  // De rol die een sjabloon van deze soort draagt; fietsen is een sport, geen rol.
  role?: TemplateRole;
  // Alleen zichtbaar met een tocht als doel (zoals SHOW_WHEN dat doet in de instellingen).
  onlyWithTrek?: boolean;
}

// De vaste volgorde, en ook de volgorde waarin een sjabloon zijn soort krijgt: een lange duurloop is ook
// rustig, maar telt als Lange duur.
export const TRAINING_KINDS: readonly TrainingKind[] = [
  { id: 'strength', label: 'Kracht', role: 'strength' },
  { id: 'long', label: 'Lange duur', role: 'long' },
  { id: 'hard', label: 'Harde training', role: 'hard_run' },
  { id: 'ruck', label: 'Rugzakwandeling', role: 'ruck', onlyWithTrek: true },
  { id: 'easy', label: 'Rustige duur', role: 'easy_pace' },
  { id: 'cycling', label: 'Fietsen' },
];

export type KindAmount = 'less' | 'more';
export type KindAmountMap = Partial<Record<TrainingKindId, KindAmount>>;

export const KIND_AMOUNT_LABEL: Record<KindAmount | 'normal', string> = { less: 'Minder', normal: 'Normaal', more: 'Meer' };

// Minder en Meer: 15 procent korter of langer, afgerond op 5 minuten (vraag 7, het advies).
export const KIND_AMOUNT_FACTOR: Record<KindAmount, number> = { less: 0.85, more: 1.15 };
