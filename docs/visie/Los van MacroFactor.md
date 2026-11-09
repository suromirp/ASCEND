# Los van MacroFactor

Doel van de eigenaar (9 november 2026): steeds minder afhankelijk zijn van MacroFactor, en het op een gegeven moment helemaal weghalen. De coördinator houdt bij wanneer dat moment er is, en meldt het; de eigenaar beslist. Niets hiervan zet de app zelf uit.

## Waar MacroFactor nu nog iets doet

1. Gewicht: de trend uit de export ("Gewicht gebruiken" aan). Sinds 9 november komen de wegingen ook uit Health Connect (Fitdays), en ASCEND rekent zijn eigen trend (`engine/weightTrend.ts`).
2. Kracht: logs uit MacroFactor Workouts kunnen worden ingelezen ("Leidend voor kracht" staat uit; Forge is leidend).
3. Historie: oudere krachtlogs en wegingen staan in ASCEND, ingelezen uit de exports.
4. Voeding: ASCEND houdt geen voeding bij. Gebruikt de eigenaar de voedingsapp van MacroFactor, dan valt die buiten dit plan tot hij anders vraagt.

## Wanneer het moment er is (alle punten waar)

- Gewicht: minstens 3 weken lang wegingen uit Health Connect zonder gat van meer dan 3 dagen, en de eigen trend van ASCEND ligt in die tijd binnen 0,3 kg van de trend van MacroFactor.
- Kracht: minstens 4 weken alle krachttrainingen in Forge gelogd, geen enkele log alleen in MacroFactor, en geen open punt in de backlog waarbij Forge een duidelijk slechter voorschrift gaf dan MacroFactor.
- Historie: één laatste export van MacroFactor ingelezen, zodat alles van daarvoor in ASCEND staat.
- Health Connect: de automatische ronde haalt het gewicht zelf binnen (zonder uit en aan zetten), en de melding zegt hoeveel wegingen er kwamen.

## Hoe het gaat als het zover is

Een voorstel aan de eigenaar, met Akkoord: de laatste export inlezen, "Gewicht gebruiken" van MacroFactor uit, de MacroFactor-koppeling in Instellingen verbergen (niet de historie weghalen: logs blijven append-only). Pas daarna kan de eigenaar het abonnement of de app opzeggen.

## Stand

- 9 november 2026: gewicht uit Health Connect werkt (19 wegingen binnen na opnieuw aanzetten); de automatische ronde en de melding zijn nog open (Inbox). Forge is leidend voor kracht. Nog niet zover.
