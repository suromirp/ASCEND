# De grens van een routezoektocht per stap, en wat er al is blijft

Datum: 2026-11-15
Status: aangenomen

## Besluit

De zoektocht naar een lus houdt zijn grens van 30 seconden, maar verdeelt die. Heuvels en paden (Overpass en de hoogtes van Open-Meteo) krijgen hoogstens 10 seconden; is de kaart dan niet binnen, dan zoekt de planner verder met wat er al bewaard lag, of zonder kaart. De aanvraag loopt door en komt in de cache, zodat Opnieuw zoeken hem dan wel heeft. De routeplanner krijgt de rest, tot een seconde voor de grens. Is de tijd op, dan antwoordt een aanroep die nog loopt als "niet op tijd" en houdt de planner de beste lus die er al is. Alleen als er geen enkele lus is, is de uitkomst de regel van de tijdgrens met de stap erbij. Een lus die niet op tijd kwam zegt in zijn rij "De routeplanner antwoordde niet op tijd."

Er komt geen instelling bij: dit is geen keuze voor de gebruiker maar hoe een vaste grens verdeeld wordt; de grens zelf blijft dezelfde.

## Reden

Backlogpunt I-8, deel 3. De eigenaar kreeg op reis een time-out, terwijl BRouter en Valhalla vanaf daar binnen een seconde antwoorden. Een zoektocht doet na elkaar Overpass (grens 12 s), de hoogtes (8 s) en tot zes aanroepen van de routeplanner (elk 12 s, met een terugval op de tweede bron en een seconde ertussen). Bij zwak bereik kan de kaart alleen al twintig seconden kosten, en dan gooide de grens van 30 s alles weg, ook een lus die al binnen was.

## Alternatieven

- De grens verhogen: je wacht langer op een scherm dat niets zegt, en bij echt geen bereik helpt het niet.
- Minder aanroepen naar de routeplanner: hoogstens drie per soort lus staat al vast, en Simpel neemt bij een helling al de lijn van Avontuurlijk zonder nieuwe aanroep. Minder maakt de lussen slechter waar het bereik wel goed is; de verdeling van de tijd raakt alleen het geval met zwak bereik.
- Een instelling voor de grens: niemand weet vooraf wat zijn bereik doet; de verdeling werkt zonder keuze.

## Bron

Eigenaar 14 november, op reis, met twee schermafdrukken; backlog I-8 deel 3. Code: `src/storage/routeProposal.ts#findRoutes` en `#searchBudget` (`TERRAIN_STEP_LIMIT_MS`, `ROUTE_FINISH_MS`), `src/engine/routePlanner.ts#failureLine`.

## Vervangt

Niets. Vult `2026-11-14-geen-stille-thuis.md` aan (de stap in de regel van de tijdgrens).

## Terugdraaien

In `findRoutes` de kaart weer zonder eigen grens afwachten en de routeplanner zonder de race met de grens aanroepen; `searchBudget` valt dan weg.
