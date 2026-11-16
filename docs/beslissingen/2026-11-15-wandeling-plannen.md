# Wandeling plannen zonder training

Datum: 2026-11-15
Status: aangenomen

## Besluit

Er is een blad Wandeling plannen met twee ingangen. Op Vandaag vervangt één + de tekstknop Losse training; de + (aria-label "Loggen of plannen") opent een klein keuzeblad met Training loggen en Wandeling plannen. Op de tab Ascend staat onderaan, in de kaart met Tochten en Krachtblok, de rij Wandeling plannen, zonder mint. Staat Route voorstellen uit, dan opent de + meteen Losse training en staat de rij er niet.

Het blad vraagt een afstand (chips 3, 5, 8 en 12 km en Anders, standaard de instelling Afstand van een wandeling, advies 5 km), toont ongeveer de duur, vraagt een wens voor de hoogtemeters (Geen voorkeur, Vlak, Heuvelig, Pittig of Anders) en heeft de chips Start bij en Grote wegen mijden. Eén mint knop, Stel route voor, zoekt met de bestaande regie van Route voorstellen en toont de lussen met hetzelfde paneel. De wandeling is geen training: geen geplande sessie, geen voorstel met Akkoord, geen log en niets nieuws in de opslag. Onder de route staat: "Gelopen? Log hem achteraf met de + op Vandaag: Training loggen, Wandelen."

Losse training (op Vandaag en op Week) gaat in twee stappen. Eerst de sport: Wandelen, Hardlopen, Fietsen, Kracht, Anders (`engine/adHocGroups.ts#AD_HOC_GROUP_ORDER`; een sport zonder training staat er niet). Daarna meteen het logblad (duur en gevoel) met de algemeenste training van die sport; de tekstknop Welke training precies? toont alleen de trainingen van die sport. Een log blijft een gewone SessionLog met een templateId.

De algemeenste training per sport (`AD_HOC_DEFAULT_ID`): Hardlopen de Rustige duurloop, Fietsen de Fietstocht (de enige). Wandelen heeft geen gewone wandeling; de rustigste is de Herstelwandeling (soort herstel, met de keuze Herstelwandeling), die daarom onder Wandelen valt. Kracht heeft geen algemene training (twee bovenlichaam, twee benen en Eigen gewicht, elk met eigen oefeningen in Forge): daar kies je eerst welke, net als bij Anders. Ontbreekt de vaste training in een eigen programma, dan geldt de kortste rustige van die sport.

## Reden

De eigenaar wil met zijn ouders een aantal kilometers wandelen, misschien met hoogtemeters, en de route door de app laten plannen. Zo'n wandeling is geen training en hoort niet in de planning. Een blad past in "Geen tab en geen losse pagina voor routes" uit `docs/visie/Ontwerp Route en trainingsscherm.md`: een blad is geen pagina. Losse training is loggen achteraf, Week is plannen; daar hoort een route vooraf niet. Een eigen knop op Vandaag paste niet, want je plant niet elke dag een wandeling (eigenaar, 15 november): daarom deelt hij de + met Losse training, en staat hij ook op Ascend, bij tochten. In Losse training stond Wandelen onvindbaar tussen alle hardloopsjablonen; de eigenaar koos voor eerst de sport en daarna meteen loggen.

Hoe het rekent (`engine/walkPlan.ts`): de afstand is leidend, niet een duur. Heuvelig mikt op 10 m stijgen per kilometer en Pittig op 25, nooit onder 20 m. Vlak en Geen voorkeur mikken allebei op nul; bij Vlak telt de stijging mee in de keuze van de lus (`routePlanner.ts#missScore`, 40 m per kilometer weegt als een afstand die een hele afstand mis zit), zodat Vlak echt iets doet. De duur rekent op de wandelnorm (4 km per uur, zonder pauzes): wie met anderen loopt, loopt niet op zijn eigen klimtempo. De zinnen van de planner zeggen bij zo'n wandeling "je wandeling" in plaats van "je training", en noemen geen trap of loopband.

Grote wegen mijden in het blad is dezelfde instelling als in Instellingen (zoals de keuze Kaart of Luchtfoto op de kaart). De afstand die je in het blad kiest wordt niet onthouden; alleen de instelling bepaalt waar het blad begint. Wisselen met Welke training precies? laat het concept van de eerste training staan, net als sluiten met het kruis.

## Alternatieven

- Een tweede tekstknop Wandeling plannen naast Losse training op Vandaag (de eerste versie): een vaste plek voor iets dat je zelden doet.
- Losse training als één lijst met kopjes per sport: met ruim twintig trainingen nog steeds lang; eerst de sport is twee tikken tot het loggen.
- Een algemene krachttraining als standaard: die bestaat niet, en Eigen gewicht als standaard zou een gymtraining verkeerd loggen.
- Wandelen in Losse training met een route: dat blad is voor achteraf, en een route vooraf daar is verstopt.
- Een wandeling als geplande training op Week: verandert de planning en vraagt een voorstel met Akkoord, voor iets dat geen training is.
- Een eigen ingang in de opslag (`findWalkRoutes`): `findRoutes` krijgt al een doel en geen training; een tweede ingang zou alleen doorgeven. De nieuwe ingang is `engine/walkPlan.ts#walkPlanTarget`, en `useRouteSearch` kreeg `walk` naast `template`.
- De laatst gekozen afstand stil bewaren: een keuze van de app hoort in een instelling, niet in een geheugen dat je niet ziet.

## Bron

Wens van de eigenaar via de coördinator, 15 november ("Stel ik wil met mijn ouders gaan wandelen ..."). Plek en vorm vooraf door Pathfinder; de plek (de + en Ascend) en de twee stappen van Losse training koos de eigenaar zelf (15 november, 21:58). Inbox I-62. Code: `engine/walkPlan.ts`, `engine/adHocGroups.ts`, `components/WalkPlanSheet.tsx`, `components/useRouteSearch.ts` (`walk`), `components/RoutePanel.tsx` (`startAbove`), `components/AdHocLogSheet.tsx` (`AdHocLogFlow`, `TrainingSwitch`), `components/LogOrPlan.tsx`, `pages/Ascend.tsx`, instelling `wandel-afstand` in `engine/settingsDefs/vandaag.ts`.

Een andere branch (`claude/waar-je-nu-bent`, I-61) voegt in RoutePanel en AskStart de kaart zonder route en een getikt startpunt toe. Dit werk raakt AskStart en de startlogica niet aan en gebruikt StartChips ongewijzigd, zodat beide naast elkaar kunnen landen.

## Vervangt

Niets. Vult `docs/visie/Ontwerp Route en trainingsscherm.md` aan: naast de route bij een training is er een route zonder training, in een blad.

## Terugdraaien

Zet op Vandaag de tekstknop Losse training terug in plaats van `LogOrPlan`, haal de rij uit `pages/Ascend.tsx` en het bestand `components/WalkPlanSheet.tsx` weg; `walk` in `useRouteSearch`, `plannedWalk` en `flat` op `RouteTarget` doen dan niets meer en kunnen weg, net als de instelling `wandel-afstand` (een bewaarde `walkPlanKm` wordt dan genegeerd). Losse training in twee stappen staat los daarvan: terug naar één lijst is `AdHocLogSheet` zonder de stap van de sport.
