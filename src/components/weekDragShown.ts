// Of Week de grepen toont. Dat hangt alleen aan de instelling en het jaaroverzicht, nooit aan een open
// blad: tijdens het openen en sluiten van een blad (waarbij `selected` nog even staat) zou de lijst anders
// de zes stippen kort inruilen voor een lege cirkel en dan terugspringen. Oppakken zelf staat uit zolang
// er een blad open is (`enabled` in useWeekDrag).
export function dragHandlesShown({ setting, monthView }: { setting: boolean; monthView: boolean }): boolean {
  return setting && !monthView;
}
