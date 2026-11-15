# Wandeling plannen zonder training

Datum: 2026-11-15
Status: aangenomen

## Besluit

Op Vandaag staat naast Losse training een tweede tekstknop, Wandeling plannen. Die opent een blad met een afstand (chips 3, 5, 8 en 12 km en Anders, standaard de instelling Afstand van een wandeling, advies 5 km), een bijregel met ongeveer de duur, een wens voor de hoogtemeters (Geen voorkeur, Vlak, Heuvelig, Pittig of Anders), de chips Start bij en Grote wegen mijden. Eén mint knop, Stel route voor, zoekt met de bestaande regie van Route voorstellen en toont de lussen met hetzelfde paneel. De wandeling is geen training: geen geplande sessie, geen voorstel met Akkoord, geen log en niets nieuws in de opslag. Onder de route staat: "Gelopen? Log hem achteraf bij Losse training, Wandelen."

Losse training toont de sjablonen voortaan in kopjes per sport, in de vaste volgorde Wandelen, Hardlopen, Fietsen, Kracht, Overig, en binnen een kopje op naam.

## Reden

De eigenaar wil met zijn ouders een aantal kilometers wandelen, misschien met hoogtemeters, en de route door de app laten plannen. Zo'n wandeling is geen training en hoort niet in de planning; een blad op Vandaag is de kortste weg en past in "Geen tab en geen losse pagina voor routes" uit `docs/visie/Ontwerp Route en trainingsscherm.md`: een blad is geen pagina. Losse training is loggen achteraf, Week is plannen; daar hoort een route vooraf niet. In Losse training stond Wandelen onvindbaar tussen alle hardloopsjablonen.

Hoe het rekent (`engine/walkPlan.ts`): de afstand is leidend, niet een duur. Heuvelig mikt op 10 m stijgen per kilometer en Pittig op 25, nooit onder 20 m. Vlak en Geen voorkeur mikken allebei op nul; bij Vlak telt de stijging mee in de keuze van de lus (`routePlanner.ts#missScore`, 40 m per kilometer weegt als een afstand die een hele afstand mis zit), zodat Vlak echt iets doet. De duur rekent op de wandelnorm (4 km per uur, zonder pauzes): wie met anderen loopt, loopt niet op zijn eigen klimtempo. De zinnen van de planner zeggen bij zo'n wandeling "je wandeling" in plaats van "je training", en noemen geen trap of loopband.

Grote wegen mijden in het blad is dezelfde instelling als in Instellingen (zoals de keuze Kaart of Luchtfoto op de kaart). De afstand die je in het blad kiest wordt niet onthouden; alleen de instelling bepaalt waar het blad begint. Staat Route voorstellen uit, dan staat ook de knop Wandeling plannen er niet.

## Alternatieven

- Wandelen in Losse training met een route: dat blad is voor achteraf, en een route vooraf daar is verstopt.
- Een wandeling als geplande training op Week: verandert de planning en vraagt een voorstel met Akkoord, voor iets dat geen training is.
- Een eigen ingang in de opslag (`findWalkRoutes`): `findRoutes` krijgt al een doel en geen training; een tweede ingang zou alleen doorgeven. De nieuwe ingang is `engine/walkPlan.ts#walkPlanTarget`, en `useRouteSearch` kreeg `walk` naast `template`.
- De laatst gekozen afstand stil bewaren: een keuze van de app hoort in een instelling, niet in een geheugen dat je niet ziet.

## Bron

Wens van de eigenaar via de coördinator, 15 november ("Stel ik wil met mijn ouders gaan wandelen ..."). Plek en vorm vooraf door Pathfinder. Inbox I-62. Code: `engine/walkPlan.ts`, `engine/adHocGroups.ts`, `components/WalkPlanSheet.tsx`, `components/useRouteSearch.ts` (`walk`), `components/RoutePanel.tsx` (`startAbove`), `components/AdHocLogSheet.tsx`, instelling `wandel-afstand` in `engine/settingsDefs/vandaag.ts`.

Een andere branch (`claude/waar-je-nu-bent`, I-61) voegt in RoutePanel en AskStart de kaart zonder route en een getikt startpunt toe. Dit werk raakt AskStart en de startlogica niet aan en gebruikt StartChips ongewijzigd, zodat beide naast elkaar kunnen landen.

## Vervangt

Niets. Vult `docs/visie/Ontwerp Route en trainingsscherm.md` aan: naast de route bij een training is er een route zonder training, in een blad.

## Terugdraaien

Haal de knop Wandeling plannen uit `src/pages/Today.tsx` en het bestand `components/WalkPlanSheet.tsx`; `walk` in `useRouteSearch`, `plannedWalk` en `flat` op `RouteTarget` doen dan niets meer en kunnen weg, net als de instelling `wandel-afstand` (een bewaarde `walkPlanKm` wordt dan genegeerd). De kopjes in Losse training staan los daarvan.
