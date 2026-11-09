# Los van MacroFactor Workouts

Doel van de eigenaar (9 november 2026): MacroFactor Workouts overbodig maken, zodat Forge het helemaal overneemt. De voedingsapp van MacroFactor blijft: voeding is specialistisch werk (database, AI), dat advies gaf de coördinator eerder en de eigenaar houdt het zo. De coördinator houdt bij wanneer dat moment er is, en meldt het; de eigenaar beslist. Niets hiervan zet de app zelf uit.

## Waar MacroFactor nu nog iets doet

1. Gewicht: de trend uit de export ("Gewicht gebruiken" aan). Sinds 9 november komen de wegingen ook uit Health Connect (Fitdays), en ASCEND rekent zijn eigen trend (`engine/weightTrend.ts`).
2. Kracht: logs uit MacroFactor Workouts kunnen worden ingelezen ("Leidend voor kracht" staat uit; Forge is leidend).
3. Historie: oudere krachtlogs en wegingen staan in ASCEND, ingelezen uit de exports.
4. Voeding: blijft in de voedingsapp van MacroFactor, buiten dit plan. Het gewicht mag daar ook vandaan blijven komen; Health Connect is een tweede bron, geen vervanging die moet.

## Wanneer het moment er is (alle punten waar)

- Kracht: minstens 4 weken alle krachttrainingen in Forge gelogd, geen enkele log alleen in MacroFactor, en geen open punt in de backlog waarbij Forge een duidelijk slechter voorschrift gaf dan MacroFactor.
- Historie: één laatste export van MacroFactor Workouts ingelezen, zodat alle krachttrainingen van daarvoor in ASCEND staan.

## Hoe het gaat als het zover is

Een voorstel aan de eigenaar, met Akkoord: de laatste export van Workouts inlezen en het inlezen van krachtlogs uit MacroFactor verbergen in Instellingen (het gewicht uit de voedingsapp blijft) (niet de historie weghalen: logs blijven append-only). Pas daarna kan de eigenaar MacroFactor Workouts weghalen.

## Stand

- 9 november 2026: gewicht uit Health Connect werkt (19 wegingen binnen na opnieuw aanzetten); de automatische ronde en de melding zijn nog open (Inbox). Forge is leidend voor kracht. Nog niet zover.
- 9 november 2026, later: doel bijgesteld door de eigenaar: alleen MacroFactor Workouts overbodig maken, de voedingsapp blijft.
