// De teksten onder het blad Weekbudget. Met krachttraining uit telt het budget geen kracht
// (engine/strengthTraining.ts), dus dan noemen ze ook geen kracht.

export function weekBudgetAdviceLine(
  o: { chosen: boolean; label: string; minutes: number; strength: number; guidelineMinutes: number; guidelineStrength: number },
  strengthOn: boolean,
): string {
  if (!strengthOn) {
    return o.chosen ? `Advies bij ${o.label}: ${o.minutes} min.` : `Advies: ${o.minutes} min. De richtlijn is ${o.guidelineMinutes} minuten.`;
  }
  return o.chosen
    ? `Advies bij ${o.label}: ${o.minutes} min, ${o.strength} keer kracht.`
    : `Advies: ${o.minutes} min, ${o.strength} keer kracht. De richtlijn is ${o.guidelineMinutes} minuten en ${o.guidelineStrength} keer kracht.`;
}

export function weekBudgetFollowNote(follows: boolean, strengthOn: boolean): string {
  if (!follows) return 'Het budget telt wat je deed. Zolang je geen richting koos, verandert je planning er niet van.';
  return strengthOn
    ? 'Je plan volgt je richting, dus het budget bepaalt hoe lang je duurtrainingen zijn. Het aantal krachttrainingen dat in je week staat verandert hier niet door. De teller op de kaart volgt wel je keuze.'
    : 'Je plan volgt je richting, dus het budget bepaalt hoe lang je duurtrainingen zijn. De teller op de kaart volgt wel je keuze.';
}
