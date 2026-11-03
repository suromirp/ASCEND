# Forge rekent mee

Datum: 2026-11-03
Status: aangenomen

## Besluit

Forge rekent tijdens en tussen trainingen mee, op drie plekken, met één instelling "Forge rekent mee" (standaard aan, onder Rekenmodel in de groep Forge):

1. Vul je in een open werkset zelf een ander gewicht in, dan zet Forge in het vak Herh. het aantal herhalingen dat je bij dat gewicht waarschijnlijk haalt.
2. Vink je een werkset af met meer of minder herhalingen dan in het vak stond, of met een andere RIR dan gevraagd, dan stelt Forge de eerstvolgende open werkset bij naar wat hij nu verwacht.
3. Haalde je de vorige keer de bovenkant van het bereik met de gevraagde RIR, dan staat de kleinste stap zwaarder deze keer al klaar, zonder vraag, met een korte regel ("2,5 kg erbij, je haalde vorige keer 11 met 2 over.") en Terugzetten in één tik.

## Eén rekenregel

Alle drie gebruiken de regel van het voorschrift zelf (`engine/strengthModel.ts`): de geschatte kracht (Epley met herhalingen plus RIR, KR-1), min de vermoeidheid per eerdere werkset (`fatiguePerSet`, niet bij gelijke werksets), en `expectedReps` voor het gewicht en de gevraagde RIR. Er is geen tweede formule. De kracht voor een set is die van het voorschrift (`WorkoutExercise.strengthKg`), of, zodra je vandaag een werkset afvinkte die anders ging dan gevraagd, de schatting uit die set (`forgeReckon.ts#strengthFor`). Zo zeggen de schatting bij een ander gewicht en de bijstelling na het afvinken altijd hetzelfde.

Een geschat aantal ligt tussen 1 en 30 en is naar beneden afgerond. Zonder geschatte kracht gebeurt er niets. Opwarmsets doen niet mee.

## Wat van jou is en wat van Forge

Herhalingen die je zelf typte (of met een tik op het voorschrift nam) worden nooit overschreven. Een rij weet per veld van wie de herhalingen zijn: `edited` blijft betekenen dat je de set aanraakte, `repsEstimated` zegt dat de herhalingen in zo'n rij toch van Forge zijn (je veranderde alleen het gewicht), en `forgeReps` onthoudt wat Forge in het vak zette, zodat na het afvinken te zien is of je iets anders deed. Alle drie leven alleen in het concept, nooit in het log. Een vak dat Forge zo invulde ziet er net zo uit als elk ander voorgesteld vak; alleen wat je zelf intypt is van jou. Een gewicht dat met "Wijzigingen doorvoeren" naar de volgende sets schuift (`carryChange`, of "Zelfde verschil" in `applyWeight`), krijgt daar ook de geschatte herhalingen, behalve in een set die je zelf aanpaste.

## Na het afvinken, en Lichter

De bijstelling raakt alleen de eerstvolgende open werkset, en niet als je die zelf aanpaste. Eerst de herhalingen bij het gewicht dat er staat. Valt dat buiten het gevraagde bereik, dan het gewicht: lichter met precies dezelfde keuze als "Lichter" (`forgeAdjust.ts#lighterPick`, het zwaarste gewicht van je sportschool waarmee je de onderkant haalt, nooit ver boven het bereik), zwaarder met de kleinste stap die binnen het bereik valt. Past er geen gewicht, dan blijft het gewicht en staan in het vak de herhalingen die Forge verwacht. Het gaat alleen de kant op van wat je deed: na een betere set nooit lichter of minder, na een mindere nooit zwaarder of meer. Een set die je afvinkte zoals hij er stond, verandert niets.

"Lichter" blijft een voorstel voor de sets daarna. Omdat beide dezelfde keuze maken, valt de set die al bijgesteld is vanzelf uit het voorstel (`stillOpen`, `c.loadKg >= now`) en spreken ze elkaar niet tegen. In het verloop van de training staat de bijstelling als "Forge rekende mee met je vorige set." (`meegerekend`, zonder stip op de knop).

Dit vult het besluit `2026-10-25-bijsturen-in-forge.md` aan. Daar staat "nooit vanzelf" voor het lichtere gewicht van alle volgende sets; dat blijft zo. Nieuw is dat de eerstvolgende set vanzelf meebeweegt, omdat de eigenaar dat vroeg en het met de instelling uit kan.

## De stap omhoog is geen planning

Een stap zwaarder na de bovenkant van het bereik is een wijziging in het voorschrift van een krachtoefening: het gewicht dat Forge voor deze set voorstelt. Dat is niet de planning van de gebruiker (welke training op welke dag, doelen, labels, rust), waarvoor elke inhoudelijke wijziging een voorstel met Akkoord is. Een voorschrift was altijd al een voorstel per set dat je in de training zelf invult of aanpast, en elke training rekende het opnieuw. Daarom geen Akkoord, wel zichtbaar en in één tik terug: de regel bij de oefening met Terugzetten zet de open sets die je niet aanraakte op het voorschrift van zonder de stap (`forgeReckon.ts#undoRaise`, de rijen komen uit hetzelfde voorschrift met de instelling uit), met de zin die daarbij hoort.

De regel staat in `strengthModel.ts#prescribe`: met de instelling aan geldt wat "Eerst herhalingen" al deed (de bovenkant met het gevraagde RIR is het teken voor de volgende stap), ook bij "Eerst gewicht". De remmen blijven: twee keer onder de verwachting, na een pauze en op vermoeide benen gaat er niets omhoog, en KR-5 remt de kracht en niet het gewicht. Bij "Gewichten van toestellen: Alleen wat je gebruikte" op een kabel of toestel blijft het zwaarste gebruikte gewicht het einde, met de zin "kies zelf het eerstvolgende gewicht op het toestel", want daar kent ASCEND het volgende gewicht niet. De instelling hoort bij `checkModelKey`, omdat hij voorstellen verandert en raak dus opnieuw telt.

## Wat de eigenaar nu ziet

Bij "Eerst gewicht" bleef het gewicht na de bovenkant van het bereik vaak staan, omdat de gladgestreken kracht een goede dag maar half meeneemt: "Zelfde gewicht als vorige keer, probeer weer 11 te halen." Op een toestel met "Alleen wat je gebruikte" stond er "Je haalde de bovenkant van het bereik met genoeg over, dus je bent klaar voor zwaarder. ... kies zelf het eerstvolgende gewicht op het toestel." Een knop die om zwaarder vraagt bestaat in Forge niet.

## Reden

De eigenaar traint zo in MacroFactor: een ander gewicht geeft meteen een verwachting voor de herhalingen, een set die beter of slechter ging stelt de volgende bij, en de bovenkant van het bereik zet de volgende keer het zwaardere gewicht klaar. Dubbele progressie is de gewone regel (KR-4 en KR-8 in `docs/onderzoek/Kracht loggen en progressie.md`).

## Alternatieven

- Een eigen schatting per set naast het model: afgewezen, dan rekenen twee regels door elkaar.
- Na afvinken alle volgende sets bijstellen: afgewezen, de eigenaar vroeg om de volgende, en de sets daarna volgen na hun eigen voorganger.
- De stap omhoog als voorstel met Akkoord: afgewezen, het is een voorschrift en geen planning (zie boven).
- De instelling als rij op de pagina Forge: die pagina zit op het plafond van twaalf rijen, daarom in het blad Rekenmodel.

## Bron

Wens van de eigenaar van 3 november 2026 (backlog, "Forge, wens van de eigenaar"), `docs/onderzoek/Kracht loggen en progressie.md` (KR-1, KR-4, KR-8), en de besluiten `2026-10-25-bijsturen-in-forge.md` en `2026-10-26-doorvoeren-en-raak-dichtbij.md`.

## Vervangt

Niets. Het vult `2026-10-25-bijsturen-in-forge.md` aan voor de eerstvolgende set.

## Terugdraaien

Zet "Forge rekent mee" uit: de vakken blijven zoals Forge ze voorstelde, niets beweegt na het afvinken, en het gewicht gaat weer pas omhoog als de geschatte kracht dat vraagt. Er is geen opgeslagen vorm veranderd: `reckon` is een optioneel veld in de Forge-instellingen, `strengthKg`, `raise`, `forgeReps` en `repsEstimated` leven alleen in het concept, en de soort `meegerekend` in het verloop wordt door een oudere versie overgeslagen.
