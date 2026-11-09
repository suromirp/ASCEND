// ASCEND: welke oefening in een krachttraining een ladder van calisthenics kan worden
// (docs/beslissingen/2026-11-09-calisthenics-planner.md). Per familie (data/exerciseFamilies.ts) de ladders die
// dezelfde beweging met je eigen gewicht trainen, in volgorde van voorkeur. Een ladder komt hoogstens één keer in een
// training: bij twee keer duwen wordt de tweede de dip. Alleen bovenlichaam: calisthenics vult bovenlichaam, romp en
// grip aan en vervangt de beendag niet (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md, Reden). Statische
// data, nergens opgeslagen.

export const LADDERS_FOR_FAMILY: Readonly<Record<string, readonly string[]>> = {
  flat_press: ['push-up', 'dip'],
  incline_press: ['push-up', 'dip'],
  close_press: ['push-up', 'dip'],
  overhead_press: ['handstand-push-up'],
  vertical_pull: ['pull-up'],
  triceps_pushdown: ['dip'],
  triceps_overhead: ['dip'],
};
