# Groei van de lange loop: tot de wedstrijdpiek, en een verplaatsing die niet slechter mag zijn

Datum: 2026-10-27
Status: aangenomen

## Besluit

Dit corrigeert twee dingen uit `2026-10-26-groei-lange-loop.md`, dat zelf blijft staan.

1. De wekelijkse groei van hoogstens 10% geldt tot de piek van de wedstrijd (10 km 75 minuten, halve marathon 120, marathon 180), niet tot de piek van het programma. Zonder bekende wedstrijdpiek (onbekende afstand) blijft de piek van het programma, 120. Daarboven volgt de lange loop weer de gewone opbouw van het programma. Het doel van een week is dus het grootste van de gewone opbouw en de geleidelijke groei begrensd op de wedstrijdpiek (`engine/programLayout.ts#genericTarget`). Een 10 km als Voortop heeft daardoor niet meer vanaf half december om de week 120 minuten, veertien weken voor de wedstrijd.
2. De afwisseling op de piek geldt voor de piek die bereikt wordt: staat een week op de piek van de wedstrijd omdat de geleidelijke groei hem bepaalt, dan is de week erna ongeveer 80% van die piek, maar nooit minder dan de gewone opbouw van die week. Reikt de gewone opbouw zelf tot de 120 van het programma, dan wisselt die piek af zoals voorheen.
3. Een verplaatsing door de weekcontrole telt niet als beter als dezelfde twee zware beendagen er dichter op elkaar door komen (`engine/weekValidator.ts`, de maat `judge`). Een melding die er voor en na is, ook al blijft dezelfde twee trainingen, telt voor LEG-SPACING alleen als de dagen ertussen niet kleiner werden. Zo verhuist Benen A niet meer naar de dag van Heuvel afdaling om een volle dag leeg te maken.

## Reden

Een controle op de echte planning van de eigenaar liet zien dat de lange loop bij een 10 km al in december om de week op 120 minuten stond, anderhalf keer de wedstrijdlengte en veertien weken te vroeg. En de herstelregel na een wedstrijd (AFTER-GOAL) en DAY-FULL lieten Benen A op een dag belanden waar al Heuvel afdaling stond: de melding over dat paar bestond al, dus de nieuwe stand leek niet slechter, terwijl het paar van een dag ertussen naar dezelfde dag ging.

## Bewust niet gedaan

- Een zware beendag de dag voor een lange loop blijft toegestaan: de lange loop is rustig en vooral volume, tussen de lange loop en beenkracht geldt 24 uur (`scheduler.ts#legSpacingDays`). Dat is een eerder besluit en hier niet veranderd.
- De 110%-rem op wat je echt liep blijft de bovengrens, ook voor de eerste stappen.

## Alternatieven

- De wekelijkse groei laten doorlopen tot 120 voor elke afstand. Afgewezen: veel te vroeg voor een 10 km.
- Alleen de afwisseling bij 75 laten vervallen. Afgewezen: de eigenaar wil afwisselen op de piek die bereikt wordt.

## Terugdraaien

Zet Groei van de lange loop op Heel rustig voor de oude groei per blok van vier weken. De velden in `Program.runBuild` veranderen niet.
