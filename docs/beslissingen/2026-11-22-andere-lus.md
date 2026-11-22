# Andere lus: een knop onder de lus met vijf keuzes

Datum: 2026-11-22
Status: aangenomen

## Besluit

Onder de gekozen lus (in de Briefing en in het blad Route) staat een knop Andere lus. Die opent een klein blad met: Andersom, Een andere kant op, de richtingen Noord, Oost, Zuid en West, en Zonder heen en terug. Elke rij heeft één regel uitleg. De knop staat alleen bij een lus over paden; een lus die heen en terug over hetzelfde pad gaat heeft geen andere kant.

- **Andersom:** dezelfde punten in omgekeerde volgorde, nul aanroepen. De afstand blijft, het stijgen telt opnieuw (`engine/routeAdjust.ts#reverseProposal`): omhoog wordt omlaag. Dit is dezelfde omkering als Andere kant op onder Bijsturen; staat er een variant, dan draait die knop de variant om.
- **Een andere kant op:** een nieuwe lus. De kant van het verste punt van de vorige lus (`loopHeading`) wordt overgeslagen, 60 graden aan elke kant. De planner kiest daarbuiten de beste lus, en vult zo nodig aan met punten in die boog (`padInArc`).
- **Noord, Oost, Zuid, West:** een nieuwe lus met alleen punten binnen 90 graden rond die richting, aangevuld in diezelfde boog. Ligt er binnen een kwart van de afstand van de training (het eerste zoekbereik van de planner) niets bruikbaars, dan staat er één droge zin ("Naar het oosten liggen binnen 3 km geen paden of hellingen."), plus waar de beste lus die er wel is naartoe gaat, zodat de keuze niet lijkt gelukt.
- **Zonder heen en terug:** een nieuwe lus waarbij de kleinste herhaling wint (`repeatedShare` en `deadEnds` als harde voorkeur bij lussen die allebei binnen de marge van de afstand vallen). Lukt het niet, dan zegt de regel hoeveel procent je toch twee keer loopt. Loopt de lus die er staat al geen stuk dubbel (tot 3 procent), dan zegt de regel dat, zonder aanroep.

Elke keuze behalve Andersom is één zoektocht van de bestaande planner (`proposeAdventure` met een vorm), dus binnen `MAX_ROUTE_CALLS` en met dezelfde grens in tijd als een gewone zoektocht (`storage/routeProposal.ts#findOtherLoop`). Er gaat niets nieuws de deur uit: dezelfde routeplanner, dezelfde kaartgegevens (uit wat al bewaard lag, anders hetzelfde verzoek als anders) en dezelfde afronding van de plek. Zolang het zoekt staat er een regel met de tijdgrens; mislukt het, dan staat er de regel met Opnieuw en blijft de lus zoals hij was. Sluit je het blad Route of de Briefing, dan stopt de zoektocht meteen.

De gekozen variant is een eenmalige afwijking in het geheugen, per zoektocht. Hij wordt niet bewaard, verandert de instelling Soort lus nooit en vraagt geen migratie. Het blad noemt Simpel en Avontuurlijk niet. Er komt geen nieuwe instelling: dit is een knop, geen keuze die de app maakt.

## Reden

De eigenaar miste, met een afdruk van het routescherm, een knop om een andere lus te maken "qua richting", en zei bij het advies: "windrichting is top maar er moeten ook andere opties zijn". Een lus die je niet bevalt was alleen te veranderen met Langer, Korter of een stuk vermijden.

## Alternatieven

- Een kompas met alle acht richtingen: meer keuzes zonder dat een lus er beter van wordt; vier is genoeg bij een boog van 180 graden.
- Andersom ook bij Simpel: Simpel gaat heen en terug over hetzelfde pad, dus omkeren geeft dezelfde lus.
- Richting zonder paden: een lus van alleen aanvulpunten in die richting. Gekozen is het droge feit met de beste lus die er wel is, omdat een lus zonder pad of helling geen reden heeft om daarheen te gaan.
- De gekozen variant bewaren: een route wordt nergens bewaard, dus ook dit niet.
- Via een punt en Soort terrein kiezen: komt later (I-112), niet nu en geen lege rij ervoor.

## Bron

Afdruk en woorden van de eigenaar (22 november, I-111), advies van Pathfinder over de volgorde en de woorden van het blad, besluiten `2026-11-09-routeplanner.md`, `2026-11-11-route-verfijnen.md`, `2026-11-11-route-start.md`, `2026-11-12-route-blok.md` en `2026-11-11-plekken-en-routes.md`.

## Vervangt

Niets. Andere kant op onder Bijsturen (`2026-11-14-route-kaart-vervolg.md`) blijft.

## Terugdraaien

`OtherLoop` weghalen uit `RoutePanel.tsx` en `TrainingBriefing.tsx`; `other` en `pickOther` uit `useRouteSearch.ts`; `findOtherLoop` en `guardedRoute` kunnen blijven staan of terug in `findRoutes`. `routeOtherLoop.ts` en de parameter `shape` van `proposeAdventure` zijn dan ongebruikt.
